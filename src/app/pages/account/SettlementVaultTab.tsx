import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router";
import {
  ShieldCheck,
  Wallet,
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
  ArrowUpRight,
  Mail,
  ArrowRightLeft,
  Sparkles,
  FileText,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import {
  fetchCreatorWeb3Vault,
  saveCreatorMultiChainWallet,
  fetchPayoutRequests,
  withdrawableFrom,
  type CryptoWalletEntry,
  type CreatorWeb3Vault,
} from "../../data/db";
import { generateMultiChainWallet } from "../../../lib/cryptoWallet";
import {
  fetchMultiChainVaultBalances,
  getExplorerUrl,
  type MultiChainVaultBalance,
} from "../../../lib/onChainBalance";
import { CryptoQrCodeModal } from "../../components/CryptoQrCodeModal";
import { ConnectWalletModal } from "../../components/ConnectWalletModal";
import { TransferCryptoModal } from "../../components/TransferCryptoModal";
import { ConvertBalanceModal } from "../../components/ConvertBalanceModal";
import { CertificateOfAuthenticityModal } from "../../components/CertificateOfAuthenticityModal";
import {
  getStoredEditions,
  getStoredOwnerships,
  isEditionsPublic,
  type DigitalEdition,
  type EditionOwnership,
} from "../../data/editions";
import {
  sendCryptoDepositNotification,
  sendCryptoWithdrawalNotification,
} from "../../../lib/email";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../components/ui/accordion";
import { copyToClipboard } from "../../../lib/clipboard";
import { groupWalletsByAsset } from "../../../lib/walletGroups";

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

  // Transfer / Withdraw Modal State
  const [transferModal, setTransferModal] = useState<{
    isOpen: boolean;
    coin: string;
    network: string;
  }>({
    isOpen: false,
    coin: "USDT",
    network: "TRC20",
  });

  const [vaultData, setVaultData] = useState<CreatorWeb3Vault | null>(null);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [availableWeb2Balance, setAvailableWeb2Balance] = useState<number>(0);

  // Digital Editions Collection State
  const [selectedCert, setSelectedCert] = useState<{
    edition: DigitalEdition;
    ownership: EditionOwnership;
  } | null>(null);
  const allEditions = useMemo(() => getStoredEditions(), []);
  const allOwnerships = useMemo(() => getStoredOwnerships(), []);
  const userOwnerships = useMemo(() => {
    return allOwnerships.filter(
      (o) =>
        (user?.id && o.ownerId === user.id) ||
        (user?.email && o.ownerEmail === user.email) ||
        o.ownerName === user?.name,
    );
  }, [allOwnerships, user]);

  const photographerTargetId = user?.slug || user?.id || "";

  // Check and notify user of incoming on-chain deposits
  const checkAndNotifyDeposits = useCallback(
    (balances: MultiChainVaultBalance) => {
      if (!balances?.assets || typeof window === "undefined") return;
      const targetEmail = user?.email;
      if (!targetEmail) return;

      for (const asset of balances.assets) {
        if (asset.balance > 0) {
          const cacheKey = `ns_notified_deposit_${asset.coin}_${asset.network}_${asset.address}`;
          const lastNotified = parseFloat(localStorage.getItem(cacheKey) || "0");
          if (asset.balance > lastNotified) {
            localStorage.setItem(cacheKey, asset.balance.toString());
            sendCryptoDepositNotification({
              to: targetEmail,
              userName: user?.name || "Collector",
              coin: asset.coin,
              network: asset.network,
              amount: asset.balanceFormatted,
              fiatValue: `£${(asset.fiatGbp || 0).toFixed(2)}`,
              vaultAddress: asset.address,
            }).catch((e) => console.error("Deposit alert failed:", e));
          }
        }
      }
    },
    [user?.email, user?.name],
  );

  const loadVault = useCallback(async () => {
    if (!photographerTargetId) return;
    try {
      setLoading(true);

      // 1. Fetch dedicated Web3 vault (completely independent of payout withdrawal methods)
      const vault = await fetchCreatorWeb3Vault(photographerTargetId);

      let existingWallets: CryptoWalletEntry[] = [];
      let phrase: string | null = null;

      if (vault) {
        setVaultData(vault);
        if (Array.isArray(vault.wallets) && vault.wallets.length > 0) {
          existingWallets = vault.wallets;
        }
        if (typeof vault.recoveryPhrase === "string") {
          phrase = vault.recoveryPhrase;
        }
        setIsUserConnected(Boolean(vault.isUserConnected));
        setConnectedAt(vault.connectedAt || vault.updatedAt || null);
      } else {
        setVaultData(null);
      }

      // Check payout requests for available earnings
      const payoutReqs = await fetchPayoutRequests(photographerTargetId);
      const netAvailable = withdrawableFrom(user?.payoutBalance ?? 0, payoutReqs);
      setAvailableWeb2Balance(netAvailable);

      setWallets(existingWallets);
      setRecoveryPhrase(phrase);

      // 2. Query initial on-chain balances if wallets exist
      if (existingWallets.length > 0) {
        const balances = await fetchMultiChainVaultBalances(existingWallets, {
          tokenBalances: vault?.tokenBalances,
        });
        setVaultBalance(balances);
        checkAndNotifyDeposits(balances);
      }
    } catch (err: any) {
      console.error("Error loading settlement vault:", err);
    } finally {
      setLoading(false);
    }
  }, [photographerTargetId, checkAndNotifyDeposits, user]);

  useEffect(() => {
    loadVault();
  }, [loadVault]);

  // Refresh live balances
  const handleRefreshBalances = async () => {
    if (wallets.length === 0) return;
    setRefreshing(true);
    try {
      const balances = await fetchMultiChainVaultBalances(wallets, {
        tokenBalances: vaultData?.tokenBalances,
      });
      setVaultBalance(balances);
      checkAndNotifyDeposits(balances);
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
      fetchMultiChainVaultBalances(wallets, {
        tokenBalances: vaultData?.tokenBalances,
      })
        .then((b) => {
          setVaultBalance(b);
          checkAndNotifyDeposits(b);
        })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [wallets, checkAndNotifyDeposits, vaultData?.tokenBalances]);

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
          tokenBalances: vaultData?.tokenBalances,
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
      tokenBalances: vaultData?.tokenBalances,
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
  const EXCLUDED_NETWORKS = ["ARBITRUM", "BEP20", "POLYGON", "BASE", "OPTIMISM", "AVALANCHE"];
  // Filter out unlaunched NSC and redundant L2/sidechain networks to focus on Bitcoin, Ethereum, TRON, and Solana
  const visibleWallets = wallets.filter(
    (w) => w.coin.toUpperCase() !== "NSC" && !EXCLUDED_NETWORKS.includes(w.network.toUpperCase()),
  );
  const groupedWallets = groupWalletsByAsset(visibleWallets);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ececec]/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#f5f7f5] text-[#1e4a3f] text-xs font-semibold border border-[#dfe7e1]">
              <ShieldCheck className="size-3.5" />
              Self-custody vault
            </span>
          </div>
          <h1 className="text-2xl font-serif text-[#18211f] font-normal tracking-tight">Web3</h1>
          <p className="text-xs text-[#758078] mt-1 max-w-xl">
            Multi-chain treasury access with direct settlement routes, on-chain balances, and
            recoverable wallet infrastructure.
          </p>
        </div>

        {hasVault && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setTransferModal({
                  isOpen: true,
                  coin: "USDT",
                  network: "TRC20",
                })
              }
              className="inline-flex items-center gap-1.5 rounded-full bg-[#18211f] px-4 py-2 text-xs font-semibold text-white hover:bg-[#12231f] transition cursor-pointer"
            >
              <ArrowUpRight className="size-3.5 text-emerald-400" />
              <span>Transfer / Withdraw</span>
            </button>

            <button
              type="button"
              onClick={handleRefreshBalances}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#dce8df] px-4 py-2 text-xs font-medium text-[#18211f] hover:bg-[#FAF9F5] transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`size-3.5 text-[#1e4a3f] ${refreshing ? "animate-spin" : ""}`}
              />
              <span>{refreshing ? "Synchronizing..." : "Refresh Balances"}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsConnectModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#dce8df] px-4 py-2 text-xs font-medium text-[#18211f] hover:bg-[#FAF9F5] transition cursor-pointer"
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
              className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF9F5] border border-[#dce8df] px-3.5 py-2 text-xs font-medium text-[#758078] hover:text-[#18211f] hover:bg-white transition cursor-pointer disabled:opacity-50"
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
        <div className="rounded-2xl border border-[#dce8df] bg-[#FAF9F5] p-8 sm:p-10 text-center space-y-6 max-w-xl mx-auto">
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
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#18211f] px-6 py-3 text-xs font-medium text-white hover:bg-[#12231f] transition cursor-pointer"
            >
              <Link2 className="size-4" />
              <span>Connect Your Own Wallet</span>
            </button>

            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerateVault}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white border border-[#dce8df] px-6 py-3 text-xs font-medium text-[#18211f] hover:bg-[#FAF9F5] transition cursor-pointer disabled:opacity-50"
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
            <div className="md:col-span-2 rounded-2xl border border-[#ececec] bg-white p-6 flex flex-col justify-between min-h-[160px]">
              <div className="flex items-start justify-between gap-3">
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
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dce8df] bg-[#f5f7f5] px-3 py-1 text-xs font-medium text-[#1e4a3f]">
                  <span className="size-2 rounded-full bg-[#1e4a3f]/70" />
                  On-chain synced
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#ececec] pt-4 text-xs text-[#5f6762]">
                <div className="flex items-center gap-2">
                  <Coins className="size-3.5 text-[#1e4a3f]" />
                  <span>{visibleWallets.length} Active Deposit Channels</span>
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
            <div className="rounded-2xl border border-[#ececec] bg-[#fafaf8] p-6 flex flex-col justify-between">
              <div>
                <p className="text-[11px] uppercase font-mono tracking-wider text-[#758078]">
                  Digital Asset Routing
                </p>
                <h4 className="text-base font-semibold text-[#18211f] mt-1">
                  {vaultBalance?.isLive ? "On-Chain Active" : "Ready for Inflow"}
                </h4>
                <p className="text-xs text-[#758078] mt-1 leading-relaxed">
                  Deposit any supported cryptocurrency to fund or settle creator royalties directly
                  on-chain. All blockchain balances are verified live.
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

          {/* NSC Native Platform Token Card is hidden for now until token deployment is finalized */}

          {/* Master 12-Word Recovery Phrase Card */}
          {recoveryPhrase && (
            <div className="rounded-2xl border border-[#dce8df] bg-white p-5 space-y-3">
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e4a3f] text-white text-xs font-semibold hover:bg-[#163830] transition cursor-pointer"
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
                        className="flex items-center gap-1.5 bg-white border border-[#dce8df] rounded-xl px-3 py-2 text-xs font-mono"
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

            <Accordion type="single" collapsible className="space-y-3">
              {groupedWallets.map((group) => {
                const totalAddresses = group.networks.reduce(
                  (sum, networkGroup) => sum + networkGroup.addresses.length,
                  0,
                );
                const assetData = vaultBalance?.assets.find(
                  (a) => a.coin === group.coin && a.network === group.networks[0]?.network,
                );

                return (
                  <AccordionItem
                    key={group.coin}
                    value={group.coin}
                    className="overflow-hidden rounded-2xl border border-[#ececec] bg-white"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-[#fafcfb]">
                      <div className="flex w-full items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid size-10 place-items-center rounded-xl bg-[#FAF9F5] border border-[#dce8df] text-xs font-bold text-[#18211f]">
                            {group.coin}
                          </div>
                          <div className="min-w-0 text-left">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-[#18211f]">{group.coin}</span>
                              <span className="rounded-full border border-[#dce8df] bg-[#FAF9F5] px-2 py-0.5 text-[10px] font-mono font-semibold text-[#18211f]">
                                {group.networks.length} network
                                {group.networks.length > 1 ? "s" : ""}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#758078] mt-0.5">
                              {totalAddresses} address{totalAddresses > 1 ? "es" : ""} across
                              supported networks
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-xs font-bold font-mono text-[#18211f]">
                            {assetData?.balanceFormatted || "0.00"} {group.coin}
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
                    </AccordionTrigger>

                    <AccordionContent className="border-t border-[#ececec] bg-[#fafcfb] px-4 pb-4 pt-3">
                      <div className="space-y-3">
                        {group.networks.map((networkGroup) => (
                          <div
                            key={`${group.coin}-${networkGroup.network}`}
                            className="rounded-xl border border-[#dce8df] bg-white p-3"
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#758078]">
                                {networkGroup.network}
                              </span>
                              <span className="text-[10px] font-mono text-[#758078]">
                                {networkGroup.addresses.length} address
                                {networkGroup.addresses.length > 1 ? "es" : ""}
                              </span>
                            </div>

                            <div className="space-y-2">
                              {networkGroup.addresses.map((address, networkIndex) => {
                                const wallet = wallets.find(
                                  (w) =>
                                    w.coin === group.coin &&
                                    w.network === networkGroup.network &&
                                    w.address === address,
                                );
                                if (!wallet) return null;

                                const explorerUrl = getExplorerUrl(
                                  wallet.coin,
                                  wallet.network,
                                  wallet.address,
                                );
                                const assetDataForWallet = vaultBalance?.assets.find(
                                  (a) => a.coin === wallet.coin && a.network === wallet.network,
                                );
                                const walletIndex = wallets.findIndex(
                                  (w) =>
                                    w.coin === wallet.coin &&
                                    w.network === wallet.network &&
                                    w.address === wallet.address,
                                );

                                return (
                                  <div
                                    key={`${wallet.coin}-${wallet.network}-${wallet.address}`}
                                    className="flex items-center justify-between gap-2 rounded-lg border border-[#ececec] bg-[#FAF9F5] px-2.5 py-2"
                                  >
                                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-[#18211f] select-all">
                                      {address}
                                    </span>
                                    <div className="flex shrink-0 items-center gap-1.5">
                                      <span className="hidden text-[10px] font-mono text-[#758078] md:inline-block">
                                        {assetDataForWallet?.balanceFormatted || "0.00"}{" "}
                                        {wallet.coin}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setTransferModal({
                                            isOpen: true,
                                            coin: wallet.coin,
                                            network: wallet.network,
                                          })
                                        }
                                        className="rounded-lg border border-[#dce8df] bg-white p-1.5 text-[#1e4a3f] transition hover:bg-[#f8f8f8]"
                                        title="Transfer / Withdraw"
                                      >
                                        <ArrowUpRight className="size-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setQrModal({
                                            isOpen: true,
                                            coin: wallet.coin,
                                            network: wallet.network,
                                            address: wallet.address,
                                          })
                                        }
                                        className="rounded-lg border border-[#dce8df] bg-white p-1.5 text-[#18211f] transition hover:bg-[#f8f8f8]"
                                        title="Scan QR"
                                      >
                                        <QrCode className="size-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleCopyAddress(wallet.address, walletIndex)
                                        }
                                        className="rounded-lg border border-[#dce8df] bg-white p-1.5 text-[#18211f] transition hover:bg-[#f8f8f8]"
                                        title="Copy address"
                                      >
                                        {copiedIndex === walletIndex ? (
                                          <Check className="size-3.5 text-emerald-600" />
                                        ) : (
                                          <Copy className="size-3.5" />
                                        )}
                                      </button>
                                      <a
                                        href={explorerUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-lg border border-[#dce8df] bg-white p-1.5 text-[#18211f] transition hover:bg-[#f8f8f8]"
                                        title="View on explorer"
                                      >
                                        <ExternalLink className="size-3.5" />
                                      </a>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>

          {/* Digital Editions & Fine-Art Collection */}
          <div className="space-y-4 pt-6 border-t border-[#ececec]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#18211f]">
                    Fine-Art Digital Editions & Provenance
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-[#d4af37]/15 text-[#8a6b10] text-[10px] font-mono font-bold uppercase">
                    Digital Provenance
                  </span>
                </div>
                <p className="text-xs text-[#758078]">
                  Photographic masterworks, certificates of authenticity, and verified edition
                  ownership.
                </p>
              </div>
              <Link
                to={isEditionsPublic() || user?.role === "Admin" ? "/editions" : "/explore"}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#dce8df] bg-white text-xs font-semibold text-[#1e4a3f] hover:bg-[#FAF9F5] transition self-start sm:self-auto"
              >
                <span>{isEditionsPublic() || user?.role === "Admin" ? "The Editions Room" : "Explore Gallery"}</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {/* Collection Cards */}
            {userOwnerships.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-[#dce8df] bg-[#FAF9F5] space-y-2.5">
                <Sparkles className="size-6 text-[#8a6b10] mx-auto opacity-70" />
                <h4 className="font-serif text-sm font-semibold text-[#18211f]">
                  No Digital Editions Collected Yet
                </h4>
                <p className="text-xs text-[#758078] max-w-sm mx-auto">
                  Acquire limited photographic editions and genesis masterworks with cryptographic
                  Certificates of Authenticity.
                </p>
                <div className="pt-2">
                  <Link
                    to={isEditionsPublic() || user?.role === "Admin" ? "/editions" : "/explore"}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1e4a3f] text-white text-xs font-semibold hover:bg-[#163830] transition shadow-sm"
                  >
                    <span>{isEditionsPublic() || user?.role === "Admin" ? "Explore Curated Editions" : "Explore Stock Photography"}</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {userOwnerships.map((own) => {
                  const ed = allEditions.find((e) => e.id === own.editionId);
                  if (!ed) return null;
                  return (
                    <div
                      key={own.id}
                      className="p-4 rounded-2xl border border-[#ececec] bg-white flex gap-4 items-center shadow-sm hover:border-[#1e4a3f]/40 transition"
                    >
                      <img
                        src={ed.image}
                        alt={ed.title}
                        className="size-20 rounded-xl object-cover border border-[#ececec]"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1e4a3f]/10 text-[#1e4a3f] font-semibold">
                          {own.serialDisplay}
                        </span>
                        <h4 className="font-serif text-sm font-semibold text-[#18211f] truncate">
                          {ed.title}
                        </h4>
                        <p className="text-xs text-[#758078]">Artist: {ed.photographerName}</p>
                        <button
                          onClick={() => setSelectedCert({ edition: ed, ownership: own })}
                          className="text-xs text-[#1e4a3f] font-semibold hover:underline flex items-center gap-1 pt-0.5 cursor-pointer"
                        >
                          <FileText className="size-3.5" />
                          <span>View Certificate (COA)</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Certificate of Authenticity Modal */}
      {selectedCert && (
        <CertificateOfAuthenticityModal
          edition={selectedCert.edition}
          ownership={selectedCert.ownership}
          onClose={() => setSelectedCert(null)}
        />
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

      {/* Transfer / Withdraw Crypto Modal */}
      <TransferCryptoModal
        isOpen={transferModal.isOpen}
        onClose={() => setTransferModal((prev) => ({ ...prev, isOpen: false }))}
        wallets={wallets}
        vaultBalance={vaultBalance}
        targetId={photographerTargetId}
        initialCoin={transferModal.coin}
        initialNetwork={transferModal.network}
        userEmail={user?.email || ""}
        userName={user?.name || "Collector"}
        recoveryPhrase={recoveryPhrase}
        onTransferCompleted={() => {
          handleRefreshBalances();
        }}
      />

      {/* Convert Web2 to NSC Modal */}
      <ConvertBalanceModal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        availableWeb2Balance={availableWeb2Balance}
        targetId={photographerTargetId}
        userName={user?.name || "Collector"}
        userEmail={user?.email || ""}
        vaultEvmAddress={wallets.find((w) => w.coin === "ETH" || w.coin === "NSC")?.address}
        onConverted={() => {
          loadVault();
        }}
      />
    </div>
  );
}
