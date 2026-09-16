import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  QrCode,
  Loader2,
  AlertCircle,
  Info,
  Wallet,
  Building2,
  ClipboardPaste,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useEditionVault } from "./editions/useEditionVault";
import { useBodyScrollLock } from "./editions/useBodyScrollLock";
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
    badge: "Primary",
    color: "#627EEA",
    iconSymbol: "⟠",
    rateUsd: 3450.0,
  },
  {
    coin: "USDT",
    name: "Tether USD",
    network: "TRC20 / ERC20",
    badge: "Popular",
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
    iconSymbol: "⚡",
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
    badge: "Low Fee",
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
  useBodyScrollLock(isOpen);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
        text: "Sending from Binance, Bybit, or OKX? Exchange auto-pays network fees in USDT (0 TRX needed).",
      };
    }
    if (selectedCoin === "TRX") {
      return {
        badge: "TRON Native Coin",
        text: "Direct TRX transfer ($0.25 USD / 0.25 NSC per TRX). Settles in ~3 seconds.",
      };
    }
    if (selectedCoin === "USDC" || selectedCoin === "ETH") {
      return {
        badge: "Base & Ethereum",
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
        trxBalance: tronTrxBalance !== null ? tronTrxBalance : undefined,
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
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="NSC Token Presale"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-h-[92dvh] sm:max-h-[86vh] sm:max-w-[480px] rounded-t-3xl sm:rounded-2xl border-t sm:border border-(--ed-border) bg-(--ed-surface) shadow-2xl text-(--ed-text) flex flex-col overflow-hidden"
      >
        {/* Sticky Header Bar */}
        <div className="shrink-0 border-b border-(--ed-border) px-4 sm:px-5 pt-3.5 pb-3 bg-(--ed-surface)">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center gap-1 rounded-full bg-(--ed-raised) px-2.5 py-0.5 text-[11px] font-mono font-medium text-(--ed-muted) border border-(--ed-border) shrink-0">
                <Sparkles className="size-3 text-(--ed-muted)" />
                Presale · 1:1 Peg
              </span>
              <h2 className="text-base font-medium tracking-tight text-(--ed-text) truncate">
                Acquire NSC Tokens
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="-mr-1.5 size-8 flex items-center justify-center rounded-full text-(--ed-muted) transition-colors hover:bg-(--ed-hover) hover:text-(--ed-text) cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Micro Progress Strip */}
          <div className="mt-2.5 pt-2 border-t border-(--ed-divider) space-y-1">
            <div className="flex justify-between items-center text-[11px] font-mono">
              <span className="text-(--ed-muted)">Presale Allocation</span>
              <span className="font-medium text-(--ed-text)">
                {presaleMetrics.totalNscSold.toLocaleString()} /{" "}
                {presaleConfig.hardCapNsc.toLocaleString()} NSC ({presaleMetrics.percentFilled}%)
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-(--ed-divider)">
              <div
                className="h-full bg-(--ed-primary) transition-all duration-500"
                style={{ width: `${Math.max(4, presaleMetrics.percentFilled)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3.5">
          {completedOrder ? (
            /* SUCCESS CONFIRMATION RECEIPT */
            <div className="text-center py-3 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-(--ed-surface) border border-(--ed-border) text-(--ed-text) shadow-sm">
                <CheckCircle2 className="size-8 text-(--ed-primary)" />
              </div>

              <div className="space-y-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-(--ed-raised) px-2.5 py-0.5 text-[11px] font-mono font-medium text-(--ed-muted) border border-(--ed-border)">
                  <Sparkles className="size-3" />
                  Presale Swap Certified • Zero Gas
                </span>
                <h3 className="text-xl font-bold tracking-tight text-(--ed-text)">
                  +{completedOrder.nscAmount.toLocaleString()} NSC Credited
                </h3>
                <p className="text-xs text-(--ed-muted) max-w-xs mx-auto">
                  Payment of {completedOrder.amountPaid} {completedOrder.coinPaid} routed to NS
                  CAPTURES Treasury. NSC is live in your vault.
                </p>
              </div>

              {/* Receipt Details Card */}
              <div className="rounded-xl border border-(--ed-border) bg-(--ed-bg) p-3 text-left space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center text-(--ed-muted)">
                  <span>Route:</span>
                  <span className="text-(--ed-text) font-semibold">
                    {completedOrder.paymentMethod === "direct_treasury"
                      ? "Direct Treasury Transfer"
                      : "Vault Balance Swap"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-(--ed-muted)">
                  <span>Order Ref:</span>
                  <span className="text-(--ed-text) font-semibold">{completedOrder.id}</span>
                </div>
                <div className="flex justify-between items-center text-(--ed-muted)">
                  <span>Tokens Credited:</span>
                  <span className="text-(--ed-text) font-bold">
                    +{completedOrder.nscAmount.toLocaleString()} NSC (1:1 Peg)
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
                  <span>Treasury:</span>
                  <span className="text-(--ed-text) truncate max-w-[160px]">
                    {completedOrder.treasuryAddress}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-(--ed-divider) flex justify-between items-center text-(--ed-muted)">
                  <span>Tx Hash:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-(--ed-text) truncate max-w-[140px]">
                      {completedOrder.txHash}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyTx(completedOrder.txHash)}
                      className="text-(--ed-muted) hover:text-(--ed-text) p-0.5 cursor-pointer"
                      title="Copy Hash"
                    >
                      {copiedTx ? (
                        <Check className="size-3 text-emerald-500" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCompletedOrder(null);
                    setPayAmount("");
                    setTxHashInput("");
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-(--ed-border) bg-(--ed-hover) text-xs font-medium text-(--ed-text) transition-colors hover:bg-(--ed-divider) cursor-pointer"
                >
                  Buy More NSC
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-(--ed-primary) text-xs font-semibold text-white transition-opacity hover:opacity-95 cursor-pointer"
                >
                  Done / View Vault
                </button>
              </div>
            </div>
          ) : (
            /* PRESALE FORM */
            <div className="space-y-3.5">
              {/* Segmented Mode Switcher */}
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-(--ed-bg) p-1 border border-(--ed-border)">
                <button
                  type="button"
                  onClick={() => setPaymentMode("direct_treasury")}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    paymentMode === "direct_treasury"
                      ? "bg-(--ed-surface) text-(--ed-text) shadow-sm border border-(--ed-border)"
                      : "text-(--ed-muted) hover:text-(--ed-text)"
                  }`}
                >
                  <Building2 className="size-3.5 text-(--ed-muted) shrink-0" />
                  <span className="truncate">Direct to Treasury</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-(--ed-raised) text-(--ed-muted) border border-(--ed-border) hidden sm:inline-block">
                    Recommended
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode("vault_swap")}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    paymentMode === "vault_swap"
                      ? "bg-(--ed-surface) text-(--ed-text) shadow-sm border border-(--ed-border)"
                      : "text-(--ed-muted) hover:text-(--ed-text)"
                  }`}
                >
                  <Wallet className="size-3.5 text-(--ed-muted) shrink-0" />
                  <span className="truncate">Pay from Vault</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-(--ed-raised) text-(--ed-muted) border border-(--ed-border) hidden sm:inline-block">
                    0 Gas
                  </span>
                </button>
              </div>

              {/* Modern Horizontal Token Selector Pill Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-(--ed-muted)">
                  <span>Select Payment Currency</span>
                  <span className="font-mono text-[10px]">
                    1 {selectedCoin} = ${activeCoinMeta.rateUsd.toLocaleString()} USD
                  </span>
                </div>
                <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] pb-0.5">
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
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono transition-all shrink-0 cursor-pointer ${
                          isSelected
                            ? "border-(--ed-border-strong) bg-(--ed-raised) text-(--ed-text) shadow-sm font-semibold"
                            : "border-(--ed-border) bg-(--ed-bg) text-(--ed-muted) hover:bg-(--ed-hover) hover:text-(--ed-text)"
                        }`}
                      >
                        <span style={{ color: c.color }} className="font-bold text-xs">
                          {c.iconSymbol}
                        </span>
                        <span>{c.coin}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DEX-Style Swap Input Card */}
              <div className="rounded-2xl border border-(--ed-border) bg-(--ed-bg) p-3 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-(--ed-muted) font-medium">
                    {paymentMode === "direct_treasury"
                      ? `You Send (${selectedCoin})`
                      : `You Pay from Vault`}
                  </span>
                  {paymentMode === "vault_swap" ? (
                    <div className="flex items-center gap-1 font-mono text-[11px]">
                      <span className="text-(--ed-muted)">Vault:</span>
                      <span className="font-semibold text-(--ed-text)">
                        {userVaultCoinBalance.toFixed(4)} {selectedCoin}
                      </span>
                      {userTronAddress && selectedCoin === "USDT" && (
                        <span className="text-[9px] px-1 py-0.2 rounded font-mono bg-(--ed-raised) text-(--ed-muted) border border-(--ed-border)">
                          {isCheckingTrx ? "Checking…" : `${tronTrxBalance ?? 0} TRX`}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleSetMaxVault}
                        className="px-1 py-0.2 rounded bg-(--ed-divider) text-[9px] font-bold text-(--ed-primary) hover:bg-(--ed-primary) hover:text-white transition-colors cursor-pointer"
                      >
                        MAX
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-(--ed-muted) font-mono">
                      Direct External Transfer
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full bg-transparent text-2xl font-bold font-mono text-(--ed-text) placeholder:text-(--ed-muted)/30 focus:outline-none"
                  />
                  <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-xl bg-(--ed-surface) border border-(--ed-border) font-mono text-xs font-semibold">
                    <span style={{ color: activeCoinMeta.color }}>{activeCoinMeta.iconSymbol}</span>
                    <span>{selectedCoin}</span>
                  </div>
                </div>

                {/* Quick Presets & Valuation */}
                <div className="flex items-center justify-between pt-1.5 border-t border-(--ed-divider)/50 text-[11px]">
                  <div className="flex items-center gap-1">
                    {[25, 50, 100, 250, 500].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleAddPresetUsd(val)}
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-(--ed-surface) hover:bg-(--ed-hover) border border-(--ed-border) text-(--ed-text) cursor-pointer"
                      >
                        ${val}
                      </button>
                    ))}
                  </div>
                  {selectedCoin !== "USDT" && parsedAmount > 0 && (
                    <span className="font-mono text-(--ed-muted) font-medium text-[11px]">
                      ≈ ${fiatValueUsd.toFixed(2)} USD
                    </span>
                  )}
                </div>
              </div>

              {/* Conversion Preview Card */}
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-(--ed-bg) border border-(--ed-border)">
                <div className="flex items-center gap-1.5 text-xs font-mono text-(--ed-muted)">
                  <ArrowRight className="size-3 text-(--ed-muted) shrink-0" />
                  <span>You Receive (1:1 Rate):</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-base font-semibold text-(--ed-text)">
                    +{nscToReceive.toLocaleString()} NSC
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-(--ed-surface) border border-(--ed-border) text-(--ed-muted) font-medium">
                    0 Gas
                  </span>
                </div>
              </div>

              {/* DIRECT TO TREASURY ROUTE DETAILS */}
              {paymentMode === "direct_treasury" ? (
                <form onSubmit={handleDirectTreasurySubmit} className="space-y-3 pt-1">
                  {/* Treasury Destination Card */}
                  <div className="rounded-xl border border-(--ed-border) bg-(--ed-bg) p-2.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-(--ed-text) flex items-center gap-1">
                        <ShieldCheck className="size-3.5 text-(--ed-muted)" />
                        Treasury ({treasuryWallet.network})
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowInlineQr(!showInlineQr)}
                        className="text-(--ed-muted) hover:text-(--ed-text) flex items-center gap-1 font-mono text-[10px] cursor-pointer"
                      >
                        <QrCode className="size-3" />
                        {showInlineQr ? "Hide QR" : "Show QR"}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-(--ed-surface) border border-(--ed-border) font-mono">
                      <span className="text-[11px] text-(--ed-text) truncate flex-1 select-all">
                        {treasuryWallet.address}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyTreasury}
                        className="px-2 py-0.5 rounded bg-(--ed-raised) hover:bg-(--ed-hover) border border-(--ed-border) text-[11px] font-medium text-(--ed-text) shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedTreasury ? (
                          <>
                            <Check className="size-3 text-(--ed-text)" />
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

                    {showInlineQr && treasuryQrSvg && (
                      <div className="text-center py-1.5 animate-in zoom-in-95 duration-150">
                        <div
                          className="inline-block p-1.5 rounded-lg bg-white shadow"
                          dangerouslySetInnerHTML={{ __html: treasuryQrSvg }}
                        />
                        <p className="text-[10px] text-(--ed-muted) mt-1">
                          Scan to deposit from mobile wallet or exchange
                        </p>
                      </div>
                    )}

                    <div className="flex items-start gap-1 text-[10px] text-(--ed-muted) pt-1 border-t border-(--ed-divider)">
                      <Info className="size-3 text-(--ed-muted) shrink-0 mt-0.5" />
                      <p className="leading-tight">{gasAdvice.text}</p>
                    </div>
                  </div>

                  {/* Transaction Hash Input */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <label className="text-(--ed-muted) font-medium">
                        Transaction Hash (TxID)
                      </label>
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
                      placeholder="e.g. 0x4f8a... or TxID from exchange"
                      value={txHashInput}
                      onChange={(e) => setTxHashInput(e.target.value)}
                      className="w-full bg-(--ed-bg) px-3 py-2 rounded-xl text-xs font-mono text-(--ed-text) border border-(--ed-border) placeholder:text-(--ed-muted)/30 focus:outline-none focus:border-(--ed-primary)"
                    />
                  </div>

                  {/* Submit Action */}
                  <button
                    type="submit"
                    disabled={isSubmitting || parsedAmount <= 0 || !txHashInput.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-(--ed-primary) text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Verifying & Crediting NSC…</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm & Claim {nscToReceive.toLocaleString()} NSC</span>
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </button>

                  <p className="text-center text-[10px] text-(--ed-muted) flex items-center justify-center gap-1">
                    <ShieldCheck className="size-3 text-(--ed-muted)" />
                    Direct Treasury Route • Non-Custodial Verification
                  </p>
                </form>
              ) : (
                /* VAULT SWAP ROUTE DETAILS */
                <form onSubmit={handleVaultSwap} className="space-y-3 pt-1">
                  {/* Option B: Tron 0 TRX Gas Notice */}
                  {hasZeroTrxOnTron && (
                    <div className="rounded-xl border border-(--ed-border) bg-(--ed-bg) p-2.5 space-y-2 text-xs text-(--ed-text)">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="size-4 text-(--ed-muted) shrink-0 mt-0.5" />
                        <div className="space-y-1 flex-1">
                          <span className="font-semibold text-(--ed-text) block">
                            Tron Gas Energy Needed: ~15 TRX (~$3.75 USD)
                          </span>
                          <p className="text-[11px] text-(--ed-muted) leading-snug">
                            Sweeping TRC-20 USDT on Tron requires native TRX energy. Either deposit
                            15 TRX or use Direct to Treasury (0 TRX needed).
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={handleOpenDepositTrx}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-(--ed-primary) text-white font-medium text-xs flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <QrCode className="size-3" />
                          Deposit 15 TRX
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMode("direct_treasury")}
                          className="flex-1 py-1.5 px-2 rounded-lg border border-(--ed-border) bg-(--ed-surface) text-(--ed-text) font-medium text-xs flex items-center justify-center gap-1 cursor-pointer"
                        >
                          Use Direct Treasury
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Insufficient Balance Prompt */}
                  {isInsufficientVault && (
                    <div className="rounded-xl border border-(--ed-border) bg-(--ed-bg) p-2.5 flex items-start gap-2 text-xs text-(--ed-text)">
                      <AlertCircle className="size-4 text-(--ed-muted) shrink-0 mt-0.5" />
                      <div className="space-y-1 flex-1">
                        <p className="font-medium text-(--ed-text)">
                          Insufficient {selectedCoin} in Vault
                        </p>
                        <p className="text-[11px] text-(--ed-muted) leading-tight">
                          Need {parsedAmount} {selectedCoin}, available:{" "}
                          {userVaultCoinBalance.toFixed(4)}. Switch to Direct to Treasury to pay
                          directly from Binance/Trust Wallet.
                        </p>
                        {userVaultAddress && (
                          <button
                            type="button"
                            onClick={handleOpenRegularDeposit}
                            className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-(--ed-surface) hover:bg-(--ed-hover) border border-(--ed-border) text-(--ed-text) font-medium text-[11px] cursor-pointer"
                          >
                            <QrCode className="size-3" />
                            Deposit {selectedCoin}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Submit Action */}
                  <button
                    type="submit"
                    disabled={
                      isSubmitting || parsedAmount <= 0 || isInsufficientVault || hasZeroTrxOnTron
                    }
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-(--ed-primary) text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Swapping on Ledger…</span>
                      </>
                    ) : isInsufficientVault ? (
                      <span>Insufficient Vault Balance</span>
                    ) : hasZeroTrxOnTron ? (
                      <span>Requires ~15 TRX Gas in Vault</span>
                    ) : (
                      <>
                        <span>Confirm Vault Swap • {nscToReceive.toLocaleString()} NSC</span>
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </button>

                  <p className="text-center text-[10px] text-(--ed-muted) flex items-center justify-center gap-1">
                    <ShieldCheck className="size-3 text-(--ed-muted)" />
                    Zero Gas Fees • Instant Settlement Vault Balance Update
                  </p>
                </form>
              )}
            </div>
          )}
        </div>
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
