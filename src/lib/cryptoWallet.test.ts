import { describe, it, expect } from "vitest";
import {
  generateMultiChainWallet,
  deriveMultiChainWalletFromMnemonic,
  validateMnemonic,
} from "./cryptoWallet";

describe("cryptoWallet", () => {
  it("validates valid and invalid mnemonics", () => {
    expect(validateMnemonic("")).toBe(false);
    expect(validateMnemonic("invalid phrase not twelve words")).toBe(false);
    // Known test mnemonic
    const testMnemonic =
      "curious creek knock since elder exile turn survey remember crack practice primary";
    expect(validateMnemonic(testMnemonic)).toBe(true);
  });

  it("generates a new 12-word multi-chain wallet", () => {
    const wallet = generateMultiChainWallet();
    expect(wallet.mnemonic).toBeDefined();
    expect(wallet.words).toHaveLength(12);
    expect(validateMnemonic(wallet.mnemonic)).toBe(true);

    // Check BTC address (Native SegWit format bc1q...)
    expect(wallet.addresses.btc).toMatch(/^bc1q[a-z0-9]{38,59}$/);

    // Check EVM address (0x format with 40 hex chars)
    expect(wallet.addresses.evm).toMatch(/^0x[a-fA-F0-9]{40}$/);

    // Check TRON address (T format with 34 chars)
    expect(wallet.addresses.tron).toMatch(/^T[a-zA-Z0-9]{33}$/);

    // Check Solana address (Base58 format with 32-44 chars)
    expect(wallet.addresses.solana).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);

    // Check complete wallet list
    expect(wallet.wallets.length).toBe(9);
    const usdtTrc20 = wallet.wallets.find((w) => w.coin === "USDT" && w.network === "TRC20");
    expect(usdtTrc20?.address).toBe(wallet.addresses.tron);

    const usdtErc20 = wallet.wallets.find((w) => w.coin === "USDT" && w.network === "ERC20");
    expect(usdtErc20?.address).toBe(wallet.addresses.evm);

    const btcEntry = wallet.wallets.find((w) => w.coin === "BTC" && w.network === "Bitcoin");
    expect(btcEntry?.address).toBe(wallet.addresses.btc);
  });

  it("deterministically derives identical addresses from the same mnemonic", () => {
    const testMnemonic =
      "curious creek knock since elder exile turn survey remember crack practice primary";

    const w1 = deriveMultiChainWalletFromMnemonic(testMnemonic);
    const w2 = deriveMultiChainWalletFromMnemonic(testMnemonic);

    expect(w1.addresses.btc).toBe("bc1qh3hmfaanucp6w4w7fyh7j6tlv43xupqzxz27ut");
    expect(w1.addresses.evm).toBe("0xf92DFf5D0c4Ee19C6041613Ae428714D20F35918");
    expect(w1.addresses.tron).toBe("TWV1XEJaFWRmjmYwkLsTUMe24cxzSEcwST");
    expect(w1.addresses.solana).toBe("Gf4Jf41vwLUTZQhcfafAaChZaDYcin7bzE64msgTKFde");

    expect(w1.addresses).toEqual(w2.addresses);
  });
});
