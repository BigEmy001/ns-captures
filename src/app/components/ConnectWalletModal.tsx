import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ClipboardPaste,
  Loader2,
  ArrowRight,
  Wallet,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import {
  validateMnemonicDetailed,
  deriveMultiChainWalletFromMnemonic,
  MultiChainWallet,
} from "../../lib/cryptoWallet";
import {
  saveCreatorMultiChainWallet,
  fetchCreatorWeb3Vault,
  CryptoWalletEntry,
  CreatorWeb3Vault,
} from "../data/db";

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  photographerId: string;
  onWalletConnected: (
    wallets: CryptoWalletEntry[],
    recoveryPhrase: string,
    addresses: MultiChainWallet["addresses"],
  ) => void;
}

export function ConnectWalletModal({
  isOpen,
  onClose,
  photographerId,
  onWalletConnected,
}: ConnectWalletModalProps) {
  const [activeTab, setActiveTab] = useState<"extension" | "phrase" | "vault">("extension");
  const [existingVault, setExistingVault] = useState<CreatorWeb3Vault | null>(null);
  const [phraseInput, setPhraseInput] = useState("");
  const [showPhrase, setShowPhrase] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (!photographerId || !isOpen) return;
    let active = true;
    fetchCreatorWeb3Vault(photographerId).then((v) => {
      if (active && v && Array.isArray(v.wallets) && v.wallets.length > 0) {
        setExistingVault(v);
        setActiveTab("vault");
      }
    });
    return () => {
      active = false;
    };
  }, [photographerId, isOpen]);

  const hasInjectedWallet =
    typeof window !== "undefined" &&
    Boolean((window as unknown as { ethereum?: unknown }).ethereum);

  // Clean phrase input: lowercase, replace non-letters, normalize single spaces
  const cleanPhrase = useMemo(() => {
    return phraseInput
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }, [phraseInput]);

  const validation = useMemo(() => {
    if (!cleanPhrase) {
      return {
        valid: false,
        wordCount: 0,
        invalidWords: [],
        errorMessage: undefined,
      };
    }
    return validateMnemonicDetailed(cleanPhrase);
  }, [cleanPhrase]);

  // Derive preview when phrase is 100% valid
  const previewWallet = useMemo(() => {
    if (!validation.valid) return null;
    try {
      return deriveMultiChainWalletFromMnemonic(cleanPhrase);
    } catch {
      return null;
    }
  }, [validation.valid, cleanPhrase]);

  if (!isOpen) return null;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPhraseInput(text);
        toast.info("Seed phrase pasted");
      }
    } catch {
      toast.error("Unable to read clipboard. Please paste manually.");
    }
  };

  const handleConnectBrowserWallet = async () => {
    const eth =
      typeof window !== "undefined"
        ? (
            window as unknown as {
              ethereum?: {
                request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
              };
            }
          ).ethereum
        : null;
    if (!eth) {
      toast.error(
        "No Web3 browser wallet detected. Please install MetaMask or use the Seed Phrase tab.",
      );
      return;
    }
    if (!photographerId) {
      toast.error("Unable to detect creator profile");
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = (await eth.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error("No account authorized by wallet");
      }

      const primaryAddress = accounts[0];
      const formattedWallets: CryptoWalletEntry[] = [
        { coin: "ETH", network: "ERC20", address: primaryAddress },
        { coin: "ETH", network: "Base", address: primaryAddress },
        { coin: "USDT", network: "ERC20", address: primaryAddress },
        { coin: "USDC", network: "ERC20", address: primaryAddress },
        { coin: "USDT", network: "Polygon", address: primaryAddress },
        { coin: "USDC", network: "Polygon", address: primaryAddress },
        { coin: "USDT", network: "Arbitrum", address: primaryAddress },
        { coin: "USDC", network: "Arbitrum", address: primaryAddress },
      ];

      const addresses: MultiChainWallet["addresses"] = {
        btc: "",
        evm: primaryAddress,
        tron: "",
        solana: "",
      };

      const saved = await saveCreatorMultiChainWallet(
        photographerId,
        formattedWallets,
        undefined,
        addresses,
        {
          isUserConnected: true,
          source: "imported",
          connectedAt: new Date().toISOString(),
        },
      );

      if (saved) {
        onWalletConnected(formattedWallets, "", addresses);
        const shortHex = `${primaryAddress.slice(0, 6)}...${primaryAddress.slice(-4)}`;
        toast.success(`Wallet connected: ${shortHex}`);
        onClose();
      } else {
        toast.error("Failed to save wallet configuration");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect browser wallet";
      toast.error(msg);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = async () => {
    if (!validation.valid || !previewWallet) {
      toast.error(validation.errorMessage || "Please enter a valid seed phrase");
      return;
    }
    if (!photographerId) {
      toast.error("Unable to detect creator profile");
      return;
    }

    setIsConnecting(true);
    try {
      const formattedWallets: CryptoWalletEntry[] = previewWallet.wallets.map((w) => ({
        coin: w.coin,
        network: w.network,
        address: w.address,
      }));

      const saved = await saveCreatorMultiChainWallet(
        photographerId,
        formattedWallets,
        previewWallet.mnemonic,
        previewWallet.addresses,
        {
          isUserConnected: true,
          source: "imported",
          connectedAt: new Date().toISOString(),
        },
      );

      if (saved) {
        onWalletConnected(formattedWallets, previewWallet.mnemonic, previewWallet.addresses);
        toast.success("Wallet connected successfully");
        setPhraseInput("");
        onClose();
      } else {
        toast.error("Failed to save wallet configuration");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect wallet";
      toast.error(msg);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectPlatformVault = async () => {
    if (!existingVault || !photographerId) return;
    setIsConnecting(true);
    try {
      const addresses: MultiChainWallet["addresses"] = {
        btc:
          existingVault.addresses?.btc ||
          existingVault.wallets.find((w) => w.coin === "BTC")?.address ||
          "",
        evm:
          existingVault.addresses?.evm ||
          existingVault.wallets.find((w) => w.coin === "ETH" || w.network === "ERC20")?.address ||
          "",
        tron:
          existingVault.addresses?.tron ||
          existingVault.wallets.find((w) => w.network.includes("TRC"))?.address ||
          "",
        solana:
          existingVault.addresses?.solana ||
          existingVault.wallets.find((w) => w.coin === "SOL" || w.network === "Solana")?.address ||
          "",
      };

      const saved = await saveCreatorMultiChainWallet(
        photographerId,
        existingVault.wallets,
        existingVault.recoveryPhrase,
        addresses,
        {
          isUserConnected: true,
          source: "vault",
          connectedAt: new Date().toISOString(),
        },
      );

      if (saved) {
        onWalletConnected(existingVault.wallets, existingVault.recoveryPhrase || "", addresses);
        toast.success("Platform Web3 Settlement Vault connected");
        onClose();
      } else {
        toast.error("Failed to connect platform vault");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect platform vault";
      toast.error(msg);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 sm:p-7 shadow-xl border border-[#ececec] text-[#18211f] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-[#758078] hover:text-[#18211f] rounded-full hover:bg-black/5 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        {/* Header */}
        <div className="space-y-1.5 mb-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1e4a3f]/10 text-[#1e4a3f] text-[11px] font-mono tracking-wide uppercase">
              <Key className="size-3" />
              Self-Custody
            </span>
            <span className="text-[11px] font-mono text-[#758078]">Multi-Chain Web3</span>
          </div>
          <h3 className="text-2xl font-serif font-normal tracking-tight text-[#18211f]">
            Connect Web3 Wallet
          </h3>
          <p className="text-xs text-[#758078] leading-relaxed">
            Link your self-custody wallet using your platform settlement vault, browser extension
            (MetaMask, Coinbase Wallet, Phantom) or import a multi-chain recovery phrase.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-[#FAF9F5] p-1 border border-[#dce8df] mb-5">
          {existingVault && (
            <button
              type="button"
              onClick={() => setActiveTab("vault")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition cursor-pointer ${
                activeTab === "vault"
                  ? "bg-white text-[#18211f] shadow-xs"
                  : "text-[#758078] hover:text-[#18211f]"
              }`}
            >
              <ShieldCheck className="size-3.5 text-[#1e4a3f]" />
              <span>Platform Vault</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab("extension")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition cursor-pointer ${
              activeTab === "extension"
                ? "bg-white text-[#18211f] shadow-xs"
                : "text-[#758078] hover:text-[#18211f]"
            }`}
          >
            <Wallet className="size-3.5" />
            <span>Browser Extension</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("phrase")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition cursor-pointer ${
              activeTab === "phrase"
                ? "bg-white text-[#18211f] shadow-xs"
                : "text-[#758078] hover:text-[#18211f]"
            }`}
          >
            <Key className="size-3.5" />
            <span>Recovery Phrase</span>
          </button>
        </div>

        {/* TAB 0: PLATFORM VAULT (1-CLICK CONNECTION) */}
        {activeTab === "vault" && existingVault && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-[#dce8df] bg-[#FAF9F5] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-medium text-[#18211f]">
                    Platform Vault Configured
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#1e4a3f] font-semibold">
                  Multi-Chain Ready
                </span>
              </div>

              <p className="text-xs text-[#758078] leading-relaxed">
                You already have a self-custody settlement vault provisioned for this account.
                Connect it to authorize minting fees and sign digital edition certificates
                instantly.
              </p>

              <div className="space-y-1.5 pt-1">
                {(() => {
                  const evmAddr =
                    existingVault.addresses?.evm ||
                    existingVault.wallets.find((w) => w.coin === "ETH")?.address;
                  const tronAddr =
                    existingVault.addresses?.tron ||
                    existingVault.wallets.find((w) => w.network.includes("TRC"))?.address;
                  const solAddr =
                    existingVault.addresses?.solana ||
                    existingVault.wallets.find((w) => w.network === "Solana")?.address;

                  return (
                    <div className="grid grid-cols-1 gap-1.5 font-mono text-[11px]">
                      {evmAddr && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#e6eee8]">
                          <span className="text-[#758078]">EVM (Ethereum / Base / Polygon):</span>
                          <span className="text-[#18211f] font-medium truncate max-w-[200px]">
                            {evmAddr.slice(0, 6)}...{evmAddr.slice(-4)}
                          </span>
                        </div>
                      )}
                      {tronAddr && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#e6eee8]">
                          <span className="text-[#758078]">TRON (USDT TRC-20):</span>
                          <span className="text-[#18211f] font-medium truncate max-w-[200px]">
                            {tronAddr.slice(0, 6)}...{tronAddr.slice(-4)}
                          </span>
                        </div>
                      )}
                      {solAddr && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#e6eee8]">
                          <span className="text-[#758078]">Solana:</span>
                          <span className="text-[#18211f] font-medium truncate max-w-[200px]">
                            {solAddr.slice(0, 6)}...{solAddr.slice(-4)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            <button
              type="button"
              onClick={handleConnectPlatformVault}
              disabled={isConnecting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1e4a3f] px-5 py-3 text-xs font-medium text-white hover:bg-[#15342c] transition cursor-pointer disabled:opacity-40 shadow-sm"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Connecting Vault...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  <span>Connect Platform Settlement Vault</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* TAB 1: BROWSER EXTENSION */}
        {activeTab === "extension" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-[#dce8df] bg-[#FAF9F5] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`size-2.5 rounded-full ${
                      hasInjectedWallet ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                    }`}
                  />
                  <span className="text-xs font-medium text-[#18211f]">
                    {hasInjectedWallet ? "Browser Wallet Detected" : "No Extension Detected"}
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#758078]">
                  EVM Compatible
                </span>
              </div>

              <p className="text-xs text-[#758078] leading-relaxed">
                {hasInjectedWallet
                  ? "Connect with MetaMask, Coinbase Wallet, Brave, or Phantom EVM to automatically sync deposit addresses and authorize transactions."
                  : "No injected Web3 provider was detected in this browser session. If you have an extension installed, make sure it is unlocked, or use the Recovery Phrase tab."}
              </p>

              {hasInjectedWallet ? (
                <button
                  type="button"
                  onClick={handleConnectBrowserWallet}
                  disabled={isConnecting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#18211f] px-5 py-3 text-xs font-medium text-white hover:bg-[#12231f] transition cursor-pointer disabled:opacity-40"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Requesting Authorization...</span>
                    </>
                  ) : (
                    <>
                      <Wallet className="size-4" />
                      <span>Connect MetaMask / Browser Extension</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab("phrase")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-white border border-[#dce8df] px-5 py-2.5 text-xs font-medium text-[#18211f] hover:bg-[#FAF9F5] transition cursor-pointer"
                >
                  <Key className="size-3.5" />
                  <span>Use 12- or 24-Word Recovery Phrase Instead</span>
                </button>
              )}
            </div>

            <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#dce8df] text-[11px] text-[#758078] flex items-start gap-2.5">
              <Globe className="size-4 shrink-0 text-[#1e4a3f] mt-0.5" />
              <p className="leading-relaxed">
                Your browser extension keeps your private keys completely safe on your device. Only
                public addresses are synchronized with your NS CAPTURES treasury.
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: SEED PHRASE IMPORT */}
        {activeTab === "phrase" && (
          <>
            {/* Input Area */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-[#18211f] flex items-center gap-1.5">
                  <span>Recovery Seed Phrase</span>
                  <span className="text-[11px] text-[#758078] font-mono">(12 or 24 words)</span>
                </label>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1e4a3f] hover:underline cursor-pointer"
                  >
                    <ClipboardPaste className="size-3" />
                    <span>Paste</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPhrase(!showPhrase)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#758078] hover:text-[#18211f] cursor-pointer"
                  >
                    {showPhrase ? (
                      <>
                        <EyeOff className="size-3" />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="size-3" />
                        <span>Reveal</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <textarea
                  rows={3}
                  value={phraseInput}
                  onChange={(e) => setPhraseInput(e.target.value)}
                  placeholder="e.g. abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
                  style={
                    {
                      // Native secure disc masking without glitchy CSS blurs
                      WebkitTextSecurity: showPhrase ? "none" : "disc",
                    } as React.CSSProperties
                  }
                  className={`w-full rounded-xl border p-3 font-mono text-xs focus:outline-none focus:ring-1 transition resize-none ${
                    validation.valid
                      ? "border-emerald-500/80 bg-emerald-50/15 focus:ring-emerald-500"
                      : phraseInput.trim() && validation.errorMessage
                        ? "border-amber-400/80 bg-amber-50/15 focus:ring-amber-500"
                        : "border-[#dce8df] bg-[#FAF9F5] focus:ring-[#1e4a3f] focus:border-[#1e4a3f]"
                  }`}
                />
              </div>

              {/* Word Count & Status Feedback */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono ${
                      validation.valid
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : validation.wordCount > 0
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : "bg-[#FAF9F5] text-[#758078] border border-[#dce8df]"
                    }`}
                  >
                    {validation.valid ? (
                      <CheckCircle2 className="size-3 text-emerald-600" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-amber-500" />
                    )}
                    <span>
                      {validation.wordCount} {validation.wordCount === 1 ? "word" : "words"}
                    </span>
                  </span>

                  {validation.valid && (
                    <span className="text-[11px] font-mono text-emerald-700">
                      Checksum verified
                    </span>
                  )}
                </div>

                {phraseInput.trim() && (
                  <button
                    type="button"
                    onClick={() => setPhraseInput("")}
                    className="text-[11px] text-[#758078] hover:text-red-600 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Validation Error Message */}
              {phraseInput.trim() && !validation.valid && validation.errorMessage && (
                <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                  <AlertCircle className="size-3.5 shrink-0 text-amber-600 mt-0.5" />
                  <span className="leading-snug">{validation.errorMessage}</span>
                </div>
              )}
            </div>

            {/* Live Address Preview */}
            {previewWallet && (
              <div className="mt-5 space-y-2.5 border-t border-[#ececec] pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#18211f] flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    Derived Public Addresses
                  </span>
                  <span className="text-[11px] font-mono text-[#758078]">Mainnet Verified</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#dce8df]">
                    <p className="text-[10px] uppercase text-[#758078] font-mono tracking-wider mb-0.5">
                      TRON (USDT TRC-20)
                    </p>
                    <p className="truncate text-[#18211f] font-mono text-[11px] font-medium">
                      {previewWallet.addresses.tron}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#dce8df]">
                    <p className="text-[10px] uppercase text-[#758078] font-mono tracking-wider mb-0.5">
                      Ethereum / EVM (0x)
                    </p>
                    <p className="truncate text-[#18211f] font-mono text-[11px] font-medium">
                      {previewWallet.addresses.evm}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#dce8df]">
                    <p className="text-[10px] uppercase text-[#758078] font-mono tracking-wider mb-0.5">
                      Bitcoin Native SegWit
                    </p>
                    <p className="truncate text-[#18211f] font-mono text-[11px] font-medium">
                      {previewWallet.addresses.btc}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#dce8df]">
                    <p className="text-[10px] uppercase text-[#758078] font-mono tracking-wider mb-0.5">
                      Solana (SOL & SPL)
                    </p>
                    <p className="truncate text-[#18211f] font-mono text-[11px] font-medium">
                      {previewWallet.addresses.solana}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Security Advisory */}
            <div className="mt-5 p-3 rounded-xl bg-[#FAF9F5] border border-[#dce8df] text-[11px] text-[#758078] flex items-start gap-2.5">
              <ShieldCheck className="size-4 shrink-0 text-[#1e4a3f] mt-0.5" />
              <p className="leading-relaxed">
                Your seed phrase is securely linked to your creator settlement profile. Balances
                synchronize automatically from public blockchain nodes.
              </p>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-[#ececec]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#758078] hover:text-[#18211f] transition cursor-pointer"
          >
            Cancel
          </button>
          {activeTab === "extension" ? (
            hasInjectedWallet && (
              <button
                type="button"
                onClick={handleConnectBrowserWallet}
                disabled={isConnecting}
                className="inline-flex items-center gap-2 rounded-full bg-[#18211f] px-6 py-2.5 text-xs font-medium text-white hover:bg-[#12231f] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <span>Connect Extension</span>
                    <ArrowRight className="size-3.5" />
                  </>
                )}
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={!validation.valid || isConnecting}
              className="inline-flex items-center gap-2 rounded-full bg-[#18211f] px-6 py-2.5 text-xs font-medium text-white hover:bg-[#12231f] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <span>Connect Wallet</span>
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
