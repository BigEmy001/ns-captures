import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Sparkles,
  Flame,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  QrCode,
  Loader2,
  AlertCircle,
  TrendingUp,
  Info,
  Wallet,
  Building2,
  ClipboardPaste,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useEditionVault } from "./editions/useEditionVault";
import {
  getPresaleConfig,
  getPresaleMetrics,
  executePresaleSwap,
  executePresaleDirectPayment,
  getTreasuryWalletForCoin,
  type NscPresaleOrder,
} from "../data/editions";
import { CryptoQrCodeModal } from "./CryptoQrCodeModal";
import { generateQrSvg } from "../../lib/qrcode";
import { fetchTronTrxBalance } from "../../lib/onChainBalance";

interface PresaleBuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (order: NscPresaleOrder) => void;
}

const SUPPORTED_COINS: Array<{
  coin: "ETH" | "USDT" | "TRX" | "USDC" | "SOL" | "BTC";
  name: string;
  network: string;
  badge: string;
  color: string;
  iconSymbol: string;
  rateUsd: number;
}> = [
  {
    coin: "ETH",
    name: "Ethereum",
    network: "Base / ERC20",
    badge: "Primary • 0 Extra Gas",
    color: "#627EEA",
    iconSymbol: "⟠",
    rateUsd: 3450.0,
  },
  {
    coin: "USDT",
    name: "Tether USD",
    network: "TRC20 / ERC20",
    badge: "Most Popular",
    color: "#26A17B",
    iconSymbol: "₮",
    rateUsd: 1.0,
  },
  {
    coin: "TRX",
    name: "TRON",
    network: "TRC20",
    badge: "Native Gas",
    color: "#EB0029",
    iconSymbol: "TRX",
    rateUsd: 0.25,
  },
  {
    coin: "USDC",
    name: "USD Coin",
    network: "Base / ERC20",
    badge: "Instant",
    color: "#2775CA",
    iconSymbol: "$",
    rateUsd: 1.0,
  },
  {
    coin: "SOL",
    name: "Solana",
    network: "Solana SPL",
    badge: "Fast & Low Fee",
    color: "#14F195",
    iconSymbol: "◎",
    rateUsd: 145.0,
  },
  {
    coin: "BTC",
    name: "Bitcoin",
    network: "Native SegWit",
    badge: "Archival",
    color: "#F7931A",
    iconSymbol: "₿",
    rateUsd: 64500.0,
  },
];

export function PresaleBuyModal({ isOpen, onClose, onSuccess }: PresaleBuyModalProps) {
  const { user } = useAuth();
  const { wallets, balances, refresh: refreshVault } = useEditionVault();

  // Mode: "direct_treasury" (Primary/Recommended) vs "vault_swap" (Internal balance)
  const [paymentMode, setPaymentMode] = useState<"direct_treasury" | "vault_swap">(
    "direct_treasury",
  );
  const [selectedCoin, setSelectedCoin] = useState<"ETH" | "USDT" | "USDC" | "SOL" | "BTC" | "TRX">(
    "ETH",
  );
  const [payAmount, setPayAmount] = useState<string>("");
  const [txHashInput, setTxHashInput] = useState<string>("");
  const [showInlineQr, setShowInlineQr] = useState<boolean>(false);
  const [copiedTreasury, setCopiedTreasury] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<NscPresaleOrder | null>(null);
  const [depositQrModalOpen, setDepositQrModalOpen] = useState(false);
  const [depositModalCoin, setDepositModalCoin] = useState<string>("ETH");
  const [depositModalNetwork, setDepositModalNetwork] = useState<string>("ERC20");
  const [depositModalAddress, setDepositModalAddress] = useState<string>("");
  const [copiedUserTron, setCopiedUserTron] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);
  const [tronTrxBalance, setTronTrxBalance] = useState<number | null>(null);
  const [isCheckingTrx, setIsCheckingTrx] = useState<boolean>(false);

  const presaleConfig = getPresaleConfig();
  const presaleMetrics = getPresaleMetrics();

  const activeCoinMeta = useMemo(
    () => SUPPORTED_COINS.find((c) => c.coin === selectedCoin) || SUPPORTED_COINS[0],
    [selectedCoin],
  );

  // Determine user's current vault balance in the selected coin
  const userVaultCoinBalance = useMemo(() => {
    if (selectedCoin === "TRX") {
      if (typeof tronTrxBalance === "number") return tronTrxBalance;
      return balances?.assets.find((a) => a.coin === "TRX")?.balance || 0;
    }
    if (!balances?.assets) return 0;
    if (selectedCoin === "USDT") {
      const trc =
        balances.assets.find((a) => a.coin === "USDT" && a.network.includes("TRC"))?.balance || 0;
      const erc =
        balances.assets.find((a) => a.coin === "USDT" && !a.network.includes("TRC"))?.balance || 0;
      return trc > 0 ? trc : erc;
    }
    return balances.assets.find((a) => a.coin === selectedCoin)?.balance || 0;
  }, [balances, selectedCoin, tronTrxBalance]);

  // Find user's vault address for selected coin for deposit instructions
  const userVaultAddress = useMemo(() => {
    if (selectedCoin === "USDT" || selectedCoin === "TRX") {
      return (
        wallets.find((w) => w.network.includes("TRC") || w.coin === "TRX")?.address ||
        wallets.find((w) => w.coin === "ETH" || w.network === "ERC20")?.address ||
        ""
      );
    }
    if (selectedCoin === "ETH" || selectedCoin === "USDC") {
      return (
        wallets.find((w) => w.coin === "ETH" || w.network === "ERC20" || w.network === "Base")
          ?.address || ""
      );
    }
    if (selectedCoin === "SOL") {
      return wallets.find((w) => w.coin === "SOL" || w.network === "Solana")?.address || "";
    }
    if (selectedCoin === "BTC") {
      return wallets.find((w) => w.coin === "BTC" || w.network.includes("Bitcoin"))?.address || "";
    }
    return "";
  }, [wallets, selectedCoin]);

  // User's Tron address (for checking native TRX energy balance)
  const userTronAddress = useMemo(() => {
    const trcWallet = wallets.find(
      (w) =>
        w.network?.includes("TRC") ||
        (w.coin === "USDT" && w.address?.startsWith("T")) ||
        (w.coin === "TRX" && w.address?.startsWith("T")),
    );
    if (trcWallet?.address) return trcWallet.address;
    if (userVaultAddress?.startsWith("T")) return userVaultAddress;
    return "";
  }, [wallets, userVaultAddress]);

  // Check live TRX balance on Tron when modal opens and Tron address is present
  useEffect(() => {
    let isMounted = true;
    if (isOpen && userTronAddress) {
      setIsCheckingTrx(true);
      fetchTronTrxBalance(userTronAddress)
        .then((trx) => {
          if (isMounted) setTronTrxBalance(trx);
        })
        .catch(() => {
          if (isMounted) setTronTrxBalance(0);
        })
        .finally(() => {
          if (isMounted) setIsCheckingTrx(false);
        });
    } else if (!isOpen) {
      setTronTrxBalance(null);
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, userTronAddress]);

  // Option B: Warn if user has USDT in vault but < 15 TRX in their self-custodied Tron address
  const hasZeroTrxOnTron = useMemo(() => {
    if (selectedCoin !== "USDT" || !userTronAddress) return false;
    if (userVaultCoinBalance > 0 && tronTrxBalance !== null && tronTrxBalance < 15) {
      return true;
    }
    return false;
  }, [selectedCoin, userTronAddress, userVaultCoinBalance, tronTrxBalance]);

  const treasuryWallet = useMemo(
    () => getTreasuryWalletForCoin(selectedCoin, activeCoinMeta.network),
    [selectedCoin, activeCoinMeta.network],
  );

  // Generate inline QR SVG for treasury address
  const treasuryQrSvg = useMemo(() => {
    if (!treasuryWallet?.address) return "";
    try {
      return generateQrSvg(treasuryWallet.address, { margin: 2 });
    } catch {
      return "";
    }
  }, [treasuryWallet]);

  // Gas education micro-copy tailored by coin
  const gasAdvice = useMemo(() => {
    if (selectedCoin === "USDT") {
      return {
        badge: "Zero TRX on Exchanges",
        text: "Sending from Binance, Bybit, or OKX? The exchange pays the network fee automatically in USDT (zero TRX required). If sending from a self-custody wallet, ensure you have ~15 TRX for network energy.",
      };
    }
    if (selectedCoin === "TRX") {
      return {
        badge: "TRON Native Coin",
        text: "Send native TRX directly to the platform treasury ($0.25 USD / 0.25 NSC per TRX). Settles in ~3 seconds on TRON.",
      };
    }
    if (selectedCoin === "USDC" || selectedCoin === "ETH") {
      return {
        badge: "EVM Network",
        text: "Direct transfer on Base or Ethereum (ERC-20). Minimal network gas applies.",
      };
    }
    if (selectedCoin === "SOL") {
      return {
        badge: "Solana SPL",
        text: "Near-zero network fees ($0.001) and settles within 3 seconds.",
      };
    }
    return {
      badge: "Bitcoin Native",
      text: "Send Native SegWit Bitcoin directly to treasury address. Standard confirmation applies.",
    };
  }, [selectedCoin]);

  const parsedAmount = parseFloat(payAmount) || 0;
  const fiatValueUsd = Number((parsedAmount * activeCoinMeta.rateUsd).toFixed(2));
  const nscToReceive = Number((fiatValueUsd / presaleConfig.priceUsd).toFixed(2));
  const isInsufficientVault = parsedAmount > userVaultCoinBalance;

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setCompletedOrder(null);
      setPayAmount("");
      setTxHashInput("");
      setShowInlineQr(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyTreasury = async () => {
    try {
      await navigator.clipboard.writeText(treasuryWallet.address);
      setCopiedTreasury(true);
      toast.success("Platform Treasury address copied to clipboard");
      setTimeout(() => setCopiedTreasury(false), 2000);
    } catch {
      toast.error("Failed to copy address");
    }
  };

  const handleCopyUserTron = async () => {
    if (!userTronAddress) return;
    try {
      await navigator.clipboard.writeText(userTronAddress);
      setCopiedUserTron(true);
      toast.success("Platform Tron vault address copied");
      setTimeout(() => setCopiedUserTron(false), 2000);
    } catch {
      toast.error("Failed to copy address");
    }
  };

  const handleOpenDepositTrx = () => {
    setDepositModalCoin("TRX");
    setDepositModalNetwork("TRC20");
    setDepositModalAddress(userTronAddress);
    setDepositQrModalOpen(true);
  };

  const handleOpenRegularDeposit = () => {
    setDepositModalCoin(selectedCoin);
    setDepositModalNetwork(activeCoinMeta.network);
    setDepositModalAddress(userVaultAddress);
    setDepositQrModalOpen(true);
  };

  const handlePasteTxHash = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setTxHashInput(text.trim());
        toast.success("Transaction hash pasted");
      }
    } catch {
      toast.error("Please paste manually into the field");
    }
  };

  const handleCopyTx = async (tx: string) => {
    try {
      await navigator.clipboard.writeText(tx);
      setCopiedTx(true);
      toast.success("Transaction hash copied");
      setTimeout(() => setCopiedTx(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleSetMaxVault = () => {
    if (userVaultCoinBalance > 0) {
      setPayAmount(userVaultCoinBalance.toString());
    } else {
      toast.error(`Your ${selectedCoin} balance is 0.00. Please deposit first.`);
    }
  };

  const handleAddPresetUsd = (usdValue: number) => {
    const coinAmount = Number((usdValue / activeCoinMeta.rateUsd).toFixed(4));
    setPayAmount(coinAmount.toString());
  };

  // Submit Direct Treasury Transfer
  const handleDirectTreasurySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to participate in the NSC Presale.");
      return;
    }

    if (parsedAmount <= 0) {
      toast.error("Please enter the amount you sent.");
      return;
    }

    if (fiatValueUsd < presaleConfig.minPurchaseUsd) {
      toast.error(`Minimum presale purchase is $${presaleConfig.minPurchaseUsd.toFixed(2)} USD.`);
      return;
    }

    if (!txHashInput.trim()) {
      toast.error("Please enter the transaction hash (TxID) from your transfer.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await executePresaleDirectPayment({
        userId: user.slug || user.id,
        userName: user.name,
        userEmail: user.email,
        coinPaid: selectedCoin,
        network: activeCoinMeta.network,
        amountPaid: parsedAmount,
        txHash: txHashInput.trim(),
      });

      if (result.success && result.order) {
        setCompletedOrder(result.order);
        refreshVault();
        toast.success(`Payment verified! +${result.nscCredited} NSC credited to your vault.`);
        if (onSuccess) onSuccess(result.order);
      } else {
        toast.error(result.error || "Failed to verify direct payment.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment submission failed";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Internal Vault Swap
  const handleVaultSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to participate in the NSC Presale.");
      return;
    }

    if (parsedAmount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    if (isInsufficientVault) {
      toast.error(
        `Insufficient ${selectedCoin} balance. Available: ${userVaultCoinBalance} ${selectedCoin}.`,
      );
      return;
    }

    // Option B Guard: Self-custody Tron address requires ~15 TRX for gas
    if (hasZeroTrxOnTron) {
      toast.error(
        "Your Tron address has 0 TRX for network gas. Please switch to Direct to Treasury or deposit ~15 TRX into your Trust Wallet.",
      );
      return;
    }

    if (fiatValueUsd < presaleConfig.minPurchaseUsd) {
      toast.error(`Minimum purchase is $${presaleConfig.minPurchaseUsd.toFixed(2)} USD.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await executePresaleSwap({
        userId: user.slug || user.id,
        userName: user.name,
        userEmail: user.email,
        coinPaid: selectedCoin,
        network: activeCoinMeta.network,
        amountPaid: parsedAmount,
        trxBalance: tronTrxBalance ?? undefined,
      });

      if (result.success && result.order) {
        setCompletedOrder(result.order);
        refreshVault();
        toast.success(
          `Successfully swapped ${parsedAmount} ${selectedCoin} for ${result.nscCredited} NSC!`,
        );
        if (onSuccess) onSuccess(result.order);
      } else {
        toast.error(result.error || "Presale swap failed.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Swap failed";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-(--ed-border) bg-(--ed-surface) p-6 shadow-2xl text-(--ed-text)">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-4 top-4 rounded-full p-2 text-(--ed-muted) transition-colors hover:bg-(--ed-hover) hover:text-(--ed-text)"
        >
          <X className="size-5" />
        </button>

        {completedOrder ? (
          /* SUCCESS CONFIRMATION RECEIPT */
          <div className="text-center py-4 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 shadow-lg">
              <CheckCircle2 className="size-9" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-mono font-medium text-emerald-500 border border-emerald-500/20">
                <Sparkles className="size-3.5" />
                Presale Swap Certified • Zero Gas
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-(--ed-text)">
                +{completedOrder.nscAmount.toLocaleString()} NSC Credited
              </h2>
              <p className="text-xs text-(--ed-muted) max-w-sm mx-auto">
                Your payment of {completedOrder.amountPaid} {completedOrder.coinPaid} has routed to
                the platform treasury. Your NSC tokens are active in your settlement vault.
              </p>
            </div>

            {/* Receipt Details Card */}
            <div className="rounded-2xl border border-(--ed-border) bg-(--ed-bg) p-4 text-left space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center text-(--ed-muted)">
                <span>Payment Route:</span>
                <span className="text-(--ed-text) font-semibold">
                  {completedOrder.paymentMethod === "direct_treasury"
                    ? "Direct Treasury Transfer"
                    : "Internal Vault Balance Swap"}
                </span>
              </div>
              <div className="flex justify-between items-center text-(--ed-muted)">
                <span>Order Reference:</span>
                <span className="text-(--ed-text) font-semibold">{completedOrder.id}</span>
              </div>
              <div className="flex justify-between items-center text-(--ed-muted)">
                <span>Tokens Received:</span>
                <span className="text-emerald-500 font-bold">
                  {completedOrder.nscAmount.toLocaleString()} NSC (1:1 Peg)
                </span>
              </div>
              <div className="flex justify-between items-center text-(--ed-muted)">
                <span>Amount Paid:</span>
                <span className="text-(--ed-text)">
                  {completedOrder.amountPaid} {completedOrder.coinPaid} ($
                  {completedOrder.fiatValueUsd.toFixed(2)} USD)
                </span>
              </div>
              <div className="flex justify-between items-center text-(--ed-muted)">
                <span>Treasury Destination:</span>
                <span className="text-(--ed-text) truncate max-w-[180px]">
                  {completedOrder.treasuryAddress}
                </span>
              </div>
              <div className="pt-2 border-t border-(--ed-divider) flex justify-between items-center text-(--ed-muted)">
                <span>Transaction Hash:</span>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-(--ed-text) truncate max-w-[160px]">
                    {completedOrder.txHash}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyTx(completedOrder.txHash)}
                    className="text-(--ed-muted) hover:text-(--ed-text) p-1 cursor-pointer"
                    title="Copy Hash"
                  >
                    {copiedTx ? (
                      <Check className="size-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setCompletedOrder(null);
                  setPayAmount("");
                  setTxHashInput("");
                }}
                className="flex-1 py-3 px-4 rounded-xl border border-(--ed-border) bg-(--ed-hover) text-xs font-medium text-(--ed-text) transition-colors hover:bg-(--ed-divider) cursor-pointer"
              >
                Buy More NSC
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-(--ed-primary) text-xs font-semibold text-white transition-opacity hover:opacity-95 cursor-pointer"
              >
                Done / View Vault
              </button>
            </div>
          </div>
        ) : (
          /* PRESALE FORM */
          <div className="space-y-4">
            {/* Header Banner */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-500 border border-amber-500/30">
                  <Flame className="size-3.5 fill-amber-500" />
                  NSC Token Presale • 1:1 Peg
                </span>
                <span className="text-xs font-mono text-(--ed-muted)">
                  Hard Cap: {presaleConfig.hardCapNsc.toLocaleString()} NSC
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-(--ed-text)">
                Acquire NSC Tokens (1:1 Rate)
              </h2>
              <p className="text-xs text-(--ed-muted) leading-relaxed">
                Direct early-bird allocation at <strong>$1.00 USD / £1.00 GBP = 1 NSC</strong>.
                Payments route securely into the verified NS CAPTURES Treasury.
              </p>
            </div>

            {/* Progress Toward 1M Hard Cap */}
            <div className="rounded-xl border border-(--ed-border) bg-(--ed-bg) p-2.5 space-y-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-(--ed-muted)">Presale Progress</span>
                <span className="font-semibold text-(--ed-text)">
                  {presaleMetrics.totalNscSold.toLocaleString()} /{" "}
                  {presaleConfig.hardCapNsc.toLocaleString()} NSC ({presaleMetrics.percentFilled}%)
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-(--ed-divider)">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 transition-all duration-500"
                  style={{ width: `${Math.max(4, presaleMetrics.percentFilled)}%` }}
                />
              </div>
            </div>

            {/* Mode Tabs: Direct to Treasury vs Vault Swap */}
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-(--ed-bg) p-1 border border-(--ed-border)">
              <button
                type="button"
                onClick={() => setPaymentMode("direct_treasury")}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  paymentMode === "direct_treasury"
                    ? "bg-(--ed-surface) text-(--ed-text) shadow-sm border border-(--ed-border)"
                    : "text-(--ed-muted) hover:text-(--ed-text)"
                }`}
              >
                <Building2 className="size-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">Direct to Treasury</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-500 font-bold hidden sm:inline-block">
                  Recommended
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode("vault_swap")}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  paymentMode === "vault_swap"
                    ? "bg-(--ed-surface) text-(--ed-text) shadow-sm border border-(--ed-border)"
                    : "text-(--ed-muted) hover:text-(--ed-text)"
                }`}
              >
                <Wallet className="size-3.5 text-amber-500 shrink-0" />
                <span className="truncate">Pay from Vault</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-500 font-bold hidden sm:inline-block">
                  0 Gas
                </span>
              </button>
            </div>

            {/* DIRECT TO TREASURY FLOW (PRIMARY) */}
            {paymentMode === "direct_treasury" ? (
              <form onSubmit={handleDirectTreasurySubmit} className="space-y-3.5">
                {/* Coin Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-(--ed-muted) block">
                    Choose Currency to Send
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {SUPPORTED_COINS.map((c) => {
                      const isSelected = selectedCoin === c.coin;
                      return (
                        <button
                          key={c.coin}
                          type="button"
                          onClick={() => {
                            setSelectedCoin(c.coin);
                            setShowInlineQr(false);
                          }}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? "border-(--ed-primary) bg-(--ed-primary)/10 text-(--ed-text) shadow-sm ring-1 ring-(--ed-primary)"
                              : "border-(--ed-border) bg-(--ed-bg) text-(--ed-muted) hover:bg-(--ed-hover) hover:text-(--ed-text)"
                          }`}
                        >
                          <span className="text-base font-bold mb-0.5" style={{ color: c.color }}>
                            {c.iconSymbol}
                          </span>
                          <span className="text-xs font-semibold">{c.coin}</span>
                          <span className="text-[10px] opacity-75 font-mono">
                            {c.coin === "USDT" || c.coin === "USDC"
                              ? "$1.00"
                              : c.coin === "TRX"
                                ? "$0.25"
                                : `$${c.rateUsd >= 1000 ? (c.rateUsd / 1000).toFixed(1) + "k" : c.rateUsd}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Treasury Destination Card */}
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-(--ed-text) flex items-center gap-1.5">
                      <ShieldCheck className="size-4 text-emerald-500" />
                      NS CAPTURES Treasury Destination ({treasuryWallet.network})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowInlineQr((prev) => !prev)}
                      className="text-[11px] font-mono text-emerald-500 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <QrCode className="size-3" />
                      {showInlineQr ? "Hide QR" : "Show QR"}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-xl bg-(--ed-bg) border border-(--ed-border) font-mono">
                    <span className="text-[11px] text-(--ed-text) break-all flex-1 select-all">
                      {treasuryWallet.address}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyTreasury}
                      className="px-2 py-1 rounded bg-(--ed-surface) hover:bg-(--ed-hover) border border-(--ed-border) text-xs font-semibold text-(--ed-text) shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedTreasury ? (
                        <>
                          <Check className="size-3 text-emerald-500" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Inline QR SVG Preview */}
                  {showInlineQr && treasuryQrSvg && (
                    <div className="text-center py-2 space-y-1 animate-in zoom-in-95 duration-150">
                      <div
                        className="inline-block p-2 rounded-xl bg-white shadow border border-[#eee]"
                        dangerouslySetInnerHTML={{ __html: treasuryQrSvg }}
                      />
                      <p className="text-[10px] text-(--ed-muted)">
                        Scan with Binance, Bybit, or mobile wallet app
                      </p>
                    </div>
                  )}

                  {/* Gas Advice Banner */}
                  <div className="flex items-start gap-1.5 text-[11px] text-(--ed-muted) pt-1 border-t border-emerald-500/20">
                    <Info className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="leading-snug">
                      <strong className="text-(--ed-text)">{gasAdvice.badge}:</strong>{" "}
                      {gasAdvice.text}
                    </p>
                  </div>
                </div>

                {/* Amount to Send */}
                <div className="rounded-2xl border border-(--ed-border) bg-(--ed-bg) p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-(--ed-muted)">Amount You Sent ({selectedCoin})</span>
                    <span className="text-[11px] text-emerald-500 font-mono font-semibold">
                      Receives: +{nscToReceive.toLocaleString()} NSC
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="w-full bg-transparent text-2xl font-bold font-mono text-(--ed-text) placeholder:text-(--ed-muted)/40 focus:outline-none"
                    />
                    <span className="font-mono text-sm font-semibold px-2.5 py-1 rounded-lg bg-(--ed-surface) border border-(--ed-border)">
                      {selectedCoin}
                    </span>
                  </div>

                  {/* Assigned USDT Value indicator */}
                  {selectedCoin !== "USDT" && parsedAmount > 0 && (
                    <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-(--ed-divider)/40">
                      <span className="text-(--ed-muted)">Assigned USDT Value:</span>
                      <span className="text-emerald-500 font-semibold">
                        ${fiatValueUsd.toFixed(2)} USDT (${fiatValueUsd.toFixed(2)} USD)
                      </span>
                    </div>
                  )}

                  {/* Quick Presets */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-(--ed-divider)/60">
                    <span className="text-[11px] text-(--ed-muted)">Presets:</span>
                    {[25, 50, 100, 250, 500, 1000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleAddPresetUsd(val)}
                        className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-(--ed-surface) hover:bg-(--ed-hover) border border-(--ed-border) transition-colors text-(--ed-text) cursor-pointer"
                      >
                        ${val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transaction Hash Input */}
                <div className="rounded-2xl border border-(--ed-border) bg-(--ed-bg) p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="text-(--ed-muted) font-medium">Transaction Hash (TxID)</label>
                    <button
                      type="button"
                      onClick={handlePasteTxHash}
                      className="text-[11px] text-(--ed-primary) hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <ClipboardPaste className="size-3" />
                      Paste Hash
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. 0x4f8a... or 57c4... from Binance / Trust Wallet"
                    value={txHashInput}
                    onChange={(e) => setTxHashInput(e.target.value)}
                    className="w-full bg-(--ed-surface) px-3 py-2 rounded-xl text-xs font-mono text-(--ed-text) border border-(--ed-border) placeholder:text-(--ed-muted)/40 focus:outline-none focus:border-(--ed-primary)"
                  />
                  <p className="text-[10px] text-(--ed-muted)">
                    Once you send funds from your exchange or wallet, paste the transaction ID here
                    to verify and claim your NSC tokens.
                  </p>
                </div>

                {/* Action Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || parsedAmount <= 0 || !txHashInput.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-(--ed-primary) text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Verifying Payment & Crediting NSC…</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm Payment & Claim {nscToReceive.toLocaleString()} NSC</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-(--ed-muted) flex items-center justify-center gap-1">
                  <ShieldCheck className="size-3.5 text-emerald-500" />
                  Direct Treasury Route • Non-Custodial Verification
                </p>
              </form>
            ) : (
              /* INTERNAL VAULT SWAP FLOW (SECONDARY) */
              <form onSubmit={handleVaultSwap} className="space-y-4">
                {/* Payment Coin Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-(--ed-muted) block">
                    Select Currency to Swap
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {SUPPORTED_COINS.map((c) => {
                      const isSelected = selectedCoin === c.coin;
                      return (
                        <button
                          key={c.coin}
                          type="button"
                          onClick={() => setSelectedCoin(c.coin)}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? "border-(--ed-primary) bg-(--ed-primary)/10 text-(--ed-text) shadow-sm ring-1 ring-(--ed-primary)"
                              : "border-(--ed-border) bg-(--ed-bg) text-(--ed-muted) hover:bg-(--ed-hover) hover:text-(--ed-text)"
                          }`}
                        >
                          <span className="text-base font-bold mb-0.5" style={{ color: c.color }}>
                            {c.iconSymbol}
                          </span>
                          <span className="text-xs font-semibold">{c.coin}</span>
                          <span className="text-[10px] opacity-75 font-mono">
                            {c.coin === "USDT" || c.coin === "USDC"
                              ? "$1.00"
                              : c.coin === "TRX"
                                ? "$0.25"
                                : `$${c.rateUsd >= 1000 ? (c.rateUsd / 1000).toFixed(1) + "k" : c.rateUsd}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Amount Input Card */}
                <div className="rounded-2xl border border-(--ed-border) bg-(--ed-bg) p-3.5 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-(--ed-muted)">You Pay ({selectedCoin})</span>
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <span className="text-(--ed-muted)">Vault Balance:</span>
                      <span className="font-semibold text-(--ed-text)">
                        {userVaultCoinBalance.toFixed(4)} {selectedCoin}
                      </span>
                      {userTronAddress && selectedCoin === "USDT" && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            (tronTrxBalance ?? 0) < 15
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-500"
                          }`}
                          title="Native TRX balance in self-custody wallet for Tron gas"
                        >
                          {isCheckingTrx ? "Checking TRX…" : `${tronTrxBalance ?? 0} TRX`}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleSetMaxVault}
                        className="px-1.5 py-0.5 rounded bg-(--ed-divider) text-[10px] font-bold text-(--ed-primary) hover:bg-(--ed-primary) hover:text-white transition-colors cursor-pointer"
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="w-full bg-transparent text-2xl font-bold font-mono text-(--ed-text) placeholder:text-(--ed-muted)/40 focus:outline-none"
                    />
                    <span className="font-mono text-sm font-semibold px-2.5 py-1 rounded-lg bg-(--ed-surface) border border-(--ed-border)">
                      {selectedCoin}
                    </span>
                  </div>

                  {/* Assigned USDT Value Indicator */}
                  {selectedCoin !== "USDT" && parsedAmount > 0 && (
                    <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-(--ed-divider)/40">
                      <span className="text-(--ed-muted)">Assigned USDT Value:</span>
                      <span className="text-emerald-500 font-semibold">
                        ${fiatValueUsd.toFixed(2)} USDT (${fiatValueUsd.toFixed(2)} USD)
                      </span>
                    </div>
                  )}

                  {/* Quick Presets */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-(--ed-divider)/60">
                    <span className="text-[11px] text-(--ed-muted)">Presets:</span>
                    {[25, 50, 100, 250, 500].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleAddPresetUsd(val)}
                        className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-(--ed-surface) hover:bg-(--ed-hover) border border-(--ed-border) transition-colors text-(--ed-text) cursor-pointer"
                      >
                        ${val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conversion Preview Box */}
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-(--ed-muted) flex items-center gap-1">
                      <TrendingUp className="size-3.5 text-emerald-500" />
                      You Receive (1:1):
                    </span>
                    <span className="text-base font-bold text-emerald-500">
                      +{nscToReceive.toLocaleString()} NSC
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-(--ed-muted) font-mono">
                    <span>Presale Rate:</span>
                    <span>$1.00 USD = 1.00 NSC</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-(--ed-muted) font-mono">
                    <span>Fee:</span>
                    <span className="text-emerald-500 font-bold">$0.00 (Zero Gas Ledger)</span>
                  </div>
                </div>

                {/* Option B: Tron 0 TRX Gas Notice - On-Platform Deposit */}
                {hasZeroTrxOnTron && (
                  <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 space-y-3 text-xs text-(--ed-text) animate-in fade-in duration-200">
                    <div className="flex items-start gap-2.5">
                      <div className="size-7 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertCircle className="size-4" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-500 flex items-center gap-1.5">
                            Tron Gas Needed: ~15 TRX (~$3.75 USD)
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold">
                            {isCheckingTrx ? "Checking..." : `${tronTrxBalance ?? 0} TRX in Vault`}
                          </span>
                        </div>
                        <p className="text-[11px] text-(--ed-muted) leading-relaxed">
                          Your vault holds <strong>{userVaultCoinBalance.toFixed(2)} USDT</strong>.
                          Sweeping TRC-20 tokens on Tron requires native network energy to transfer
                          to the treasury.
                        </p>
                        <div className="p-2 rounded-xl bg-(--ed-surface) border border-amber-500/20 text-[11px] space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-(--ed-muted)">Required Gas Energy:</span>
                            <span className="font-mono font-semibold text-(--ed-text)">
                              ~15.00 TRX
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-(--ed-muted)">Assigned USDT Value:</span>
                            <span className="font-mono font-semibold text-emerald-500">
                              3.75 USDT ($3.75 USD)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Platform Deposit Address Box */}
                    <div className="space-y-1.5 pt-1 border-t border-amber-500/20">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-(--ed-muted)">
                          Deposit TRX to your platform vault address:
                        </span>
                        <span className="text-[10px] text-amber-500 font-mono">TRON TRC-20</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-(--ed-bg) border border-(--ed-border) font-mono">
                        <span className="text-[11px] text-(--ed-text) break-all flex-1 select-all">
                          {userTronAddress}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyUserTron}
                          className="px-2 py-1 rounded bg-(--ed-surface) hover:bg-(--ed-hover) border border-(--ed-border) text-xs font-semibold text-(--ed-text) shrink-0 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedUserTron ? (
                            <>
                              <Check className="size-3 text-emerald-500" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-1 flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={handleOpenDepositTrx}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                      >
                        <QrCode className="size-3.5" />
                        Deposit 15 TRX on Platform
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMode("direct_treasury")}
                        className="py-2.5 px-3 rounded-xl border border-(--ed-border) bg-(--ed-surface) hover:bg-(--ed-hover) text-(--ed-text) font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Building2 className="size-3.5 text-emerald-500" />
                        Use Direct to Treasury (0 TRX)
                      </button>
                    </div>
                  </div>
                )}

                {/* Insufficient Balance / Deposit Prompt */}
                {isInsufficientVault && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2.5 text-xs text-amber-500">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <div className="space-y-1.5 flex-1">
                      <p className="font-semibold">Insufficient {selectedCoin} in your vault</p>
                      <p className="text-[11px] opacity-90">
                        You need {parsedAmount} {selectedCoin}, but your vault holds{" "}
                        {userVaultCoinBalance.toFixed(4)}. Use <strong>Direct to Treasury</strong>{" "}
                        above to pay straight from Binance or Trust Wallet, or deposit to your
                        vault.
                      </p>
                      {userVaultAddress && (
                        <button
                          type="button"
                          onClick={handleOpenRegularDeposit}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 transition-colors cursor-pointer"
                        >
                          <QrCode className="size-3.5" />
                          View Vault Deposit Address
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <button
                  type="submit"
                  disabled={
                    isSubmitting || parsedAmount <= 0 || isInsufficientVault || hasZeroTrxOnTron
                  }
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-(--ed-primary) text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Swapping on Ledger…</span>
                    </>
                  ) : isInsufficientVault ? (
                    <span>Insufficient Vault Balance</span>
                  ) : hasZeroTrxOnTron ? (
                    <span>Requires ~15 TRX Gas in Vault (Use Direct to Treasury)</span>
                  ) : (
                    <>
                      <span>Confirm Vault Swap • {nscToReceive.toLocaleString()} NSC</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-(--ed-muted) flex items-center justify-center gap-1">
                  <ShieldCheck className="size-3.5 text-emerald-500" />
                  Zero Gas Fees • Instant Settlement Vault Balance Update
                </p>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Embedded Deposit QR Code Modal */}
      {(depositModalAddress || userVaultAddress) && (
        <CryptoQrCodeModal
          isOpen={depositQrModalOpen}
          onClose={() => {
            setDepositQrModalOpen(false);
            refreshVault();
          }}
          coin={depositModalCoin || selectedCoin}
          network={depositModalNetwork || activeCoinMeta.network}
          address={depositModalAddress || userVaultAddress}
        />
      )}
    </div>
  );
}
