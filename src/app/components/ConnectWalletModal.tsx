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
import { useBodyScrollLock } from "./editions/useBodyScrollLock";
import {
  monoLabelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./editions/editionsFormat";

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
  useBodyScrollLock(isOpen);

  // Close on Escape, like every other editions modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
        role="dialog"
        aria-modal="true"
        aria-label="Connect a wallet"
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-(--ed-border) bg-(--ed-surface) p-6 font-sans text-(--ed-text) shadow-(--ed-shadow-lg) sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-(--ed-muted) transition-colors hover:bg-(--ed-hover) hover:text-(--ed-text)"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        {/* Header */}
        <div className="mb-5 space-y-1.5">
          <p className={monoLabelClass}>Self-custody · multi-chain</p>
          <h3 className="text-lg font-medium leading-7 text-(--ed-text)">Connect a wallet</h3>
          <p className="text-sm leading-6 text-(--ed-muted)">
            Use your settlement vault, a browser extension (MetaMask, Coinbase Wallet, Phantom), or
            import a recovery phrase.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="mb-5 flex rounded-xl border border-(--ed-border) bg-(--ed-bg) p-1">
          {existingVault && (
            <button
              type="button"
              onClick={() => setActiveTab("vault")}
              aria-pressed={activeTab === "vault"}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-[background-color,color] ${
                activeTab === "vault"
                  ? "border border-(--ed-border) bg-(--ed-surface) text-(--ed-text)"
                  : "text-(--ed-muted) hover:text-(--ed-text)"
              }`}
            >
              <ShieldCheck aria-hidden className="size-3.5" />
              <span className="whitespace-nowrap">Vault</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab("extension")}
            aria-pressed={activeTab === "extension"}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-[background-color,color] ${
              activeTab === "extension"
                ? "border border-(--ed-border) bg-(--ed-surface) text-(--ed-text)"
                : "text-(--ed-muted) hover:text-(--ed-text)"
            }`}
          >
            <Wallet aria-hidden className="size-3.5" />
            <span className="whitespace-nowrap">Extension</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("phrase")}
            aria-pressed={activeTab === "phrase"}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-[background-color,color] ${
              activeTab === "phrase"
                ? "border border-(--ed-border) bg-(--ed-surface) text-(--ed-text)"
                : "text-(--ed-muted) hover:text-(--ed-text)"
            }`}
          >
            <Key aria-hidden className="size-3.5" />
            <span className="whitespace-nowrap">Recovery phrase</span>
          </button>
        </div>

        {/* TAB 0: PLATFORM VAULT (1-CLICK CONNECTION) */}
        {activeTab === "vault" && existingVault && (
          <div className="space-y-4">
            <div className="space-y-3 rounded-xl border border-(--ed-border) bg-(--ed-bg) p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span aria-hidden className="size-1.5 rounded-full bg-(--ed-positive)" />
                  <span className="text-sm font-medium text-(--ed-text)">Vault ready</span>
                </div>
                <span className={monoLabelClass}>Multi-chain</span>
              </div>

              <p className="text-sm leading-6 text-(--ed-muted)">
                This account already has a settlement vault. Connect it to pay mint fees and sign
                certificates.
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
                    <div className="grid grid-cols-1 gap-1.5 font-mono text-xs">
                      {evmAddr && (
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-(--ed-border) bg-(--ed-surface) p-2">
                          <span className="text-(--ed-muted)">Ethereum, Base, Polygon</span>
                          <span className="max-w-[200px] truncate text-(--ed-text)">
                            {evmAddr.slice(0, 6)}...{evmAddr.slice(-4)}
                          </span>
                        </div>
                      )}
                      {tronAddr && (
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-(--ed-border) bg-(--ed-surface) p-2">
                          <span className="text-(--ed-muted)">Tron (USDT TRC-20)</span>
                          <span className="max-w-[200px] truncate text-(--ed-text)">
                            {tronAddr.slice(0, 6)}...{tronAddr.slice(-4)}
                          </span>
                        </div>
                      )}
                      {solAddr && (
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-(--ed-border) bg-(--ed-surface) p-2">
                          <span className="text-(--ed-muted)">Solana</span>
                          <span className="max-w-[200px] truncate text-(--ed-text)">
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
              className={`${primaryButtonClass} h-11 w-full px-5 text-sm`}
            >
              {isConnecting ? (
                <>
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  <span>Connecting…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 aria-hidden className="size-4" />
                  <span>Connect your vault</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* TAB 1: BROWSER EXTENSION */}
        {activeTab === "extension" && (
          <div className="space-y-4">
            <div className="space-y-3 rounded-xl border border-(--ed-border) bg-(--ed-bg) p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`size-1.5 rounded-full ${
                      hasInjectedWallet ? "bg-(--ed-positive)" : "bg-(--ed-warning)"
                    }`}
                  />
                  <span className="text-sm font-medium text-(--ed-text)">
                    {hasInjectedWallet ? "Wallet found" : "No wallet found"}
                  </span>
                </div>
                <span className={monoLabelClass}>EVM</span>
              </div>

              <p className="text-sm leading-6 text-(--ed-muted)">
                {hasInjectedWallet
                  ? "Connect MetaMask, Coinbase Wallet, Brave or Phantom to sync your addresses."
                  : "No wallet extension responded. Unlock it and try again, or import a recovery phrase instead."}
              </p>

              {hasInjectedWallet ? (
                <button
                  type="button"
                  onClick={handleConnectBrowserWallet}
                  disabled={isConnecting}
                  className={`${primaryButtonClass} h-11 w-full px-5 text-sm`}
                >
                  {isConnecting ? (
                    <>
                      <Loader2 aria-hidden className="size-4 animate-spin" />
                      <span>Waiting for your wallet…</span>
                    </>
                  ) : (
                    <>
                      <Wallet aria-hidden className="size-4" />
                      <span>Connect extension</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab("phrase")}
                  className={`${secondaryButtonClass} h-10 w-full px-5 text-sm`}
                >
                  <Key aria-hidden className="size-3.5" />
                  <span>Use a recovery phrase instead</span>
                </button>
              )}
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-(--ed-border) bg-(--ed-bg) p-3 text-xs leading-6 text-(--ed-muted)">
              <Globe aria-hidden className="mt-0.5 size-4 shrink-0 text-(--ed-muted)" />
              <p>
                Your keys stay in the extension on your device. Only public addresses are shared
                with NS CAPTURES.
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
                <label className={`flex items-center gap-1.5 ${monoLabelClass}`}>
                  <span>Your phrase</span>
                  <span className="normal-case">(12 or 24 words)</span>
                </label>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="inline-flex items-center gap-1 text-xs font-medium text-(--ed-primary) hover:underline"
                  >
                    <ClipboardPaste aria-hidden className="size-3" />
                    <span>Paste</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPhrase(!showPhrase)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-(--ed-muted) hover:text-(--ed-text)"
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
                  className={`w-full resize-none rounded-xl border bg-(--ed-bg) p-3 font-mono text-xs text-(--ed-text) transition-[border-color] placeholder:text-(--ed-muted)/40 focus:outline-none ${
                    validation.valid
                      ? "border-(--ed-positive)"
                      : phraseInput.trim() && validation.errorMessage
                        ? "border-(--ed-warning)"
                        : "border-(--ed-border) focus:border-(--ed-primary)"
                  }`}
                />
              </div>

              {/* Word Count & Status Feedback */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-xs ${
                      validation.valid
                        ? "border-(--ed-positive)/40 bg-(--ed-positive)/10 text-(--ed-text)"
                        : validation.wordCount > 0
                          ? "border-(--ed-warning)/40 bg-(--ed-warning)/10 text-(--ed-text)"
                          : "border-(--ed-border) bg-(--ed-bg) text-(--ed-muted)"
                    }`}
                  >
                    {validation.valid ? (
                      <CheckCircle2 aria-hidden className="size-3 text-(--ed-positive)" />
                    ) : (
                      <span aria-hidden className="size-1.5 rounded-full bg-(--ed-warning)" />
                    )}
                    <span>
                      {validation.wordCount} {validation.wordCount === 1 ? "word" : "words"}
                    </span>
                  </span>

                  {validation.valid && (
                    <span className="font-mono text-xs text-(--ed-positive)">Checksum valid</span>
                  )}
                </div>

                {phraseInput.trim() && (
                  <button
                    type="button"
                    onClick={() => setPhraseInput("")}
                    className="text-xs text-(--ed-muted) transition-colors hover:text-(--ed-text)"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Validation Error Message */}
              {phraseInput.trim() && !validation.valid && validation.errorMessage && (
                <div className="flex items-start gap-2 rounded-xl border border-(--ed-warning)/30 bg-(--ed-warning)/10 p-2.5 text-xs text-(--ed-text)">
                  <AlertCircle
                    aria-hidden
                    className="mt-0.5 size-3.5 shrink-0 text-(--ed-warning)"
                  />
                  <span className="leading-snug">{validation.errorMessage}</span>
                </div>
              )}
            </div>

            {/* Live Address Preview */}
            {previewWallet && (
              <div className="mt-5 space-y-2.5 border-t border-(--ed-divider) pt-4">
                <div className="flex items-center justify-between gap-3">
                  <span className={`flex items-center gap-1.5 ${monoLabelClass}`}>
                    <CheckCircle2 aria-hidden className="size-3.5 text-(--ed-positive)" />
                    Your addresses
                  </span>
                  <span className={monoLabelClass}>Mainnet</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-(--ed-border) bg-(--ed-bg) p-2.5">
                    <p className="mb-0.5 font-mono text-xs uppercase leading-[15px] text-(--ed-muted)">
                      TRON (USDT TRC-20)
                    </p>
                    <p className="truncate font-mono text-xs text-(--ed-text)">
                      {previewWallet.addresses.tron}
                    </p>
                  </div>

                  <div className="rounded-xl border border-(--ed-border) bg-(--ed-bg) p-2.5">
                    <p className="mb-0.5 font-mono text-xs uppercase leading-[15px] text-(--ed-muted)">
                      Ethereum / EVM (0x)
                    </p>
                    <p className="truncate font-mono text-xs text-(--ed-text)">
                      {previewWallet.addresses.evm}
                    </p>
                  </div>

                  <div className="rounded-xl border border-(--ed-border) bg-(--ed-bg) p-2.5">
                    <p className="mb-0.5 font-mono text-xs uppercase leading-[15px] text-(--ed-muted)">
                      Bitcoin Native SegWit
                    </p>
                    <p className="truncate font-mono text-xs text-(--ed-text)">
                      {previewWallet.addresses.btc}
                    </p>
                  </div>

                  <div className="rounded-xl border border-(--ed-border) bg-(--ed-bg) p-2.5">
                    <p className="mb-0.5 font-mono text-xs uppercase leading-[15px] text-(--ed-muted)">
                      Solana (SOL & SPL)
                    </p>
                    <p className="truncate font-mono text-xs text-(--ed-text)">
                      {previewWallet.addresses.solana}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Security Advisory */}
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-(--ed-border) bg-(--ed-bg) p-3 text-xs leading-6 text-(--ed-muted)">
              <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-(--ed-muted)" />
              <p>
                Your phrase is linked to your settlement profile. Balances update automatically from
                public blockchain nodes.
              </p>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-(--ed-divider) pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-(--ed-muted) transition-colors hover:text-(--ed-text)"
          >
            Cancel
          </button>
          {/* The extension and vault tabs already carry their action in the panel above,
              so the footer only offers it for the phrase flow */}
          {activeTab !== "phrase" ? null : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={!validation.valid || isConnecting}
              className={`${primaryButtonClass} h-10 px-6 text-sm`}
            >
              {isConnecting ? (
                <>
                  <Loader2 aria-hidden className="size-3.5 animate-spin" />
                  <span>Connecting…</span>
                </>
              ) : (
                <>
                  <span>Connect wallet</span>
                  <ArrowRight aria-hidden className="size-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
