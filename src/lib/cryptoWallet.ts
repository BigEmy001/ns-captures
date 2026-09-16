import { Buffer } from "buffer";
import * as bip39 from "bip39";
import { BIP32Factory } from "bip32";
import * as ecc from "tiny-secp256k1";
import * as bitcoin from "bitcoinjs-lib";
import { ethers } from "ethers";
import bs58 from "bs58";
import * as ed25519 from "ed25519-hd-key";
import nacl from "tweetnacl";

// Ensure Buffer is available in browser/Vite environments if not present
if (typeof window !== "undefined") {
  const win = window as unknown as { Buffer?: typeof Buffer; global?: unknown };
  if (!win.Buffer) win.Buffer = Buffer;
  if (!win.global) win.global = window;
}

const bip32 = BIP32Factory(ecc);

export interface DerivedChainWallet {
  coin: string;
  network: string;
  name: string;
  address: string;
  derivationPath: string;
}

export interface MultiChainWallet {
  mnemonic: string;
  words: string[];
  wallets: DerivedChainWallet[];
  addresses: {
    btc: string;
    evm: string; // Used for ETH and all EVM USDT/USDC (ERC20, Arbitrum, Base, Polygon, Optimism, Avalanche, BEP20)
    tron: string; // Used for USDT/USDC TRC20
    solana: string; // Used for SOL and USDT/USDC SPL
  };
  generatedAt: string;
}

/**
 * Validates whether a provided string is a valid 12- or 24-word BIP-39 mnemonic phrase.
 */
export function validateMnemonic(phrase: string): boolean {
  if (!phrase || typeof phrase !== "string") return false;
  const clean = phrase.trim().toLowerCase().replace(/\s+/g, " ");
  return bip39.validateMnemonic(clean);
}

export interface MnemonicValidationResult {
  valid: boolean;
  wordCount: number;
  invalidWords: string[];
  errorMessage?: string;
}

/**
 * Validates a seed phrase and returns detailed diagnostics including word count and invalid dictionary words.
 */
export function validateMnemonicDetailed(phrase: string): MnemonicValidationResult {
  if (!phrase || typeof phrase !== "string") {
    return {
      valid: false,
      wordCount: 0,
      invalidWords: [],
      errorMessage: "Seed phrase cannot be empty",
    };
  }
  const clean = phrase.trim().toLowerCase().replace(/\s+/g, " ");
  if (!clean) {
    return {
      valid: false,
      wordCount: 0,
      invalidWords: [],
      errorMessage: "Seed phrase cannot be empty",
    };
  }
  const words = clean.split(" ");
  const wordlist = bip39.wordlists.english;
  const invalidWords = words.filter((w) => !wordlist.includes(w));

  if (invalidWords.length > 0) {
    return {
      valid: false,
      wordCount: words.length,
      invalidWords,
      errorMessage: `Unrecognized BIP-39 word(s): ${invalidWords.slice(0, 3).join(", ")}${invalidWords.length > 3 ? "..." : ""}`,
    };
  }

  const validLengths = [12, 15, 18, 21, 24];
  if (!validLengths.includes(words.length)) {
    return {
      valid: false,
      wordCount: words.length,
      invalidWords: [],
      errorMessage: `Entered ${words.length} word${words.length === 1 ? "" : "s"}. BIP-39 requires 12, 15, 18, 21, or 24 words.`,
    };
  }

  const validChecksum = bip39.validateMnemonic(clean);
  if (!validChecksum) {
    return {
      valid: false,
      wordCount: words.length,
      invalidWords: [],
      errorMessage: "Invalid checksum. Please check the spelling or sequence of the words.",
    };
  }

  return {
    valid: true,
    wordCount: words.length,
    invalidWords: [],
  };
}

/**
 * Derives an Ethereum/EVM EIP-55 checksum address from an uncompressed public key.
 */
function deriveEvmAddress(compressedPubKey: Uint8Array): string {
  const uncompressed = ecc.pointCompress(compressedPubKey, false);
  // Omit the leading 0x04 uncompressed prefix byte (64 bytes remain)
  const pubBytes = uncompressed.slice(1);
  const keccakHex = ethers.keccak256(pubBytes);
  const rawAddress = "0x" + keccakHex.slice(-40);
  return ethers.getAddress(rawAddress);
}

/**
 * Derives a TRON base58check address (T...) from a compressed public key.
 */
function deriveTronAddress(compressedPubKey: Uint8Array): string {
  const uncompressed = ecc.pointCompress(compressedPubKey, false);
  const pubBytes = uncompressed.slice(1);
  const keccakHex = ethers.keccak256(pubBytes);
  const rawHashBytes = ethers.getBytes(keccakHex);

  // TRON addresses start with prefix byte 0x41 followed by last 20 bytes of keccak256
  const addressBytes = new Uint8Array(21);
  addressBytes[0] = 0x41;
  addressBytes.set(rawHashBytes.slice(-20), 1);

  // Double SHA-256 for 4-byte checksum via bitcoinjs crypto
  const hash1 = bitcoin.crypto.sha256(Buffer.from(addressBytes));
  const hash2 = bitcoin.crypto.sha256(hash1);
  const checksum = hash2.slice(0, 4);

  const fullBytes = new Uint8Array(25);
  fullBytes.set(addressBytes, 0);
  fullBytes.set(checksum, 21);

  const encoder =
    (
      bs58 as unknown as {
        default?: { encode: (b: Uint8Array) => string };
        encode: (b: Uint8Array) => string;
      }
    ).default || bs58;
  return encoder.encode(fullBytes);
}

/**
 * Derives a complete set of multi-chain addresses from a BIP-39 mnemonic phrase.
 */
export function deriveMultiChainWalletFromMnemonic(mnemonic: string): MultiChainWallet {
  const cleanMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, " ");
  const words = cleanMnemonic.split(" ");
  const seed = bip39.mnemonicToSeedSync(cleanMnemonic);
  const seedUint8 = Uint8Array.from(seed);

  // Derive master root node
  const root = bip32.fromSeed(seedUint8, bitcoin.networks.bitcoin);

  // 1. Bitcoin (BTC) - BIP-84 Native SegWit (bc1q...)
  const btcPath = "m/84'/0'/0'/0/0";
  const btcChild = root.derivePath(btcPath);
  const { address: btcAddress } = bitcoin.payments.p2wpkh({
    pubkey: btcChild.publicKey,
    network: bitcoin.networks.bitcoin,
  });
  const safeBtcAddress = btcAddress || "";

  // 2. EVM Chains (Ethereum, Arbitrum, Base, Polygon, Optimism, Avalanche C, BSC)
  // Standard BIP-44 path m/44'/60'/0'/0/0
  const evmPath = "m/44'/60'/0'/0/0";
  const evmChild = root.derivePath(evmPath);
  const evmAddress = deriveEvmAddress(evmChild.publicKey);

  // 3. TRON (USDT TRC-20)
  // Standard BIP-44 path m/44'/195'/0'/0/0
  const tronPath = "m/44'/195'/0'/0/0";
  const tronChild = root.derivePath(tronPath);
  const tronAddress = deriveTronAddress(tronChild.publicKey);

  // 4. Solana (SOL, USDT SPL, USDC SPL)
  // Standard BIP-44 Ed25519 path m/44'/501'/0'/0'
  const solPath = "m/44'/501'/0'/0'";
  const solDerived = ed25519.derivePath(solPath, Buffer.from(seed).toString("hex"));
  const solKeyPair = nacl.sign.keyPair.fromSeed(solDerived.key);
  const encoder =
    (
      bs58 as unknown as {
        default?: { encode: (b: Uint8Array) => string };
        encode: (b: Uint8Array) => string;
      }
    ).default || bs58;
  const solanaAddress = encoder.encode(solKeyPair.publicKey);

  // Build complete wallet list matching all active platform coins and networks
  const wallets: DerivedChainWallet[] = [
    // Tether (USDT) - Primary settlement asset
    {
      coin: "USDT",
      network: "TRC20",
      name: "Tether (TRON TRC-20)",
      address: tronAddress,
      derivationPath: tronPath,
    },
    // TRON (TRX) - Native gas & payment currency
    {
      coin: "TRX",
      network: "TRC20",
      name: "TRON (Native TRX)",
      address: tronAddress,
      derivationPath: tronPath,
    },
    {
      coin: "USDT",
      network: "Solana",
      name: "Tether (Solana SPL)",
      address: solanaAddress,
      derivationPath: solPath,
    },
    {
      coin: "USDT",
      network: "ERC20",
      name: "Tether (Ethereum ERC-20)",
      address: evmAddress,
      derivationPath: evmPath,
    },

    // USD Coin (USDC)
    {
      coin: "USDC",
      network: "Solana",
      name: "USD Coin (Solana)",
      address: solanaAddress,
      derivationPath: solPath,
    },
    {
      coin: "USDC",
      network: "ERC20",
      name: "USD Coin (Ethereum)",
      address: evmAddress,
      derivationPath: evmPath,
    },
    {
      coin: "USDC",
      network: "TRC20",
      name: "USD Coin (TRON)",
      address: tronAddress,
      derivationPath: tronPath,
    },

    // Bitcoin
    {
      coin: "BTC",
      network: "Bitcoin",
      name: "Bitcoin (Native SegWit)",
      address: safeBtcAddress,
      derivationPath: btcPath,
    },

    // Ethereum
    {
      coin: "ETH",
      network: "ERC20",
      name: "Ethereum (Mainnet)",
      address: evmAddress,
      derivationPath: evmPath,
    },

    // Solana
    {
      coin: "SOL",
      network: "Solana",
      name: "Solana (Native SOL)",
      address: solanaAddress,
      derivationPath: solPath,
    },
  ];

  return {
    mnemonic: cleanMnemonic,
    words,
    wallets,
    addresses: {
      btc: safeBtcAddress,
      evm: evmAddress,
      tron: tronAddress,
      solana: solanaAddress,
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generates a brand new 12-word multi-chain HD wallet.
 */
export function generateMultiChainWallet(): MultiChainWallet {
  // 128 bits of entropy generates 12 words
  const mnemonic = bip39.generateMnemonic(128);
  return deriveMultiChainWalletFromMnemonic(mnemonic);
}
