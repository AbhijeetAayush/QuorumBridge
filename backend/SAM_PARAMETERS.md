# SAM Deployment Parameters - Quick Reference

This document lists all parameters you'll need when running `sam deploy --guided`.

---

## 🎯 Parameter Summary

When you run `sam deploy --guided`, you'll be prompted for these parameters in order:

| Parameter | Description | Example Value | Required |
|-----------|-------------|---------------|----------|
| **Stack Name** | CloudFormation stack name | `cross-chain-bridge-dev` | Yes |
| **AWS Region** | AWS region for deployment | `us-east-1` | Yes |
| **Stage** | Deployment environment | `dev` / `staging` / `prod` | Yes |
| **BSCRpcUrl** | BSC Testnet RPC endpoint | `https://data-seed-prebsc-1-s1.bnbchain.org:8545` | Yes |
| **EthereumRpcUrl** | Ethereum Sepolia RPC endpoint | `https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY` | Yes |
| **BSCTokenAddress** | BSC token contract address | `0x123...` (from deployment) | Yes |
| **BSCBridgeAddress** | BSC bridge contract address | `0x456...` (from deployment) | Yes |
| **EthWrappedTokenAddress** | Ethereum wrapped token address | `0x789...` (from deployment) | Yes |
| **EthBridgeAddress** | Ethereum bridge contract address | `0xabc...` (from deployment) | Yes |
| **Relayer1PrivateKey** | Private key for Relayer 1 | `0x1234567890abcdef...` | Yes |
| **Relayer2PrivateKey** | Private key for Relayer 2 | `0xfedcba9876543210...` | Yes |
| **Relayer3PrivateKey** | Private key for Relayer 3 | `0xabcdef1234567890...` | Yes |

---

## 📝 Parameter Details

### Stack Name
```
Stack Name []: cross-chain-bridge-dev
```
- Use different names for different environments (dev, staging, prod)
- Must be unique in your AWS account per region
- Lowercase, hyphens allowed

### AWS Region
```
AWS Region [us-east-1]: us-east-1
```
- Choose closest region to you
- Common: `us-east-1`, `us-west-2`, `eu-west-1`, `ap-southeast-1`

### Stage
```
Parameter Stage [dev]: dev
```
- **dev**: Development environment
- **staging**: Pre-production testing
- **prod**: Production environment

### BSCRpcUrl
```
Parameter BSCRpcUrl []: https://data-seed-prebsc-1-s1.bnbchain.org:8545
```

**Public RPC (Free):**
```
https://data-seed-prebsc-1-s1.bnbchain.org:8545
```

**QuickNode (Recommended):**
```
https://YOUR_ENDPOINT.bsc-testnet.quiknode.pro/YOUR_KEY/
```

**Note**: This parameter has `NoEcho: true` so it won't be visible in CloudFormation console

### EthereumRpcUrl
```
Parameter EthereumRpcUrl []: https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

**Public RPC (Free):**
```
https://rpc.sepolia.org
```

**Alchemy (Recommended):**
```
https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

**Infura:**
```
https://sepolia.infura.io/v3/YOUR_PROJECT_ID
```

**Note**: This parameter has `NoEcho: true`

### Contract Addresses

Get these from your smart contract deployment output:

```
Parameter BSCTokenAddress []: 0x1234567890abcdef1234567890abcdef12345678
Parameter BSCBridgeAddress []: 0xabcdefabcdefabcdefabcdefabcdefabcdefabcd
Parameter EthWrappedTokenAddress []: 0x9876543210fedcba9876543210fedcba98765432
Parameter EthBridgeAddress []: 0xfedcbafedcbafedcbafedcbafedcbafedcbafed
```

**Format**: 
- Must start with `0x`
- Followed by 40 hexadecimal characters
- Example: `0x1234567890123456789012345678901234567890`

### Relayer Private Keys

**IMPORTANT**: These are sensitive values!

```
Parameter Relayer1PrivateKey []: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
Parameter Relayer2PrivateKey []: 0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321
Parameter Relayer3PrivateKey []: 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

**Format**:
- Must start with `0x`
- Followed by 64 hexadecimal characters (256 bits)
- Example: `0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`

**Generate New Wallets**:
```javascript
const { ethers } = require('ethers');
for (let i = 1; i <= 3; i++) {
  const wallet = ethers.Wallet.createRandom();
  console.log(`Relayer ${i}: ${wallet.privateKey}`);
}
```

**Note**: These parameters have `NoEcho: true` so they won't be visible in CloudFormation console

---

## 🚀 Deployment Commands

### First Time Deployment (Guided)
```bash
cd backend
sam build
sam deploy --guided
```

### Subsequent Deployments
```bash
sam build
sam deploy  # Uses saved config from samconfig.toml
```

### Deploy with Different Stage
```bash
sam deploy --config-env staging --guided
```

### Force Update Parameters
```bash
sam deploy --guided --no-confirm-changeset
```

---

## 📄 Example Deployment Session

Here's what a complete deployment looks like:

```bash
$ sam deploy --guided

Configuring SAM deploy
======================

	Looking for config file [samconfig.toml] :  Not found

	Setting default arguments for 'sam deploy'
	=========================================
	Stack Name [sam-app]: cross-chain-bridge-dev
	AWS Region [us-east-1]: us-east-1
	Parameter Stage [dev]: dev
	Parameter BSCRpcUrl []: https://data-seed-prebsc-1-s1.bnbchain.org:8545
	Parameter EthereumRpcUrl []: https://eth-sepolia.g.alchemy.com/v2/abc123xyz789
	Parameter BSCTokenAddress []: 0x1234567890123456789012345678901234567890
	Parameter BSCBridgeAddress []: 0xabcdefabcdefabcdefabcdefabcdefabcdefabcd
	Parameter EthWrappedTokenAddress []: 0x9876543210987654321098765432109876543210
	Parameter EthBridgeAddress []: 0xfedcbafedcbafedcbafedcbafedcbafedcbafed
	Parameter Relayer1PrivateKey []: 0x1111111111111111111111111111111111111111111111111111111111111111
	Parameter Relayer2PrivateKey []: 0x2222222222222222222222222222222222222222222222222222222222222222
	Parameter Relayer3PrivateKey []: 0x3333333333333333333333333333333333333333333333333333333333333333
	#Shows you resources changes to be deployed and require a 'Y' to initiate deploy
	Confirm changes before deploy [y/N]: y
	#SAM needs permission to be able to create roles to connect to the resources in your template
	Allow SAM CLI IAM role creation [Y/n]: Y
	#Preserves the state of previously provisioned resources when an operation fails
	Disable rollback [y/N]: N
	Save arguments to configuration file [Y/n]: Y
	SAM configuration file [samconfig.toml]: 
	SAM configuration environment [default]: dev

	Looking for resources needed for deployment:
	Creating the required resources...
	Successfully created/updated stack - aws-sam-cli-managed-default

	Managed S3 bucket: aws-sam-cli-managed-default-samclisourcebucket-xxx
	A different default S3 bucket can be set in samconfig.toml

	Deploying with following values
	===============================
	Stack name                   : cross-chain-bridge-dev
	Region                       : us-east-1
	Confirm changeset            : True
	Disable rollback             : False
	Deployment s3 bucket         : aws-sam-cli-managed-default-samclisourcebucket-xxx
	Capabilities                 : ["CAPABILITY_IAM"]
	Parameter overrides          : {"Stage": "dev", "BSCRpcUrl": "****", "EthereumRpcUrl": "****", ...}
	Signing Profiles             : {}

Initiating deployment
=====================

Uploading to cross-chain-bridge-dev/xxx.template  20000 / 20000  (100.00%)

Waiting for changeset to be created..

CloudFormation stack changeset
-------------------------------------------------------------------------------------------------
Operation                LogicalResourceId        ResourceType             Replacement
-------------------------------------------------------------------------------------------------
+ Add                    BridgeTable              AWS::DynamoDB::Table     N/A
+ Add                    EventPollerFunction      AWS::Lambda::Function    N/A
+ Add                    ValidatorFunction        AWS::Lambda::Function    N/A
+ Add                    ExecutorFunction         AWS::Lambda::Function    N/A
+ Add                    ApiFunction              AWS::Lambda::Function    N/A
+ Add                    BridgeApi                AWS::ApiGateway::RestApi N/A
...
-------------------------------------------------------------------------------------------------

Changeset created successfully. Run the following command to review changes:
sam deploy --template-file .aws-sam/build/template.yaml --stack-name cross-chain-bridge-dev --capabilities CAPABILITY_IAM

Previewing CloudFormation changeset before deployment
======================================================
Deploy this changeset? [y/N]: y

2024-02-01 10:30:00 - Waiting for stack create/update to complete

CloudFormation events from stack operations
-------------------------------------------------------------------------------------------------
ResourceStatus           ResourceType             LogicalResourceId        ResourceStatusReason
-------------------------------------------------------------------------------------------------
CREATE_IN_PROGRESS       AWS::DynamoDB::Table     BridgeTable              -
CREATE_IN_PROGRESS       AWS::Lambda::Function    EventPollerFunction      -
CREATE_COMPLETE          AWS::DynamoDB::Table     BridgeTable              -
...
CREATE_COMPLETE          AWS::CloudFormation::    cross-chain-bridge-dev   -
                         Stack
-------------------------------------------------------------------------------------------------

CloudFormation outputs from deployed stack
-------------------------------------------------------------------------------------------------
Outputs
-------------------------------------------------------------------------------------------------
Key                 ApiEndpoint
Description         API Gateway endpoint URL
Value               https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev

Key                 BridgeTableName
Description         DynamoDB Single Table Name
Value               dev-BridgeTable
-------------------------------------------------------------------------------------------------

Successfully created/updated stack - cross-chain-bridge-dev in us-east-1
```

---

## 🔍 Verifying Deployment

After deployment completes, verify everything is working:

### 1. Check Stack Status
```bash
aws cloudformation describe-stacks --stack-name cross-chain-bridge-dev
```

### 2. Test API Endpoint
```bash
# Get API endpoint from outputs
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name cross-chain-bridge-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text)

# Test health endpoint
curl $API_ENDPOINT/health
```

### 3. Check Lambda Functions
```bash
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `dev-`)].FunctionName'
```

### 4. View Lambda Logs
```bash
sam logs -n EventPollerFunction --stack-name cross-chain-bridge-dev --tail
```

### 5. Check DynamoDB Table
```bash
aws dynamodb describe-table --table-name dev-BridgeTable
```

---

## 🔄 Updating Deployment

### Update Single Parameter

If you need to change one parameter (e.g., RPC URL):

```bash
sam deploy --parameter-overrides \
  EthereumRpcUrl="https://new-rpc-url.com"
```

### Update All Parameters

Run guided deployment again:
```bash
sam deploy --guided
```

---

## 🗑️ Deleting Stack

To remove all resources:

```bash
aws cloudformation delete-stack --stack-name cross-chain-bridge-dev
```

**Warning**: This will delete:
- All Lambda functions
- DynamoDB table (and all data)
- API Gateway
- CloudWatch Logs
- EventBridge rules

---

## 📋 Checklist Before Deployment

- [ ] AWS CLI configured (`aws sts get-caller-identity`)
- [ ] SAM CLI installed (`sam --version`)
- [ ] Smart contracts deployed to both testnets
- [ ] Contract addresses copied and ready
- [ ] RPC URLs obtained (Alchemy/Infura recommended)
- [ ] 3 relayer wallets created
- [ ] Relayer private keys copied and ready
- [ ] Relayers funded with testnet tokens (0.1 BNB + 0.05 ETH each)
- [ ] `cd backend` directory
- [ ] `npm install` completed
- [ ] `sam build` successful

---

## ⚡ Quick Tips

1. **Save your parameters**: After first deployment, parameters are saved in `samconfig.toml`
2. **Multiple environments**: Use different config environments (`--config-env prod`)
3. **NoEcho parameters**: Sensitive values (RPC URLs, private keys) are hidden in console
4. **S3 bucket**: SAM automatically creates an S3 bucket for deployment artifacts
5. **Rollback**: If deployment fails, it automatically rolls back changes

---

## 🔐 Security Reminders

- ✅ Private keys are stored as Lambda environment variables (encrypted at rest)
- ✅ NoEcho prevents them from appearing in CloudFormation console
- ✅ Only Lambda functions have access to these environment variables
- ✅ Use different keys for dev/staging/prod environments
- ✅ Rotate keys periodically
- ⚠️ Never commit `samconfig.toml` if it contains sensitive data
- ⚠️ Use AWS Secrets Manager for production (more secure)

---

## 🎉 Done!

After successful deployment, you should see:
- ✅ 4 Lambda functions created
- ✅ 1 DynamoDB table created
- ✅ 1 API Gateway created
- ✅ 3 EventBridge schedules active
- ✅ CloudWatch logs collecting data

Your backend is now live! 🚀

Next step: Configure the frontend with your API endpoint.
