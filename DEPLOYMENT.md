# Quick Deployment Guide

## Prerequisites Checklist
- [ ] Node.js 20+ installed
- [ ] AWS CLI configured with credentials
- [ ] AWS SAM CLI installed (`pip install aws-sam-cli`)
- [ ] MetaMask wallet with testnet BNB and ETH
- [ ] Alchemy/Infura account for RPC URLs

## Step-by-Step Deployment

### 1. Smart Contracts (15 minutes)

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env:
# - BSC_SEPOLIA_RPC_URL
# - ETHEREUM_SEPOLIA_RPC_URL  
# - DEPLOYER_PRIVATE_KEY

# Compile contracts
npm run compile

# Deploy to BSC Testnet
npm run deploy:bsc
# ✅ Save: BSC_TOKEN_ADDRESS, BSC_BRIDGE_ADDRESS

# Deploy to Ethereum Sepolia
npm run deploy:eth
# ✅ Save: ETH_WRAPPED_TOKEN_ADDRESS, ETH_BRIDGE_ADDRESS
```

### 2. AWS Secrets (5 minutes)

Generate 3 test wallets or use existing ones:

```bash
# Create secrets for relayer private keys
aws secretsmanager create-secret \
    --name Relayer1PrivateKey \
    --secret-string '{"privateKey":"0x..."}'

aws secretsmanager create-secret \
    --name Relayer2PrivateKey \
    --secret-string '{"privateKey":"0x..."}'

aws secretsmanager create-secret \
    --name Relayer3PrivateKey \
    --secret-string '{"privateKey":"0x..."}'
```

**Fund these wallets with small amounts of testnet BNB and ETH for gas**

### 3. Backend (20 minutes)

```bash
cd backend

# Install dependencies
npm install

# Build SAM application
sam build

# Deploy to AWS (guided first time)
sam deploy --guided

# During guided deployment, provide:
# Stack Name: cross-chain-bridge-dev
# AWS Region: us-east-1 (or your preferred)
# Parameters:
#   - Stage: dev
#   - BSCRpcUrl: https://bsc-testnet.public.blastapi.io
#   - EthereumRpcUrl: https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
#   - BSCTokenAddress: <from step 1>
#   - BSCBridgeAddress: <from step 1>
#   - EthWrappedTokenAddress: <from step 1>
#   - EthBridgeAddress: <from step 1>

# ✅ Save API Gateway URL from output
```

### 4. Frontend (10 minutes)

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env:
# - VITE_API_GATEWAY_URL=<from step 3>
# - VITE_BSC_TOKEN_ADDRESS=<from step 1>
# - VITE_BSC_BRIDGE_ADDRESS=<from step 1>
# - VITE_ETH_WRAPPED_TOKEN_ADDRESS=<from step 1>
# - VITE_ETH_BRIDGE_ADDRESS=<from step 1>

# Test locally
npm run dev
# Open http://localhost:3000

# Build for production
npm run build

# Deploy to Vercel (easiest)
vercel --prod
# Or deploy to Netlify, AWS Amplify, etc.
```

## Verification Checklist

### Smart Contracts
- [ ] Token deployed on BSC with 1M supply
- [ ] Wrapped token deployed on Ethereum
- [ ] Bridges deployed and configured
- [ ] Contract addresses saved

### Backend
- [ ] SAM stack deployed successfully
- [ ] DynamoDB table created
- [ ] Lambda functions deployed
- [ ] EventBridge rules active (check AWS Console)
- [ ] Secrets Manager contains 3 private keys
- [ ] API Gateway endpoint accessible

### Frontend
- [ ] MetaMask connects successfully
- [ ] Shows correct balances
- [ ] Can switch between networks
- [ ] Transaction status tracking works

## Testing the System

### Test Transaction: BSC → Ethereum

1. **Connect wallet** to BSC Testnet
2. **Check balance** - should show tokens on BSC
3. **Bridge 10 tokens** to Ethereum
   - Enter amount: 10
   - Click "Bridge Tokens"
   - Approve in MetaMask
   - Wait for transaction confirmation
4. **Copy Event ID** from transaction
5. **Monitor status** - paste Event ID in status tracker
   - Watch for 2-of-3 signatures (~30-60 seconds)
   - See execution complete (~1-2 minutes total)
6. **Verify** - switch to Ethereum Sepolia
   - Balance should show +10 wCCBT

### Test Transaction: Ethereum → BSC

1. **Connect wallet** to Ethereum Sepolia
2. **Bridge back** 10 tokens to BSC
3. **Monitor** and verify as above

## Troubleshooting

### "Transaction failed"
```bash
# Check gas balances
# BSC: Need BNB for gas
# Ethereum: Need ETH for gas

# Check relayer balances
aws secretsmanager get-secret-value --secret-id Relayer1PrivateKey
# Ensure relayer wallets have gas on both chains
```

### "Consensus not reached"
```bash
# Check Lambda function logs
aws logs tail /aws/lambda/dev-EventPoller --follow

# Check EventBridge rules are enabled
aws events list-rules --name-prefix dev-EventPoller

# Verify DynamoDB table
aws dynamodb scan --table-name dev-BridgeTable --limit 5
```

### "Frontend can't connect"
```bash
# Verify API Gateway URL
curl https://YOUR-API-GATEWAY-URL/dev/health

# Check CORS settings in SAM template
# Ensure frontend URL is allowed
```

## Cost Monitoring

```bash
# Check AWS costs
aws ce get-cost-and-usage \
    --time-period Start=2024-01-01,End=2024-01-31 \
    --granularity MONTHLY \
    --metrics UnblendedCost \
    --filter file://filter.json

# Expected: ~$12/month
```

## Cleanup (When Done)

```bash
# Delete SAM stack
sam delete --stack-name cross-chain-bridge-dev

# Delete secrets
aws secretsmanager delete-secret --secret-id Relayer1PrivateKey --force-delete-without-recovery
aws secretsmanager delete-secret --secret-id Relayer2PrivateKey --force-delete-without-recovery
aws secretsmanager delete-secret --secret-id Relayer3PrivateKey --force-delete-without-recovery

# Note: Smart contracts on testnet cannot be deleted
```

## Support

For issues:
1. Check CloudWatch logs
2. Verify environment variables
3. Test API endpoints manually
4. Review contract transactions on block explorers

---

**Total Deployment Time: ~50 minutes**
**Monthly AWS Cost: ~$12**
**Transaction Time: ~1-2 minutes for cross-chain**
