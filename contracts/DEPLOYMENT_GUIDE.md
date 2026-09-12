# NSC (NS Captures Token) Deployment & Trust Wallet Guide

This guide walks you through deploying your **NSC** token on the **Base Sepolia Testnet** for free ($0) and importing it into your **Trust Wallet**.

---

## Step 1: Get Free Base Sepolia Testnet ETH (30 Seconds)

You need a fraction of testnet ETH (gas) to deploy the contract. Testnet ETH is 100% free:

1. Copy your wallet address (`0x...`).
2. Visit any of these free faucets:
   - **Coinbase Faucet**: [https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
   - **Chainlink Faucet**: [https://faucets.chain.link/base-sepolia](https://faucets.chain.link/base-sepolia)
   - **QuickNode Faucet**: [https://faucet.quicknode.com/base/sepolia](https://faucet.quicknode.com/base/sepolia)
3. Paste your `0x...` address and claim free testnet ETH.

---

## Step 2: Deploy the Contract via Remix IDE (2 Minutes)

Remix is the official web-based Ethereum/Base smart contract deployment tool.

1. Open **[Remix IDE](https://remix.ethereum.org)** in your browser.
2. In the left sidebar file explorer, click the **"Create New File"** icon and name it `NSCapturesToken.sol`.
3. Open [`contracts/NSCapturesToken.sol`](./NSCapturesToken.sol) in this project, copy all the code, and paste it into Remix.
4. On the left menu, click the **Solidity Compiler** tab (3rd icon down):
   - Compiler version: `0.8.20` or higher.
   - Click **"Compile NSCapturesToken.sol"** (you will see a green checkmark).
5. Click the **Deploy & Run Transactions** tab (4th icon down):
   - In the **ENVIRONMENT** dropdown, select **"Injected Provider - MetaMask"** (or Trust Wallet / Coinbase Wallet).
   - Make sure your wallet network is set to **Base Sepolia**.
   - In the **CONTRACT** dropdown, make sure **"NSCapturesToken"** is selected.
   - Expand the **Deploy** dropdown and enter:
     - `initialTreasury`: Your wallet address (`0x...`)
     - `initialReserveSupply`: `5000000` (mints 5,000,000 NSC to your wallet)
   - Click the orange **"transact"** button.
6. Approve the transaction in your wallet.
7. Under **"Deployed Contracts"** at the bottom, copy your **Deployed Contract Address** (e.g., `0x1234...abcd`).

---

## Step 3: Import Your NSC Token into Trust Wallet

Now that the token lives on the blockchain, add it to Trust Wallet:

1. Open **Trust Wallet** on your phone or browser extension.
2. Scroll to the bottom of your token list and tap **"Manage Crypto"** or **"Add Custom Token"** (+ icon).
3. Select **Network**: **Base** (or **Base Sepolia** if in testnet mode).
4. Paste your **Contract Address** copied from Step 2.
5. Trust Wallet will automatically populate:
   - **Name**: `NS Captures Token`
   - **Symbol**: `NSC`
   - **Decimals**: `18`
6. Tap **"Save"** / **"Import"**.

🎉 **You will immediately see your 5,000,000 NSC balance in your Trust Wallet!**

---

## Step 4: Add the Contract Address to NS Captures

Once you have your contract address, we update the contract reference in `src/lib/onChainBalance.ts`:

```ts
export const NSC_TOKEN_CONTRACT = {
  base: "0xYOUR_DEPLOYED_CONTRACT_ADDRESS",
  explorer: "https://sepolia.basescan.org/token/0xYOUR_DEPLOYED_CONTRACT_ADDRESS",
};
```

This ensures that every deposit, transfer, and withdrawal in NS Captures links directly to your live on-chain token!
