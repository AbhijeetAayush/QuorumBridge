# 📋 Configuration Checklist - Everything You Need

This is your complete checklist of everything you need to configure and setup to make the cross-chain bridge work.

---

## 🎯 Quick Overview

You need to configure **3 main components**:

1. **Smart Contracts** (Deploy to BSC Testnet & Ethereum Sepolia)
2. **Backend** (Deploy to AWS using SAM)
3. **Frontend** (Configure and run locally)

---

## 1️⃣ Smart Contract Configuration

### What You Need:

#### A. Testnet Tokens (for deployer wallet)
- **BSC Testnet BNB**: ~0.5 BNB (for gas)
  - Get from: https://testnet.bnbchain.org/faucet-smart
- **Ethereum Sepolia ETH**: ~0.1 ETH (for gas)
  - Get from: https://sepoliafaucet.com/

#### B. RPC URLs
Choose one option:

**Option 1: Free Public RPCs (may be slow)**
- BSC: `https://data-seed-prebsc-1-s1.bnbchain.org:8545`
- Ethereum: `https://rpc.sepolia.org`

**Option 2: Provider Services (Recommended)**
- **Alchemy**: https://www.alchemy.com/ (Sign up → Create app → Copy URL)
- **Infura**: https://infura.io/ (Sign up → Create project → Copy URL)
- **QuickNode**: https://www.quicknode.com/ (Sign up → Create endpoint)

#### C. Deployer Private Key
Your personal wallet that will deploy contracts (must have testnet tokens above)

### Configuration Steps:

1. **Create `.env` file in project root**:
```bash
cd /Users/abhijeetaayush/Desktop/Blockchain
cp .env.example .env
```

2. **Edit `.env` file**:
```env
# RPC URLs (from Step B above)
BSC_SEPOLIA_RPC_URL=https://data-seed-prebsc-1-s1.bnbchain.org:8545
ETHEREUM_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Your deployer wallet private key (from Step C)
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Optional: For contract verification on block explorers
BSCSCAN_API_KEY=your_bscscan_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

3. **Install dependencies and deploy**:
```bash
npm install
npx hardhat run scripts/deploy.js --network bscTestnet
npx hardhat run scripts/deploy.js --network sepolia
```

4. **Save the output addresses** (you'll need these for backend):
```
✅ BSC Testnet:
   BEP20Token: 0x123...
   BSCBridge: 0x456...

✅ Ethereum Sepolia:
   WrappedToken: 0x789...
   EthereumBridge: 0xabc...
```

---

## 2️⃣ Backend (AWS SAM) Configuration

### What You Need:

#### A. AWS Account & Credentials
- AWS Account (free tier is sufficient)
- AWS CLI configured:
  ```bash
  aws configure
  # Enter: Access Key ID, Secret Access Key, Region (e.g., us-east-1)
  ```

#### B. Create 3 Relayer Wallets

Run this script to generate 3 new wallets:
```javascript
// generateWallets.js
const { ethers } = require('ethers');

for (let i = 1; i <= 3; i++) {
  const wallet = ethers.Wallet.createRandom();
  console.log(`\n=== RELAYER ${i} ===`);
  console.log(`Address: ${wallet.address}`);
  console.log(`Private Key: ${wallet.privateKey}`);
}
```

```bash
npm install ethers
node generateWallets.js
```

**Save the output!**
```
RELAYER 1
Address: 0xabc...
Private Key: 0x111...

RELAYER 2
Address: 0xdef...
Private Key: 0x222...

RELAYER 3
Address: 0xghi...
Private Key: 0x333...
```

#### C. Fund Relayer Wallets

Each relayer needs testnet tokens:
- **0.1 BNB** on BSC Testnet (for unlock transactions)
- **0.05 ETH** on Ethereum Sepolia (for mint transactions)

Send from your main wallet to each relayer address above.

### Deployment Parameters:

When you run `sam deploy --guided`, provide these values:

| Parameter | Value | Where to Get It |
|-----------|-------|-----------------|
| **Stack Name** | `cross-chain-bridge-dev` | Your choice |
| **AWS Region** | `us-east-1` | Your closest region |
| **Stage** | `dev` | dev/staging/prod |
| **BSCRpcUrl** | Your BSC RPC URL | From Step 1B |
| **EthereumRpcUrl** | Your Ethereum RPC URL | From Step 1B |
| **BSCTokenAddress** | `0x123...` | From contract deployment |
| **BSCBridgeAddress** | `0x456...` | From contract deployment |
| **EthWrappedTokenAddress** | `0x789...` | From contract deployment |
| **EthBridgeAddress** | `0xabc...` | From contract deployment |
| **Relayer1PrivateKey** | `0x111...` | From Step B (Relayer 1) |
| **Relayer2PrivateKey** | `0x222...` | From Step B (Relayer 2) |
| **Relayer3PrivateKey** | `0x333...` | From Step B (Relayer 3) |

### Deployment Steps:

```bash
cd backend

# Install dependencies
npm install

# Build SAM application
sam build

# Deploy (will prompt for parameters above)
sam deploy --guided

# Enter all parameters when prompted
# Confirm: Y
# Allow IAM role creation: Y
# Save configuration: Y
```

**Save the API Endpoint** from output:
```
Outputs:
  ApiEndpoint: https://abc123.execute-api.us-east-1.amazonaws.com/dev
```

---

## 3️⃣ Frontend Configuration

### What You Need:

- API Endpoint from backend deployment (Step 2)
- Contract addresses from smart contract deployment (Step 1)

### Configuration Steps:

1. **Create frontend `.env` file**:
```bash
cd frontend
cp .env.example .env
```

2. **Edit frontend `.env`**:
```env
# API Gateway endpoint (from backend deployment output)
VITE_API_ENDPOINT=https://abc123.execute-api.us-east-1.amazonaws.com/dev

# Contract addresses (from smart contract deployment)
VITE_BSC_TOKEN_ADDRESS=0xYOUR_BSC_TOKEN_ADDRESS
VITE_BSC_BRIDGE_ADDRESS=0xYOUR_BSC_BRIDGE_ADDRESS
VITE_ETH_WRAPPED_TOKEN_ADDRESS=0xYOUR_ETH_WRAPPED_TOKEN_ADDRESS
VITE_ETH_BRIDGE_ADDRESS=0xYOUR_ETH_BRIDGE_ADDRESS

# Chain IDs (fixed values)
VITE_BSC_CHAIN_ID=97
VITE_ETH_CHAIN_ID=11155111
```

3. **Install and run**:
```bash
npm install
npm run dev
```

Frontend will be available at: http://localhost:5173

---

## ✅ Complete Configuration Summary

### File 1: `/Users/abhijeetaayush/Desktop/Blockchain/.env`
```env
BSC_SEPOLIA_RPC_URL=<YOUR_BSC_RPC>
ETHEREUM_SEPOLIA_RPC_URL=<YOUR_ETH_RPC>
DEPLOYER_PRIVATE_KEY=<YOUR_DEPLOYER_KEY>
BSCSCAN_API_KEY=<OPTIONAL>
ETHERSCAN_API_KEY=<OPTIONAL>
```

### File 2: `/Users/abhijeetaayush/Desktop/Blockchain/frontend/.env`
```env
VITE_API_ENDPOINT=<FROM_SAM_DEPLOY>
VITE_BSC_TOKEN_ADDRESS=<FROM_CONTRACT_DEPLOY>
VITE_BSC_BRIDGE_ADDRESS=<FROM_CONTRACT_DEPLOY>
VITE_ETH_WRAPPED_TOKEN_ADDRESS=<FROM_CONTRACT_DEPLOY>
VITE_ETH_BRIDGE_ADDRESS=<FROM_CONTRACT_DEPLOY>
VITE_BSC_CHAIN_ID=97
VITE_ETH_CHAIN_ID=11155111
```

### SAM Deploy Parameters (provided interactively):
- Stack Name: `cross-chain-bridge-dev`
- Region: `us-east-1`
- Stage: `dev`
- BSC RPC URL
- Ethereum RPC URL
- 4 Contract Addresses
- 3 Relayer Private Keys

---

## 🔍 Verification Checklist

After configuration, verify each step:

### ✅ Smart Contracts
```bash
# Check BSC contract
npx hardhat verify --network bscTestnet <BSC_TOKEN_ADDRESS>

# Check Ethereum contract  
npx hardhat verify --network sepolia <ETH_WRAPPED_TOKEN_ADDRESS>
```

### ✅ Backend
```bash
# Test API health
curl https://YOUR_API_ENDPOINT/health

# Should return: {"status":"healthy"}
```

### ✅ Frontend
```bash
# Visit http://localhost:5173
# Should see "Connect Wallet" button
# MetaMask should popup when clicked
```

---

## 🎯 Where to Get Each Item

### RPC URLs
1. **Alchemy** (Recommended)
   - Go to: https://dashboard.alchemy.com/
   - Sign Up → Create App → Select Sepolia → Copy HTTPS URL
   
2. **Public RPCs** (Backup)
   - BSC: `https://data-seed-prebsc-1-s1.bnbchain.org:8545`
   - Sepolia: `https://rpc.sepolia.org`

### Testnet Tokens
1. **BSC Testnet BNB**
   - https://testnet.bnbchain.org/faucet-smart
   - Connect wallet → Request → Wait 1-2 mins
   
2. **Sepolia ETH**
   - https://sepoliafaucet.com/
   - Enter address → Complete captcha → Wait

### Private Keys
- **Deployer Key**: Export from MetaMask
  - MetaMask → Account Details → Export Private Key
  
- **Relayer Keys**: Generate new (script provided above)
  - NEVER use your personal wallet for relayers!

### Contract Addresses
- Automatically generated during deployment
- Saved in `deployments/` folder
- Also printed to console during deployment

---

## 🚀 Deployment Order

**IMPORTANT**: Follow this exact order:

1. ✅ **Deploy Smart Contracts** (Step 1)
   - Get contract addresses
   
2. ✅ **Deploy Backend** (Step 2)
   - Use contract addresses from Step 1
   - Get API endpoint
   
3. ✅ **Configure Frontend** (Step 3)
   - Use contract addresses from Step 1
   - Use API endpoint from Step 2

---

## 🔐 Security Notes

### DO:
- ✅ Use different wallets for deployer and relayers
- ✅ Keep private keys in `.env` files
- ✅ Add `.env` to `.gitignore`
- ✅ Use environment variables for all secrets
- ✅ Fund relayers with just enough tokens

### DON'T:
- ❌ Commit `.env` files to git
- ❌ Share private keys publicly
- ❌ Use mainnet keys on testnet
- ❌ Use personal wallet as relayer
- ❌ Store keys in code

---

## 💡 Quick Tips

1. **Start with small amounts** for testing
2. **Check each component** before moving to next
3. **Save all addresses** in a secure note
4. **Monitor CloudWatch logs** after backend deployment
5. **Use separate wallets** for different environments

---

## 📞 Need Help?

### Common Issues:

**"Insufficient funds"**
- Get more testnet tokens from faucets

**"Invalid private key"**
- Ensure it starts with `0x` and has 64 hex characters after

**"Network error"**
- Check RPC URLs are correct and accessible

**"Contract not found"**
- Verify contract addresses are correct
- Check you're on the right network

### Useful Commands:

```bash
# Check AWS credentials
aws sts get-caller-identity

# Check SAM CLI version
sam --version

# View Lambda logs
sam logs -n EventPollerFunction --tail

# Check DynamoDB table
aws dynamodb scan --table-name dev-BridgeTable --max-items 5
```

---

## 📚 Additional Documentation

- **Detailed Setup**: `SETUP_GUIDE.md`
- **SAM Parameters**: `backend/SAM_PARAMETERS.md`
- **Architecture**: `ARCHITECTURE.md`
- **Deployment Guide**: `DEPLOYMENT.md`

---

## ✨ You're Ready!

With all items configured above, you'll have:
- ✅ Smart contracts on both testnets
- ✅ Backend running on AWS Lambda
- ✅ Frontend running locally
- ✅ 3 relayers watching for events
- ✅ Full cross-chain bridge operational!

**Estimated setup time**: 30-45 minutes
**Cost**: Free (using AWS free tier + testnets)

Good luck! 🎉
