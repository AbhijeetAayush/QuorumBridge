# Post-Deployment Configuration

## AWS Secrets Manager Setup

After deploying contracts, create AWS Secrets Manager entries for relayer private keys.

### Generate Test Wallets (if needed)

```javascript
// generate-wallets.js
const { ethers } = require('ethers');

for (let i = 1; i <= 3; i++) {
  const wallet = ethers.Wallet.createRandom();
  console.log(`\nRelayer ${i}:`);
  console.log(`Address: ${wallet.address}`);
  console.log(`Private Key: ${wallet.privateKey}`);
}
```

Run: `node generate-wallets.js`

### Create Secrets

```bash
#!/bin/bash
# create-secrets.sh

# Replace with your actual private keys
RELAYER1_KEY="0x..."
RELAYER2_KEY="0x..."
RELAYER3_KEY="0x..."

aws secretsmanager create-secret \
    --name Relayer1PrivateKey \
    --description "Relayer 1 private key for cross-chain bridge" \
    --secret-string "{\"privateKey\":\"$RELAYER1_KEY\"}" \
    --region us-east-1

aws secretsmanager create-secret \
    --name Relayer2PrivateKey \
    --description "Relayer 2 private key for cross-chain bridge" \
    --secret-string "{\"privateKey\":\"$RELAYER2_KEY\"}" \
    --region us-east-1

aws secretsmanager create-secret \
    --name Relayer3PrivateKey \
    --description "Relayer 3 private key for cross-chain bridge" \
    --secret-string "{\"privateKey\":\"$RELAYER3_KEY\"}" \
    --region us-east-1

echo "✅ Secrets created successfully"
```

### Fund Relayer Wallets

Each relayer wallet needs gas on both chains:
- **BSC Testnet**: 0.1 BNB (get from https://testnet.bnbchain.org/faucet-smart)
- **Ethereum Sepolia**: 0.05 ETH (get from https://sepoliafaucet.com/)

```bash
# Check balances
# BSC: https://testnet.bscscan.com/address/RELAYER_ADDRESS
# Ethereum: https://sepolia.etherscan.io/address/RELAYER_ADDRESS
```

## Update Environment Files

### Backend (.env)

After deploying contracts, update `backend/.env`:

```bash
# Contract addresses from deployment
BSC_TOKEN_ADDRESS=0x...
BSC_BRIDGE_ADDRESS=0x...
ETH_WRAPPED_TOKEN_ADDRESS=0x...
ETH_BRIDGE_ADDRESS=0x...

# RPC URLs
BSC_SEPOLIA_RPC_URL=https://bsc-testnet.public.blastapi.io
ETHEREUM_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# DynamoDB
DYNAMODB_TABLE_NAME=dev-BridgeTable

# AWS
AWS_REGION=us-east-1
STAGE=dev
```

### Frontend (.env)

After SAM deployment, update `frontend/.env`:

```bash
# API Gateway URL from SAM output
VITE_API_GATEWAY_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/dev

# Contract addresses
VITE_BSC_TOKEN_ADDRESS=0x...
VITE_BSC_BRIDGE_ADDRESS=0x...
VITE_ETH_WRAPPED_TOKEN_ADDRESS=0x...
VITE_ETH_BRIDGE_ADDRESS=0x...
```

## Verify Deployment

### Check Smart Contracts

```bash
# Verify BSC token
npx hardhat verify --network bscTestnet <TOKEN_ADDRESS> <OWNER_ADDRESS>

# Verify BSC bridge
npx hardhat verify --network bscTestnet <BRIDGE_ADDRESS> \
    <TOKEN_ADDRESS> <OWNER_ADDRESS> <MIN_AMOUNT> <MAX_AMOUNT>

# Verify Ethereum contracts similarly
npx hardhat verify --network sepolia <WRAPPED_TOKEN_ADDRESS> \
    <OWNER_ADDRESS> <BRIDGE_ADDRESS>
```

### Check Lambda Functions

```bash
# List functions
aws lambda list-functions --query 'Functions[?contains(FunctionName, `EventPoller`)].FunctionName'

# Test EventPoller
aws lambda invoke \
    --function-name dev-EventPoller \
    --payload '{"relayerId":"1"}' \
    response.json
cat response.json

# Check logs
aws logs tail /aws/lambda/dev-EventPoller --follow
```

### Check DynamoDB Table

```bash
# Describe table
aws dynamodb describe-table --table-name dev-BridgeTable

# Check if EventBridge rules are active
aws events list-rules --name-prefix dev-EventPoller

# Check API Gateway
curl https://YOUR-API-GATEWAY-URL/dev/health
```

## Grant Permissions

### Make Bridge Contract Owner

The deployed bridge contracts need to be able to call unlock/mint functions. The Lambda Executor function (using Relayer 1) should be the owner.

```javascript
// Set bridge owner to Relayer 1 address
// This is already done in deployment, but verify:

// BSC Bridge
await bscBridge.owner(); // Should return Relayer 1 address

// Ethereum Bridge  
await ethBridge.owner(); // Should return Relayer 1 address

// Wrapped Token - bridge should be authorized
await wrappedToken.bridge(); // Should return Ethereum Bridge address
```

## Initial Token Distribution

For demo purposes, distribute some tokens to test wallet:

```javascript
// On BSC Testnet
const token = await ethers.getContractAt("BEP20Token", TOKEN_ADDRESS);
await token.transfer(TEST_WALLET_ADDRESS, ethers.parseEther("1000"));
```

## Monitor System Health

```bash
# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
    --dashboard-name CrossChainBridge \
    --dashboard-body file://dashboard.json

# Set up alarms
aws cloudwatch put-metric-alarm \
    --alarm-name EventPollerErrors \
    --alarm-description "Alert on EventPoller errors" \
    --metric-name Errors \
    --namespace AWS/Lambda \
    --statistic Sum \
    --period 300 \
    --threshold 10 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 1
```

## Testing the Complete Flow

### Test Script

```javascript
// test-bridge.js
const { ethers } = require('ethers');

async function testBridge() {
  // 1. Connect to BSC
  const bscProvider = new ethers.JsonRpcProvider(process.env.BSC_RPC);
  const wallet = new ethers.Wallet(process.env.TEST_PRIVATE_KEY, bscProvider);
  
  // 2. Get contracts
  const token = new ethers.Contract(BSC_TOKEN_ADDRESS, TOKEN_ABI, wallet);
  const bridge = new ethers.Contract(BSC_BRIDGE_ADDRESS, BRIDGE_ABI, wallet);
  
  // 3. Check balance
  const balance = await token.balanceOf(wallet.address);
  console.log('Balance:', ethers.formatEther(balance));
  
  // 4. Approve
  const amount = ethers.parseEther('10');
  await token.approve(BSC_BRIDGE_ADDRESS, amount);
  console.log('✅ Approved');
  
  // 5. Lock tokens
  const tx = await bridge.lockTokens(amount);
  const receipt = await tx.wait();
  console.log('✅ Locked:', receipt.hash);
  
  // 6. Get eventId
  const event = receipt.logs.find(log => /* find TokensLocked event */);
  const eventId = event.args.eventId;
  console.log('Event ID:', eventId);
  
  // 7. Poll API for status
  while (true) {
    const response = await fetch(`${API_URL}/status?eventId=${eventId}`);
    const data = await response.json();
    
    console.log('Status:', data.event.status);
    console.log('Signatures:', data.signatureCount);
    
    if (data.execution?.status === 'COMPLETED') {
      console.log('✅ Bridge complete!');
      break;
    }
    
    await new Promise(r => setTimeout(r, 5000));
  }
}

testBridge().catch(console.error);
```

## Cleanup Script

```bash
#!/bin/bash
# cleanup.sh - Run this to remove all resources

# Delete SAM stack
sam delete --stack-name cross-chain-bridge-dev --no-prompts

# Delete secrets
aws secretsmanager delete-secret --secret-id Relayer1PrivateKey --force-delete-without-recovery
aws secretsmanager delete-secret --secret-id Relayer2PrivateKey --force-delete-without-recovery
aws secretsmanager delete-secret --secret-id Relayer3PrivateKey --force-delete-without-recovery

# Delete CloudWatch log groups
aws logs delete-log-group --log-group-name /aws/lambda/dev-EventPoller
aws logs delete-log-group --log-group-name /aws/lambda/dev-Validator
aws logs delete-log-group --log-group-name /aws/lambda/dev-Executor
aws logs delete-log-group --log-group-name /aws/lambda/dev-BridgeAPI

echo "✅ Cleanup complete"
echo "Note: Testnet smart contracts cannot be deleted"
```

## Common Issues & Solutions

### Issue: Lambda timeout
**Solution**: Increase timeout in `template.yaml` from 300s to 600s

### Issue: Rate limiting
**Solution**: Add delays between RPC calls, use paid RPC providers

### Issue: Out of gas
**Solution**: Fund relayer wallets with more testnet tokens

### Issue: EventBridge not triggering
**Solution**: Check rules are ENABLED in AWS Console

### Issue: DynamoDB throttling
**Solution**: Enable auto-scaling or use provisioned capacity

## Next Steps

1. ✅ Deploy all components
2. ✅ Verify deployments
3. ✅ Fund wallets
4. ✅ Test end-to-end flow
5. ✅ Set up monitoring
6. ✅ Prepare demo
7. 📊 Show client

Good luck with your demo! 🚀
