/**
 * BSCBridge Contract Tests
 * Testing lock/unlock functionality and event emissions
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BSCBridge", function () {
  let token;
  let bridge;
  let owner;
  let user;
  const MIN_LOCK = ethers.parseEther("1");
  const MAX_LOCK = ethers.parseEther("100000");

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy token
    const BEP20Token = await ethers.getContractFactory("BEP20Token");
    token = await BEP20Token.deploy(owner.address);
    await token.waitForDeployment();

    // Deploy bridge
    const BSCBridge = await ethers.getContractFactory("BSCBridge");
    bridge = await BSCBridge.deploy(
      await token.getAddress(),
      owner.address,
      MIN_LOCK,
      MAX_LOCK
    );
    await bridge.waitForDeployment();

    // Transfer some tokens to user
    await token.transfer(user.address, ethers.parseEther("1000"));
  });

  describe("Deployment", function () {
    it("Should set correct parameters", async function () {
      expect(await bridge.minLockAmount()).to.equal(MIN_LOCK);
      expect(await bridge.maxLockAmount()).to.equal(MAX_LOCK);
      expect(await bridge.token()).to.equal(await token.getAddress());
    });
  });

  describe("Lock Tokens", function () {
    it("Should lock tokens successfully", async function () {
      const amount = ethers.parseEther("10");
      
      // Approve bridge
      await token.connect(user).approve(await bridge.getAddress(), amount);
      
      // Lock tokens
      await expect(bridge.connect(user).lockTokens(amount))
        .to.emit(bridge, "TokensLocked");

      // Check balances
      expect(await token.balanceOf(await bridge.getAddress())).to.equal(amount);
    });

    it("Should fail if amount below minimum", async function () {
      const amount = ethers.parseEther("0.5");
      await token.connect(user).approve(await bridge.getAddress(), amount);
      
      await expect(
        bridge.connect(user).lockTokens(amount)
      ).to.be.revertedWith("BSCBridge: amount below minimum");
    });

    it("Should fail if amount above maximum", async function () {
      const amount = ethers.parseEther("150000");
      await token.connect(user).approve(await bridge.getAddress(), amount);
      
      await expect(
        bridge.connect(user).lockTokens(amount)
      ).to.be.revertedWith("BSCBridge: amount exceeds maximum");
    });

    it("Should generate unique event IDs", async function () {
      const amount = ethers.parseEther("10");
      await token.connect(user).approve(await bridge.getAddress(), amount * 2n);
      
      // Lock twice
      const tx1 = await bridge.connect(user).lockTokens(amount);
      const receipt1 = await tx1.wait();
      
      const tx2 = await bridge.connect(user).lockTokens(amount);
      const receipt2 = await tx2.wait();
      
      // Event IDs should be different
      expect(receipt1.hash).to.not.equal(receipt2.hash);
    });
  });

  describe("Unlock Tokens", function () {
    it("Should allow owner to unlock tokens", async function () {
      const amount = ethers.parseEther("10");
      
      // First lock some tokens
      await token.connect(user).approve(await bridge.getAddress(), amount);
      const lockTx = await bridge.connect(user).lockTokens(amount);
      const lockReceipt = await lockTx.wait();
      
      // Get event ID from lock
      const event = lockReceipt.logs.find(log => {
        try {
          return bridge.interface.parseLog(log).name === "TokensLocked";
        } catch {
          return false;
        }
      });
      
      const parsedLog = bridge.interface.parseLog(event);
      const eventId = parsedLog.args.eventId;
      
      // Unlock tokens (simulate cross-chain unlock)
      await expect(
        bridge.unlockTokens(user.address, amount, eventId)
      ).to.emit(bridge, "TokensUnlocked");
    });

    it("Should prevent double unlock", async function () {
      const amount = ethers.parseEther("10");
      
      // Lock tokens
      await token.connect(user).approve(await bridge.getAddress(), amount);
      const lockTx = await bridge.connect(user).lockTokens(amount);
      const lockReceipt = await lockTx.wait();
      
      const event = lockReceipt.logs.find(log => {
        try {
          return bridge.interface.parseLog(log).name === "TokensLocked";
        } catch {
          return false;
        }
      });
      
      const parsedLog = bridge.interface.parseLog(event);
      const eventId = parsedLog.args.eventId;
      
      // First unlock
      await bridge.unlockTokens(user.address, amount, eventId);
      
      // Second unlock should fail
      await expect(
        bridge.unlockTokens(user.address, amount, eventId)
      ).to.be.revertedWith("BSCBridge: event already processed");
    });

    it("Should only allow owner to unlock", async function () {
      const amount = ethers.parseEther("10");
      const fakeEventId = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      
      await expect(
        bridge.connect(user).unlockTokens(user.address, amount, fakeEventId)
      ).to.be.reverted;
    });
  });

  describe("Pausable", function () {
    it("Should prevent locking when paused", async function () {
      await bridge.pause();
      
      const amount = ethers.parseEther("10");
      await token.connect(user).approve(await bridge.getAddress(), amount);
      
      await expect(
        bridge.connect(user).lockTokens(amount)
      ).to.be.reverted;
    });

    it("Should allow locking after unpause", async function () {
      await bridge.pause();
      await bridge.unpause();
      
      const amount = ethers.parseEther("10");
      await token.connect(user).approve(await bridge.getAddress(), amount);
      
      await expect(
        bridge.connect(user).lockTokens(amount)
      ).to.not.be.reverted;
    });
  });
});
