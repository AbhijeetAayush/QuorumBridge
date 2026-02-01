const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deployment script following SOLID principles
 * Single Responsibility: Each deployment function handles one contract
 * Dependency Inversion: Uses abstract contract interfaces
 */

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log(`\n🚀 Deploying contracts to ${network}`);
  console.log(`📝 Deployer address: ${deployer.address}`);
  console.log(`💰 Deployer balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ETH\n`);

  const deploymentData = {
    network,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {}
  };

  try {
    if (network === "bscTestnet") {
      await deployBSCContracts(deployer, deploymentData);
    } else if (network === "sepolia") {
      await deployEthereumContracts(deployer, deploymentData);
    } else {
      console.log("⚠️  Unknown network. Deploying to local hardhat network...");
      await deployBSCContracts(deployer, deploymentData);
      await deployEthereumContracts(deployer, deploymentData);
    }

    // Save deployment data
    saveDeploymentData(network, deploymentData);
    
    console.log("\n✅ Deployment completed successfully!");
    console.log("\n📋 Summary:");
    console.log(JSON.stringify(deploymentData.contracts, null, 2));

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

/**
 * Deploy BSC contracts (Token + Bridge)
 * Follows Strategy Pattern for deployment logic
 */
async function deployBSCContracts(deployer, deploymentData) {
  console.log("🔷 Deploying BSC contracts...\n");

  // Deploy BEP20 Token
  console.log("1️⃣  Deploying BEP20Token...");
  const BEP20Token = await hre.ethers.getContractFactory("BEP20Token");
  const token = await BEP20Token.deploy(deployer.address);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log(`✅ BEP20Token deployed to: ${tokenAddress}`);

  // Deploy BSC Bridge
  console.log("\n2️⃣  Deploying BSCBridge...");
  const minLockAmount = hre.ethers.parseEther("1"); // 1 token minimum
  const maxLockAmount = hre.ethers.parseEther("100000"); // 100k tokens maximum
  
  const BSCBridge = await hre.ethers.getContractFactory("BSCBridge");
  const bridge = await BSCBridge.deploy(
    tokenAddress,
    deployer.address,
    minLockAmount,
    maxLockAmount
  );
  await bridge.waitForDeployment();
  const bridgeAddress = await bridge.getAddress();
  console.log(`✅ BSCBridge deployed to: ${bridgeAddress}`);

  deploymentData.contracts.bsc = {
    token: tokenAddress,
    bridge: bridgeAddress,
    minLockAmount: hre.ethers.formatEther(minLockAmount),
    maxLockAmount: hre.ethers.formatEther(maxLockAmount)
  };

  // Export ABIs
  await exportABI("BEP20Token", token);
  await exportABI("BSCBridge", bridge);
}

/**
 * Deploy Ethereum contracts (Wrapped Token + Bridge)
 * Follows Strategy Pattern for deployment logic
 */
async function deployEthereumContracts(deployer, deploymentData) {
  console.log("🔶 Deploying Ethereum contracts...\n");

  // For Ethereum, we need to get the BSC bridge address from deployment data
  // In production, this would come from the BSC deployment
  const tempBridgeAddress = deployer.address; // Temporary, will be updated

  // Deploy Wrapped Token
  console.log("1️⃣  Deploying WrappedToken...");
  const WrappedToken = await hre.ethers.getContractFactory("WrappedToken");
  const wrappedToken = await WrappedToken.deploy(deployer.address, tempBridgeAddress);
  await wrappedToken.waitForDeployment();
  const wrappedTokenAddress = await wrappedToken.getAddress();
  console.log(`✅ WrappedToken deployed to: ${wrappedTokenAddress}`);

  // Deploy Ethereum Bridge
  console.log("\n2️⃣  Deploying EthereumBridge...");
  const minBurnAmount = hre.ethers.parseEther("1"); // 1 token minimum
  const maxBurnAmount = hre.ethers.parseEther("100000"); // 100k tokens maximum
  
  const EthereumBridge = await hre.ethers.getContractFactory("EthereumBridge");
  const bridge = await EthereumBridge.deploy(
    wrappedTokenAddress,
    deployer.address,
    minBurnAmount,
    maxBurnAmount
  );
  await bridge.waitForDeployment();
  const bridgeAddress = await bridge.getAddress();
  console.log(`✅ EthereumBridge deployed to: ${bridgeAddress}`);

  // Update wrapped token bridge address
  console.log("\n3️⃣  Updating WrappedToken bridge address...");
  const tx = await wrappedToken.setBridge(bridgeAddress);
  await tx.wait();
  console.log(`✅ WrappedToken bridge address updated`);

  deploymentData.contracts.ethereum = {
    wrappedToken: wrappedTokenAddress,
    bridge: bridgeAddress,
    minBurnAmount: hre.ethers.formatEther(minBurnAmount),
    maxBurnAmount: hre.ethers.formatEther(maxBurnAmount)
  };

  // Export ABIs
  await exportABI("WrappedToken", wrappedToken);
  await exportABI("EthereumBridge", bridge);
}

/**
 * Export contract ABI for backend/frontend usage
 * Follows Single Responsibility Principle
 */
async function exportABI(contractName, contract) {
  const abiDir = path.join(__dirname, "../abis");
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }

  const artifact = await hre.artifacts.readArtifact(contractName);
  const abiPath = path.join(abiDir, `${contractName}.json`);
  
  fs.writeFileSync(
    abiPath,
    JSON.stringify({
      contractName,
      abi: artifact.abi,
      bytecode: artifact.bytecode
    }, null, 2)
  );
  
  console.log(`   📄 ABI exported to: abis/${contractName}.json`);
}

/**
 * Save deployment data to JSON file
 * Follows Single Responsibility Principle
 */
function saveDeploymentData(network, data) {
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentPath = path.join(deploymentsDir, `${network}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(data, null, 2));
  console.log(`\n💾 Deployment data saved to: deployments/${network}.json`);
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
