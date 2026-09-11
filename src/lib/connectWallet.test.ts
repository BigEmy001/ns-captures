import { describe, it, expect } from "vitest";
import {
  validateMnemonic,
  validateMnemonicDetailed,
  deriveMultiChainWalletFromMnemonic,
} from "./cryptoWallet";

describe("connectWallet & seed phrase import", () => {
  // Standard test vector: 12 words
  const valid12WordPhrase =
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

  // Standard test vector: 24 words
  const valid24WordPhrase =
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art";

  it("validates standard 12-word seed phrase successfully", () => {
    const result = validateMnemonicDetailed(valid12WordPhrase);
    expect(result.valid).toBe(true);
    expect(result.wordCount).toBe(12);
    expect(result.invalidWords).toHaveLength(0);
    expect(validateMnemonic(valid12WordPhrase)).toBe(true);
  });

  it("validates standard 24-word seed phrase successfully", () => {
    const result = validateMnemonicDetailed(valid24WordPhrase);
    expect(result.valid).toBe(true);
    expect(result.wordCount).toBe(24);
    expect(result.invalidWords).toHaveLength(0);
    expect(validateMnemonic(valid24WordPhrase)).toBe(true);
  });

  it("detects unrecognized non-BIP39 words", () => {
    const badPhrase =
      "abandon abandon abandon fakecrypto randomword abandon abandon abandon abandon abandon abandon about";
    const result = validateMnemonicDetailed(badPhrase);
    expect(result.valid).toBe(false);
    expect(result.invalidWords).toContain("fakecrypto");
    expect(result.invalidWords).toContain("randomword");
    expect(result.errorMessage).toMatch(/Unrecognized BIP-39 word/);
  });

  it("rejects invalid word counts", () => {
    const partialPhrase = "abandon abandon abandon abandon abandon";
    const result = validateMnemonicDetailed(partialPhrase);
    expect(result.valid).toBe(false);
    expect(result.wordCount).toBe(5);
    expect(result.errorMessage).toMatch(/BIP-39 requires 12, 15, 18, 21, or 24 words/);
  });

  it("rejects invalid checksums when words are valid BIP39 but checksum fails", () => {
    // 12 'abandon' words has invalid checksum
    const badChecksumPhrase =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon";
    const result = validateMnemonicDetailed(badChecksumPhrase);
    expect(result.valid).toBe(false);
    expect(result.errorMessage).toMatch(/Invalid checksum/);
  });

  it("derives all multi-chain addresses accurately from connected phrase", () => {
    const wallet = deriveMultiChainWalletFromMnemonic(valid12WordPhrase);
    expect(wallet.addresses.btc).toMatch(/^bc1q/);
    expect(wallet.addresses.evm).toMatch(/^0x/);
    expect(wallet.addresses.tron).toMatch(/^T/);
    expect(wallet.addresses.solana.length).toBeGreaterThanOrEqual(32);

    expect(wallet.wallets.some((w) => w.coin === "USDT" && w.network === "TRC20")).toBe(true);
    expect(wallet.wallets.some((w) => w.coin === "BTC")).toBe(true);
    expect(wallet.wallets.some((w) => w.coin === "ETH")).toBe(true);
    expect(wallet.wallets.some((w) => w.coin === "SOL")).toBe(true);
  });
});
