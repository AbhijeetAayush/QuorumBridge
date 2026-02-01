/**
 * BEP20Token Contract Tests
 * Following TDD principles and AAA pattern (Arrange, Act, Assert)
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BEP20Token", function () {
  let token;
  let owner;
  let addr1;
  let addr2;
  const TOTAL_SUPPLY = ethers.parseEther("1000000"); // 1 million tokens

  beforeEach(async function () {
    // Arrange: Get signers
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy token contract
    const BEP20Token = await ethers.getContractFactory("BEP20Token");
    token = await BEP20Token.deploy(owner.address);
    await token.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await token.name()).to.equal("Cross-Chain Bridge Token");
      expect(await token.symbol()).to.equal("CCBT");
    });

    it("Should mint total supply to owner", async function () {
      const ownerBalance = await token.balanceOf(owner.address);
      expect(ownerBalance).to.equal(TOTAL_SUPPLY);
    });

    it("Should have correct decimals", async function () {
      expect(await token.decimals()).to.equal(18);
    });

    it("Should emit TokensDeployed event", async function () {
      // Deploy new instance to test event
      const BEP20Token = await ethers.getContractFactory("BEP20Token");
      await expect(BEP20Token.deploy(owner.address))
        .to.emit(BEP20Token, "TokensDeployed")
        .withArgs(owner.address, TOTAL_SUPPLY);
    });
  });

  describe("Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      // Act: Transfer tokens
      await token.transfer(addr1.address, ethers.parseEther("100"));
      
      // Assert: Check balances
      expect(await token.balanceOf(addr1.address)).to.equal(ethers.parseEther("100"));
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialOwnerBalance = await token.balanceOf(owner.address);
      
      // Act & Assert: Try to transfer more than balance
      await expect(
        token.connect(addr1).transfer(owner.address, ethers.parseEther("1"))
      ).to.be.reverted;

      // Owner balance should remain unchanged
      expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance);
    });

    it("Should update balances after transfers", async function () {
      const initialOwnerBalance = await token.balanceOf(owner.address);

      // Transfer to addr1
      await token.transfer(addr1.address, ethers.parseEther("100"));
      
      // Transfer from addr1 to addr2
      await token.connect(addr1).transfer(addr2.address, ethers.parseEther("50"));

      // Check final balances
      expect(await token.balanceOf(owner.address)).to.equal(
        initialOwnerBalance - ethers.parseEther("100")
      );
      expect(await token.balanceOf(addr1.address)).to.equal(ethers.parseEther("50"));
      expect(await token.balanceOf(addr2.address)).to.equal(ethers.parseEther("50"));
    });
  });

  describe("Allowances", function () {
    it("Should approve tokens for delegated transfer", async function () {
      await token.approve(addr1.address, ethers.parseEther("100"));
      expect(await token.allowance(owner.address, addr1.address)).to.equal(
        ethers.parseEther("100")
      );
    });

    it("Should allow delegated transfers", async function () {
      // Approve addr1 to spend tokens
      await token.approve(addr1.address, ethers.parseEther("100"));
      
      // addr1 transfers tokens from owner to addr2
      await token.connect(addr1).transferFrom(
        owner.address,
        addr2.address,
        ethers.parseEther("50")
      );

      expect(await token.balanceOf(addr2.address)).to.equal(ethers.parseEther("50"));
      expect(await token.allowance(owner.address, addr1.address)).to.equal(
        ethers.parseEther("50")
      );
    });
  });

  describe("Pausable", function () {
    it("Should allow owner to pause", async function () {
      await token.pause();
      // Transfers should fail when paused
      await expect(
        token.transfer(addr1.address, ethers.parseEther("100"))
      ).to.be.reverted;
    });

    it("Should allow owner to unpause", async function () {
      await token.pause();
      await token.unpause();
      
      // Transfers should work after unpause
      await expect(
        token.transfer(addr1.address, ethers.parseEther("100"))
      ).to.not.be.reverted;
    });

    it("Should not allow non-owner to pause", async function () {
      await expect(
        token.connect(addr1).pause()
      ).to.be.reverted;
    });
  });

  describe("Ownable", function () {
    it("Should set the correct owner", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Should allow ownership transfer", async function () {
      await token.transferOwnership(addr1.address);
      expect(await token.owner()).to.equal(addr1.address);
    });
  });
});
