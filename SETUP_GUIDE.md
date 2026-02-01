# 🚀 Complete Setup Guide - Cross-Chain Bridge

This guide will walk you through **everything** you need to configure and deploy the cross-chain bridge system.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Get Test Tokens](#step-1-get-test-tokens)
3. [Step 2: Get RPC URLs](#step-2-get-rpc-urls)
4. [Step 3: Create Relayer Wallets](#step-3-create-relayer-wallets)
5. [Step 4: Deploy Smart Contracts](#step-4-deploy-smart-contracts)
6. [Step 5: Configure AWS SAM](#step-5-configure-aws-sam)
7. [Step 6: Deploy Backend](#step-6-deploy-backend)
8. [Step 7: Configure Frontend](#step-7-configure-frontend)
9. [Step 8: Test the Bridge](#step-8-test-the-bridge)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js** v18+ and npm
- **AWS CLI** configured with credentials
- **AWS SAM CLI** installed
- **MetaMask** browser extension
- **Git**

### Install AWS SAM CLI
```bash
# macOS
brew install aws-sam-cli

# Linux
pip install aws-sam-cli

# Windows
choco install aws-sam-cli
```

### Configure AWS CLI
```bash
aws configure
# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region (e.g., us-east-1)
# - Default output format (json)
```

---

## Step 1: Get Test Tokens

You need testnet tokens for gas fees on both chains.

### BSC Testnet BNB
1. Visit: https://testnet.bnbchain.org/faucet-smart
2. Connect your MetaMask
3. Request testnet BNB (you'll get ~0.5 BNB)
4. Wait 1-2 minutes for confirmation

### Ethereum Sepolia ETH
1. Visit: https://sepoliafaucet.com/
2. Enter your wallet address
3. Complete captcha
4. Wait for ETH to arrive

**Alternative Sepolia Faucets:**
- https://www.alchemy.com/faucets/ethereum-sepolia
- https://faucet.quicknode.com/ethereum/sepolia

### Fund Your Relayer Wallets
Once you create relayer wallets (Step 3), send:
- **0.1 BNB** to each relayer on BSC Testnet
- **0.05 ETH** to each relayer on Sepolia

---

## Step 2: Get RPC URLs

### Option A: Use Public RPCs (Free, Rate-Limited)

**BSC Testnet:**
```
https://data-seed-prebsc-1-s1.bnbchain.org:8545
```

**Ethereum Sepolia:**
```
https://rpc.sepolia.org
```

### Option B: Use Provider Services (Recommended)

#### Alchemy (Recommended)
1. Go to: https://www.alchemy.com/
2. Sign up for free account
3. Create new app:
   - **Chain**: Ethereum
   - **Network**: Sepolia
4. Copy your HTTPS URL: `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`

#### Infura
1. Go to: https://infura.io/
2. Sign up for free account
3. Create new project
4. Copy your endpoint URLs

#### QuickNode
1. Go to: https://www.quicknode.com/
2. Create free account
3. Create endpoints for both chains

---

## Step 3: Create Relayer Wallets

You need **3 relayer wallets** for the multi-signature system.

### Generate Private Keys

Run this Node.js script:

```javascript
// generateWallets.js
const { ethers } = require('ethers');

for (let i = 1; i <= 3; i++) {
  const wallet = ethers.Wallet.createRandom();
  console.log(`\n=== Relayer ${i} ===`);
  console.log(`Address: ${wallet.address}`);
  console.log(`Private Key: ${wallet.privateKey}`);
}
```

Run it:
```bash
npm install ethers
node generateWallets.js
```

### Save Credentials Securely

Create a file `RELAYER_CREDENTIALS.txt` (add to .gitignore):

```
RELAYER 1
Address: 0x...
Private Key: 0x...

RELAYER 2
Address: 0x...
Private Key: 0x...

RELAYER 3
Address: 0x...
Private Key: 0x...
```

⚠️ **NEVER commit private keys to git!**

### Fund Relayers

Send testnet tokens to all 3 relayer addresses:
- **0.1 BNB** on BSC Testnet (for unlock transactions)
- **0.05 ETH** on Sepolia (for mint transactions)

---

## Step 4: Deploy Smart Contracts

### Install Dependencies

```bash
cd /Users/abhijeetaayush/Desktop/Blockchain
npm install
```

### Configure Environment

Create `.env` file in project root:

```bash
# Copy template
cp .env.example .env

# Edit .env
nano .env
```

Add your values:
```env
# RPC URLs
BSC_SEPOLIA_RPC_URL=https://data-seed-prebsc-1-s1.bnbchain.org:8545
ETHEREUM_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Deployer Private Key (your wallet that has testnet tokens)
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# Etherscan API Keys (optional, for contract verification)
BSCSCAN_API_KEY=your_bscscan_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Deploy Contracts

```bash
# Deploy to both testnets
npx hardhat run scripts/deploy.js --network bscTestnet
npx hardhat run scripts/deploy.js --network sepolia
```

### Save Deployment Addresses

The script will output addresses like:
```
✅ BSC Testnet Deployment:
   - BEP20Token: 0x123...
   - BSCBridge: 0x456...

✅ Ethereum Sepolia Deployment:
   - WrappedToken: 0x789...
   - EthereumBridge: 0xabc...
```

**Save these addresses!** You'll need them for SAM deployment.

### Verify Deployment

Check contracts on block explorers:
- BSC Testnet: https://testnet.bscscan.com/
- Sepolia: https://sepolia.etherscan.io/

---

## Step 5: Configure AWS SAM

### Prepare for Deployment

```bash
cd backend

# Install dependencies
npm install

# Build SAM application
sam build
```

---

## Step 6: Deploy Backend

### Run Guided Deployment

```bash
sam deploy --guided
```

You'll be prompted for parameters. Here's what to enter:

### SAM Deployment Parameters

```
Stack Name: cross-chain-bridge-dev
AWS Region: us-east-1
Parameter Stage: dev

Parameter BSCRpcUrl: 
https://data-seed-prebsc-1-s1.bnbchain.org:8545

Parameter EthereumRpcUrl: 
https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

Parameter BSCTokenAddress: 
0xYOUR_BSC_TOKEN_ADDRESS

Parameter BSCBridgeAddress: 
0xYOUR_BSC_BRIDGE_ADDRESS

Parameter EthWrappedTokenAddress: 
0xYOUR_ETH_WRAPPED_TOKEN_ADDRESS

Parameter EthBridgeAddress: 
0xYOUR_ETH_BRIDGE_ADDRESS

Parameter Relayer1PrivateKey: 
0xYOUR_RELAYER1_PRIVATE_KEY

Parameter Relayer2PrivateKey: 
0xYOUR_RELAYER2_PRIVATE_KEY

Parameter Relayer3PrivateKey: 
0xYOUR_RELAYER3_PRIVATE_KEY

Confirm changes before deploy: Y
Allow SAM CLI IAM role creation: Y
Disable rollback: N
Save arguments to configuration file: Y
SAM configuration file: samconfig.toml
SAM configuration environment: dev
```

### Deployment Output

After deployment completes, you'll see:

```
CloudFormation outputs:
---------------------------------------------------------
Key: ApiEndpoint
Value: https://abc123.execute-api.us-east-1.amazonaws.com/dev

Key: BridgeTableName
Value: dev-BridgeTable

Key: EventPollerFunctionArn
Value: arn:aws:lambda:us-east-1:123456789012:function:dev-EventPoller

...
```

**Save the `ApiEndpoint` URL** - you'll need it for the frontend!

### Verify Deployment

Test the API:
```bash
# Replace with your API endpoint
curl https://YOUR_API_ENDPOINT/health

# Should return:
# {"status":"healthy","timestamp":"..."}
```

---

## Step 7: Configure Frontend

### Setup Frontend

```bash
cd ../frontend

# Install dependencies
npm install
```

### Configure Environment

Create `.env` file:

```bash
cp .env.example .env
nano .env
```

Add your values:
```env
# API Gateway Endpoint (from SAM deployment output)
VITE_API_ENDPOINT=https://abc123.execute-api.us-east-1.amazonaws.com/dev

# Contract Addresses
VITE_BSC_TOKEN_ADDRESS=0xYOUR_BSC_TOKEN_ADDRESS
VITE_BSC_BRIDGE_ADDRESS=0xYOUR_BSC_BRIDGE_ADDRESS
VITE_ETH_WRAPPED_TOKEN_ADDRESS=0xYOUR_ETH_WRAPPED_TOKEN_ADDRESS
VITE_ETH_BRIDGE_ADDRESS=0xYOUR_ETH_BRIDGE_ADDRESS

# Chain IDs
VITE_BSC_CHAIN_ID=97
VITE_ETH_CHAIN_ID=11155111
```

### Run Frontend

```bash
npm run dev
```

The app will be available at: http://localhost:5173

---

## Step 8: Test the Bridge

### 1. Setup MetaMask

Add BSC Testnet to MetaMask:
- **Network Name**: BSC Testnet
- **RPC URL**: https://data-seed-prebsc-1-s1.bnbchain.org:8545
- **Chain ID**: 97
- **Currency Symbol**: BNB
- **Block Explorer**: https://testnet.bscscan.com

Sepolia should already be available in MetaMask.

### 2. Connect Wallet

1. Open http://localhost:5173
2. Click "Connect Wallet"
3. Approve MetaMask connection

### 3. Get Test Tokens

On BSC Testnet, you need to get bridge tokens:

```bash
# Using Hardhat console
npx hardhat console --network bscTestnet

# In console:
const Token = await ethers.getContractFactory("BEP20Token");
const token = await Token.attach("0xYOUR_BSC_TOKEN_ADDRESS");
const [signer] = await ethers.getSigners();

# Transfer tokens to your wallet
await token.transfer("YOUR_METAMASK_ADDRESS", ethers.parseEther("1000"));
```

### 4. Bridge from BSC to Ethereum

1. Select "BSC Testnet → Ethereum" in the UI
2. Enter amount (e.g., 100)
3. Click "Approve Token" (approve spending)
4. Wait for approval transaction
5. Click "Bridge Tokens"
6. Confirm in MetaMask
7. Wait ~1-2 minutes
8. Status will update to "Completed"
9. Check your balance on Ethereum - wrapped tokens should appear!

### 5. Bridge from Ethereum to BSC

1. Switch to Ethereum Sepolia in MetaMask
2. Select "Ethereum → BSC Testnet" in the UI
3. Enter amount
4. Click "Approve Token"
5. Click "Bridge Tokens"
6. Wait ~1-2 minutes
7. Original tokens unlocked on BSC!

---

## 🔍 Verification Checklist

### Smart Contracts
- [ ] Contracts deployed on both chains
- [ ] Contract addresses saved
- [ ] ABIs exported to `backend/src/shared/abis/`
- [ ] Deployer wallet has testnet tokens

### Backend (AWS)
- [ ] SAM deployed successfully
- [ ] DynamoDB table created
- [ ] All 4 Lambda functions deployed
- [ ] EventBridge rules active (3 schedules)
- [ ] API Gateway endpoint accessible
- [ ] CloudWatch logs showing activity

### Frontend
- [ ] Environment variables configured
- [ ] Frontend running on localhost:5173
- [ ] Wallet connection works
- [ ] Contract addresses correct

### Relayers
- [ ] 3 relayer wallets created
- [ ] All funded with testnet tokens
- [ ] Private keys added to SAM parameters

---

## 📊 Monitoring

### Check Lambda Logs

```bash
# EventPoller logs
sam logs -n EventPollerFunction --stack-name cross-chain-bridge-dev --tail

# Validator logs
sam logs -n ValidatorFunction --stack-name cross-chain-bridge-dev --tail

# Executor logs
sam logs -n ExecutorFunction --stack-name cross-chain-bridge-dev --tail
```

### Check DynamoDB

```bash
# List tables
aws dynamodb list-tables

# Scan bridge table
aws dynamodb scan --table-name dev-BridgeTable --max-items 10
```

### Check API

```bash
# Health check
curl https://YOUR_API_ENDPOINT/health

# System info
curl https://YOUR_API_ENDPOINT/system-info

# Bridge stats
curl https://YOUR_API_ENDPOINT/stats

# Event status (replace eventId)
curl https://YOUR_API_ENDPOINT/status?eventId=0x123...
```

---

## 🐛 Troubleshooting

### Contract Deployment Fails

**Error**: "insufficient funds"
- **Solution**: Add more testnet tokens to deployer wallet

**Error**: "nonce too high"
- **Solution**: Reset MetaMask account or wait a few blocks

### SAM Deployment Fails

**Error**: "Unable to upload artifact"
- **Solution**: Check AWS credentials: `aws sts get-caller-identity`

**Error**: "Parameter validation failed"
- **Solution**: Ensure all parameters are provided and private keys start with `0x`

### Lambda Function Errors

**Error**: "Private key not found"
- **Solution**: Verify environment variables in Lambda console

**Error**: "Rate limit exceeded"
- **Solution**: Use Alchemy/Infura instead of public RPCs

**Error**: "Insufficient funds"
- **Solution**: Add more testnet tokens to relayer wallets

### Frontend Issues

**Error**: "Contract call reverted"
- **Solution**: Check token approval first, ensure you have enough tokens

**Error**: "Wrong network"
- **Solution**: Switch to correct network in MetaMask

**Error**: "Transaction failed"
- **Solution**: Check gas fees, ensure wallet has native tokens

### Bridge Not Processing

1. **Check EventPoller**: Should run every 30 seconds
   ```bash
   sam logs -n EventPollerFunction --tail
   ```

2. **Check DynamoDB**: Events should appear in table
   ```bash
   aws dynamodb scan --table-name dev-BridgeTable
   ```

3. **Check Validator**: Should trigger when 2 signatures exist
   ```bash
   sam logs -n ValidatorFunction --tail
   ```

4. **Check Executor**: Should mint/unlock tokens
   ```bash
   sam logs -n ExecutorFunction --tail
   ```

### Common Fixes

**Clear Lambda cache:**
```bash
sam build --use-container
sam deploy --no-confirm-changeset
```

**Redeploy specific function:**
```bash
sam deploy --parameter-overrides Stage=dev
```

**Check EventBridge rules:**
```bash
aws events list-rules --name-prefix cross-chain-bridge
```

---

## 💰 Cost Estimates

### AWS Monthly Costs (Estimated)

- **DynamoDB**: ~$0.50 (PAY_PER_REQUEST)
- **Lambda**: ~$2-5 (based on executions)
- **API Gateway**: ~$0.50
- **CloudWatch Logs**: ~$0.50
- **Total**: ~$4-7/month

### Testnet Costs

- **Free** - Only testnet tokens needed

---

## 🔐 Security Notes

1. **Never commit private keys** to git
2. **Use environment variables** for all secrets
3. **Rotate relayer keys** periodically in production
4. **Monitor CloudWatch** for suspicious activity
5. **Set up billing alerts** in AWS
6. **Enable MFA** on AWS account

---

## 📚 Additional Resources

### Documentation
- [AWS SAM Developer Guide](https://docs.aws.amazon.com/serverless-application-model/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org/)

### Block Explorers
- [BSC Testnet](https://testnet.bscscan.com/)
- [Ethereum Sepolia](https://sepolia.etherscan.io/)

### Testnet Faucets
- [BSC Faucet](https://testnet.bnbchain.org/faucet-smart)
- [Sepolia Faucet](https://sepoliafaucet.com/)

---

## ✅ Next Steps

After successful deployment:

1. **Test thoroughly** with small amounts first
2. **Monitor logs** for the first few bridges
3. **Set up CloudWatch alarms** for errors
4. **Document any issues** and resolutions
5. **Consider adding more relayers** for production

---

## 🎉 Success!

If you've completed all steps, your cross-chain bridge is now live!

You should be able to:
- ✅ Lock tokens on BSC and mint on Ethereum
- ✅ Burn tokens on Ethereum and unlock on BSC
- ✅ Track transaction status in real-time
- ✅ View bridge statistics via API

Happy bridging! 🌉
