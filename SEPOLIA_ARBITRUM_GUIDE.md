# 🚀 Cross-Chain Bridge: Sepolia ↔ Arbitrum Setup Guide

Your project has been configured to bridge between **Ethereum Sepolia** and **Arbitrum Sepolia** testnets!

---

## 📋 Quick Reference

| Chain | Network | Chain ID | RPC Endpoint |
|-------|---------|----------|--------------|
| **Ethereum Sepolia** | Sepolia Testnet | 11155111 | https://rpc.sepolia.org |
| **Arbitrum Sepolia** | Arbitrum Testnet | 421614 | https://sepolia-rollup.arbitrum.io/rpc |

---

## 🎯 Step 1: Get Testnet Tokens (5 minutes)

### Get Ethereum Sepolia ETH

**Visit:** https://sepoliafaucet.com/

1. Paste your wallet address: `0xA2fBc9114217BcOF36e19B38eB1b6eCE11F3a8E8`
2. Complete the captcha
3. Click "Send Me ETH"
4. Wait 1-2 minutes
5. Check MetaMask - you should have ~0.5 ETH on Sepolia

### Get Arbitrum Sepolia ETH

**Visit:** https://faucets.chain.link/arbitrum-sepolia

1. Connect your MetaMask wallet
2. Select "Arbitrum Sepolia" network
3. Request tokens
4. Wait 1-2 minutes
5. Check MetaMask - you should have ~0.1 ETH on Arbitrum Sepolia

---

## ✅ Step 2: Create `.env` File

```bash
cd /Users/abhijeetaayush/Desktop/Blockchain
cp .env.example .env
nano .env
```

**Add your deployer private key:**

```env
# Your MetaMask private key (has testnet ETH)
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# Optional: For contract verification (can leave empty for now)
ETHERSCAN_API_KEY=
ARBISCAN_API_KEY=
```

**RPC URLs are already configured with defaults, so no need to change them!**

---

## 🚀 Step 3: Deploy Smart Contracts

### Deploy to Ethereum Sepolia

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

**Expected output:**
```
Deploying to Ethereum Sepolia...
✅ Ethereum Sepolia Deployment:
   - BEP20Token: 0x123...
   - BSCBridge (now SepoliaBridge): 0x456...
```

**Save these addresses!**

### Deploy to Arbitrum Sepolia

```bash
npx hardhat run scripts/deploy.js --network arbitrumSepolia
```

**Expected output:**
```
Deploying to Arbitrum Sepolia...
✅ Arbitrum Sepolia Deployment:
   - WrappedToken: 0x789...
   - EthereumBridge (now ArbitrumBridge): 0xabc...
```

**Save these addresses too!**

---

## 📝 Step 4: Update Configuration Files

### Backend Configuration (SAM)

When deploying backend with `sam deploy --guided`, use these parameters:

| Parameter | Value |
|-----------|-------|
| **Stack Name** | `cross-chain-bridge-dev` |
| **AWS Region** | `us-east-1` |
| **Stage** | `dev` |
| **EthereumSepoliaRpcUrl** | `https://rpc.sepolia.org` |
| **ArbitrumSepoliaRpcUrl** | `https://sepolia-rollup.arbitrum.io/rpc` |
| **EthereumSepoliaTokenAddress** | From Sepolia deployment |
| **EthereumSepoliaBridgeAddress** | From Sepolia deployment |
| **ArbitrumSepoliaWrappedTokenAddress** | From Arbitrum deployment |
| **ArbitrumSepoliaBridgeAddress** | From Arbitrum deployment |
| **Relayer1PrivateKey** | Your relayer 1 key |
| **Relayer2PrivateKey** | Your relayer 2 key |
| **Relayer3PrivateKey** | Your relayer 3 key |

### Frontend Configuration

Create `frontend/.env`:

```env
VITE_API_ENDPOINT=https://YOUR_API_ENDPOINT.amazonaws.com/dev

# Ethereum Sepolia
VITE_ETH_SEPOLIA_TOKEN_ADDRESS=0xYOUR_ETH_TOKEN
VITE_ETH_SEPOLIA_BRIDGE_ADDRESS=0xYOUR_ETH_BRIDGE

# Arbitrum Sepolia
VITE_ARB_SEPOLIA_WRAPPED_TOKEN_ADDRESS=0xYOUR_ARB_WRAPPED_TOKEN
VITE_ARB_SEPOLIA_BRIDGE_ADDRESS=0xYOUR_ARB_BRIDGE

# Chain IDs
VITE_ETH_SEPOLIA_CHAIN_ID=11155111
VITE_ARB_SEPOLIA_CHAIN_ID=421614
```

---

## 🔗 Add Networks to MetaMask

### Ethereum Sepolia

Usually already available. If not:
- **Network Name:** Ethereum Sepolia
- **RPC URL:** https://rpc.sepolia.org
- **Chain ID:** 11155111
- **Currency:** ETH
- **Explorer:** https://sepolia.etherscan.io

### Arbitrum Sepolia

1. Open MetaMask
2. Network dropdown → "Add Network"
3. Fill in:
   - **Network Name:** Arbitrum Sepolia
   - **RPC URL:** https://sepolia-rollup.arbitrum.io/rpc
   - **Chain ID:** 421614
   - **Currency Symbol:** ETH
   - **Block Explorer:** https://sepolia.arbiscan.io

---

## 📊 Architecture Changes

Your bridge now works like this:

```
User (MetaMask)
    │
    ├─ Sepolia Token & Bridge
    │  - Lock tokens on Sepolia
    │  - Wrapped tokens minted on Arbitrum
    │
    └─ Arbitrum Wrapped Token & Bridge
       - Burn wrapped tokens on Arbitrum
       - Original tokens unlocked on Sepolia
```

**The smart contracts code is identical** - only deployed to different chains!

---

## ✅ Verification

### Block Explorers

**Ethereum Sepolia:**
- https://sepolia.etherscan.io/
- Search for your token address
- Search for your bridge address

**Arbitrum Sepolia:**
- https://sepolia.arbiscan.io/
- Search for your wrapped token address
- Search for your bridge address

### Test a Bridge Transaction

1. **Switch to Sepolia** in MetaMask
2. **Get some tokens** (transfer from deployer wallet if needed)
3. **Approve token spending**
4. **Lock tokens** on Sepolia bridge
5. **Wait 1-2 minutes** for relayers to process
6. **Switch to Arbitrum Sepolia** in MetaMask
7. **Check balance** - wrapped tokens should appear!

---

## 🛠️ Deployment Checklist

- [ ] ✅ Got Sepolia ETH from faucet
- [ ] ✅ Got Arbitrum Sepolia ETH from faucet
- [ ] ✅ Created `.env` file with deployer private key
- [ ] ✅ Deployed contracts to Sepolia
- [ ] ✅ Saved Sepolia contract addresses
- [ ] ✅ Deployed contracts to Arbitrum Sepolia
- [ ] ✅ Saved Arbitrum contract addresses
- [ ] ✅ Added Arbitrum Sepolia to MetaMask
- [ ] ✅ Set up relayer wallets
- [ ] ✅ Funded relayers on both networks
- [ ] ✅ Deployed backend with SAM
- [ ] ✅ Configured frontend with addresses
- [ ] ✅ Launched frontend
- [ ] ✅ Tested bridge!

---

## 🎯 Common Commands

```bash
# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Deploy to Arbitrum
npx hardhat run scripts/deploy.js --network arbitrumSepolia

# Build backend
cd backend && sam build

# Deploy backend
sam deploy --guided

# Run frontend
cd frontend && npm run dev

# View logs
sam logs -n EventPollerFunction --tail
```

---

## 📚 Useful Links

- **Sepolia Faucet:** https://sepoliafaucet.com/
- **Arbitrum Faucet:** https://faucets.chain.link/arbitrum-sepolia
- **Sepolia Explorer:** https://sepolia.etherscan.io/
- **Arbitrum Explorer:** https://sepolia.arbiscan.io/
- **Arbitrum Docs:** https://docs.arbitrum.io/
- **Ethereum Sepolia Info:** https://www.alchemy.com/faucets/ethereum-sepolia

---

## 🚀 You're All Set!

Your cross-chain bridge is now configured for Ethereum Sepolia ↔ Arbitrum Sepolia.

**Next steps:**
1. Get testnet tokens (5 minutes)
2. Deploy contracts (10 minutes)
3. Deploy backend (10 minutes)
4. Run frontend (5 minutes)
5. Test bridge! 🎉

**Total time: ~30 minutes to working cross-chain bridge!**

---

## ❓ Troubleshooting

### "Cannot find network 'arbitrumSepolia'"
- Make sure you updated hardhat.config.js
- Run: `npm install`

### "Insufficient balance for gas"
- Get more testnet ETH from faucets
- Make sure you're on the correct network

### "Contract address not found"
- Verify contract was deployed (check explorer)
- Check you're using correct address from deployment

### "Cannot connect to RPC"
- Verify RPC URL is correct
- Check internet connection
- Wait a moment and try again

---

Good luck! 🚀
