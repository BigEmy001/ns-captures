import React, { useState, useMemo, useEffect } from "react";
import {
  X,
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
  ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useEditionVault } from "./editions/useEditionVault";
import { useBodyScrollLock } from "./editions/useBodyScrollLock";
import { useEditionsTheme } from "./editions/useEditionsTheme";
import {
  monoLabelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./editions/editionsFormat";
import {
  getPresaleConfig,
  executePresaleSwap,
  executePresaleDirectPayment,
  getTreasuryWalletForCoin,
  type NscPresaleOrder,
} from "../data/editions";
import { convertWeb2ToNsc } from "../data/db";
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
  const { user, refreshProfile } = useAuth();
  const { wallets, balances, refresh: refreshVault } = useEditionVault();
  useBodyScrollLock(isOpen);
  // Opens from the shell header, the vault and other modals, so it carries the theme itself
  const { theme } = useEditionsTheme();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Mode: "direct_treasury" (External transfer) vs "vault_swap" (Vault crypto) vs "main_balance" (Cash £)
  const [paymentMode, setPaymentMode] = useState<"direct_treasury" | "vault_swap" | "main_balance">(
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

  // Submit Main Balance (Web2 Cash £) Conversion
  const handleMainBalanceConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to convert your main balance.");
      return;
    }

    if (parsedAmount <= 0) {
      toast.error("Please enter the amount you want to convert.");
      return;
    }

    const available = user.payoutBalance || 0;
    if (parsedAmount > available) {
      toast.error(`Insufficient balance. Available: £${available.toFixed(2)} GBP`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await convertWeb2ToNsc(user.slug || user.id, parsedAmount, "GBP");
      if (!res.success) {
        throw new Error(res.error || "Failed to convert balance");
      }

      await refreshProfile?.();
      refreshVault();

      const nowIso = new Date().toISOString();
      const order: NscPresaleOrder = {
        id: `conv_${Date.now()}`,
        userId: user.slug || user.id,
        userName: user.name,
        userEmail: user.email,
        paymentMethod: "vault_swap",
        coinPaid: "GBP",
        network: "Web2 Platform Bridge",
        amountPaid: parsedAmount,
        rateUsd: 1.0,
        fiatValueUsd: parsedAmount,
        nscAmount: parsedAmount,
        txHash: "internal_bridge_settled",
        treasuryAddress: "Internal Settlement Bridge",
        senderAddress: userVaultAddress,
        createdAt: nowIso,
        timestamp: nowIso,
      };

      setCompletedOrder(order);
      toast.success(
        `Successfully converted £${parsedAmount.toFixed(2)} to ${parsedAmount.toFixed(2)} NSC!`,
      );
      if (onSuccess) onSuccess(order);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Conversion failed";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-ed-theme={theme}
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
        {/* Header — same chrome as the shared EditionsModal: eyebrow, title, close.
            The old "x / 1,000,000 NSC (0%)" bar was fed by a per-browser order cache,
            so it read 0% for everyone; the real presale terms sit here instead. */}
        <div className="shrink-0 border-b border-(--ed-border) bg-(--ed-surface) px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className={monoLabelClass}>{presaleConfig.symbol} presale</p>
              <h2 className="truncate pt-1 text-lg font-medium leading-7 text-(--ed-text)">
                Acquire {presaleConfig.symbol} tokens
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1.5 rounded-full p-1.5 text-(--ed-muted) transition-colors hover:bg-(--ed-hover) hover:text-(--ed-text)"
            >
              <X className="size-5" />
            </button>
          </div>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-(--ed-divider) pt-3">
            {[
              {
                label: "Rate",
                value: `1 ${presaleConfig.symbol} = $${presaleConfig.priceUsd.toFixed(2)}`,
              },
              {
                label: "Allocation",
                value: `${presaleConfig.hardCapNsc.toLocaleString()} ${presaleConfig.symbol}`,
              },
              { label: "Minimum", value: `$${presaleConfig.minPurchaseUsd.toFixed(2)}` },
            ].map((fact) => (
              <div key={fact.label} className="flex items-baseline gap-2">
                <dt className={monoLabelClass}>{fact.label}</dt>
                <dd className="font-mono text-xs text-(--ed-text)">{fact.value}</dd>
              </div>
            ))}
          </dl>
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
                <span className="inline-flex items-center gap-1 rounded-full border border-(--ed-border) bg-(--ed-raised) px-2.5 py-0.5 font-mono text-xs text-(--ed-muted)">
                  Confirmed
                </span>
                <h3 className="text-xl font-medium tracking-[-0.2px] text-(--ed-text)">
                  {completedOrder.nscAmount.toLocaleString()} {presaleConfig.symbol} added to your
                  vault
                </h3>
                <p className="mx-auto max-w-xs text-sm leading-6 text-(--ed-muted)">
                  {completedOrder.coinPaid === "GBP"
                    ? `Converted £${completedOrder.amountPaid.toFixed(2)} from your main balance directly into NSC.`
                    : `Your ${completedOrder.amountPaid} ${completedOrder.coinPaid} reached the treasury.`}
                </p>
              </div>

              {/* Receipt Details Card */}
              <div className="rounded-xl border border-(--ed-border) bg-(--ed-bg) p-3 text-left space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between gap-3 text-(--ed-muted)">
                  <span>Paid by</span>
                  <span className="text-(--ed-text)">
                    {completedOrder.paymentMethod === "direct_treasury"
                      ? "Transfer to treasury"
                      : completedOrder.coinPaid === "GBP"
                        ? "Main Balance (Cash £)"
                        : "Vault balance"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-(--ed-muted)">
                  <span>Order</span>
                  <span className="max-w-[180px] truncate text-(--ed-text)">
                    {completedOrder.id}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-(--ed-muted)">
                  <span>Added</span>
                  <span className="text-(--ed-text)">
                    {completedOrder.nscAmount.toLocaleString()} {presaleConfig.symbol}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-(--ed-muted)">
                  <span>You paid</span>
                  <span className="text-(--ed-text)">
                    {completedOrder.coinPaid === "GBP"
                      ? `£${completedOrder.amountPaid.toFixed(2)} GBP`
                      : `${completedOrder.amountPaid} ${completedOrder.coinPaid} ($${completedOrder.fiatValueUsd.toFixed(2)})`}
                  </span>
                </div>
                {completedOrder.treasuryAddress && (
                  <div className="flex items-center justify-between gap-3 text-(--ed-muted)">
                    <span>Treasury</span>
                    <span className="max-w-[160px] truncate text-(--ed-text)">
                      {completedOrder.treasuryAddress}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 border-t border-(--ed-divider) pt-1.5 text-(--ed-muted)">
                  <span>Transaction</span>
                  <div className="flex items-center gap-1">
                    <span className="max-w-[140px] truncate text-xs text-(--ed-text)">
                      {completedOrder.txHash}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyTx(completedOrder.txHash)}
                      className="p-0.5 text-(--ed-muted) transition-colors hover:text-(--ed-text)"
                      aria-label="Copy transaction hash"
                      title="Copy transaction hash"
                    >
                      {copiedTx ? (
                        <Check className="size-3 text-(--ed-positive)" />
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
                  className={`${secondaryButtonClass} h-10 flex-1 px-3 text-sm`}
                >
                  Buy more
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className={`${primaryButtonClass} h-10 flex-1 px-3 text-sm`}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* PRESALE FORM */
            <div className="space-y-3.5">
              {/* Segmented Mode Switcher */}
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-(--ed-bg) p-1 border border-(--ed-border)">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode("direct_treasury");
                    setPayAmount("");
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    paymentMode === "direct_treasury"
                      ? "bg-(--ed-surface) text-(--ed-text) shadow-sm border border-(--ed-border)"
                      : "text-(--ed-muted) hover:text-(--ed-text)"
                  }`}
                >
                  <Building2 aria-hidden className="size-3.5 shrink-0 text-(--ed-muted)" />
                  <span className="truncate">Send crypto</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode("vault_swap");
                    setPayAmount("");
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    paymentMode === "vault_swap"
                      ? "bg-(--ed-surface) text-(--ed-text) shadow-sm border border-(--ed-border)"
                      : "text-(--ed-muted) hover:text-(--ed-text)"
                  }`}
                >
                  <Wallet aria-hidden className="size-3.5 shrink-0 text-(--ed-muted)" />
                  <span className="truncate">Vault crypto</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode("main_balance");
                    setPayAmount("");
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    paymentMode === "main_balance"
                      ? "bg-(--ed-surface) text-(--ed-text) shadow-sm border border-(--ed-border)"
                      : "text-(--ed-muted) hover:text-(--ed-text)"
                  }`}
                >
                  <ArrowRightLeft aria-hidden className="size-3.5 shrink-0 text-(--ed-muted)" />
                  <span className="truncate">Main balance (£)</span>
                </button>
              </div>

              {/* Horizontal Token Selector Pill Bar (Only for crypto modes) */}
              {paymentMode !== "main_balance" && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className={monoLabelClass}>Pay with</span>
                    <span className="font-mono text-xs text-(--ed-muted)">
                      1 {selectedCoin} = ${activeCoinMeta.rateUsd.toLocaleString()}
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
              )}

              {/* DEX-Style Swap Input Card */}
              {paymentMode === "main_balance" ? (
                <div className="rounded-2xl border border-(--ed-border) bg-(--ed-bg) p-3 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className={monoLabelClass}>You pay from Main Balance</span>
                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      <span className="text-(--ed-muted)">Available</span>
                      <span className="text-(--ed-text) font-semibold">
                        £{(user?.payoutBalance || 0).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const bal = user?.payoutBalance || 0;
                          if (bal > 0) {
                            setPayAmount(bal.toString());
                          } else {
                            toast.error("Your main balance is £0.00.");
                          }
                        }}
                        className="rounded px-1.5 py-0.5 font-mono text-xs font-medium text-(--ed-primary) transition-colors hover:bg-(--ed-hover) cursor-pointer"
                      >
                        Max
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-0 top-0.5 text-lg font-serif text-(--ed-muted)">
                        £
                      </span>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        placeholder="0.00"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="w-full bg-transparent pl-5 font-mono text-xl font-medium text-(--ed-text) placeholder:text-(--ed-muted)/40 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-xl bg-(--ed-surface) border border-(--ed-border) font-mono text-xs font-semibold">
                      <span>GBP</span>
                    </div>
                  </div>

                  {/* Quick Percentages */}
                  <div className="flex items-center justify-between gap-3 border-t border-(--ed-divider)/50 pt-2 text-xs">
                    <div className="flex items-center gap-1">
                      {[25, 50, 75, 100].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            const bal = user?.payoutBalance || 0;
                            const val = Number(((bal * pct) / 100).toFixed(2));
                            setPayAmount(val > 0 ? val.toString() : "");
                          }}
                          className="rounded border border-(--ed-border) bg-(--ed-surface) px-2 py-1 font-mono text-xs text-(--ed-text) transition-colors hover:bg-(--ed-hover) cursor-pointer"
                        >
                          {pct === 100 ? "Max" : `${pct}%`}
                        </button>
                      ))}
                    </div>
                    <span className="font-mono text-xs text-(--ed-muted)">
                      1.00 GBP = 1.00 NSC (1:1)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-(--ed-border) bg-(--ed-bg) p-3 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className={monoLabelClass}>
                      {paymentMode === "direct_treasury" ? "You send" : "You pay from vault"}
                    </span>
                    {paymentMode === "vault_swap" ? (
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="text-(--ed-muted)">Vault</span>
                        <span className="text-(--ed-text)">
                          {userVaultCoinBalance.toFixed(4)} {selectedCoin}
                        </span>
                        {userTronAddress && selectedCoin === "USDT" && (
                          <span className="rounded border border-(--ed-border) bg-(--ed-raised) px-1.5 py-0.5 font-mono text-xs text-(--ed-muted)">
                            {isCheckingTrx ? "Checking…" : `${tronTrxBalance ?? 0} TRX`}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={handleSetMaxVault}
                          className="rounded px-1.5 py-0.5 font-mono text-xs font-medium text-(--ed-primary) transition-colors hover:bg-(--ed-hover)"
                        >
                          Max
                        </button>
                      </div>
                    ) : (
                      <span className="font-mono text-xs text-(--ed-muted)">External transfer</span>
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
                      className="w-full bg-transparent font-mono text-xl font-medium text-(--ed-text) placeholder:text-(--ed-muted)/40 focus:outline-none"
                    />
                    <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-xl bg-(--ed-surface) border border-(--ed-border) font-mono text-xs font-semibold">
                      <span style={{ color: activeCoinMeta.color }}>
                        {activeCoinMeta.iconSymbol}
                      </span>
                      <span>{selectedCoin}</span>
                    </div>
                  </div>

                  {/* Quick Presets & Valuation */}
                  <div className="flex items-center justify-between gap-3 border-t border-(--ed-divider)/50 pt-2 text-xs">
                    <div className="flex items-center gap-1">
                      {[25, 50, 100, 250, 500].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleAddPresetUsd(val)}
                          className="rounded border border-(--ed-border) bg-(--ed-surface) px-2 py-1 font-mono text-xs text-(--ed-text) transition-colors hover:bg-(--ed-hover)"
                        >
                          ${val}
                        </button>
                      ))}
                    </div>
                    {selectedCoin !== "USDT" && parsedAmount > 0 && (
                      <span className="font-mono text-xs text-(--ed-muted)">
                        ≈ ${fiatValueUsd.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Conversion Preview Card */}
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-(--ed-bg) border border-(--ed-border)">
                <div className="flex items-center gap-1.5">
                  <ArrowRight aria-hidden className="size-3 shrink-0 text-(--ed-muted)" />
                  <span className={monoLabelClass}>You receive</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-base font-medium text-(--ed-text)">
                    {paymentMode === "main_balance"
                      ? parsedAmount > 0
                        ? parsedAmount.toFixed(2)
                        : "0.00"
                      : nscToReceive.toLocaleString()}{" "}
                    {presaleConfig.symbol}
                  </span>
                  <span className="rounded-full border border-(--ed-border) bg-(--ed-surface) px-2 py-0.5 text-xs text-(--ed-muted)">
                    {paymentMode === "main_balance" ? "Zero fee" : "No gas"}
                  </span>
                </div>
              </div>

              {/* ROUTE SPECIFIC SUBMISSION FORMS */}
              {paymentMode === "main_balance" ? (
                <form onSubmit={handleMainBalanceConvert} className="space-y-3 pt-1">
                  <button
                    type="submit"
                    disabled={
                      isSubmitting || parsedAmount <= 0 || parsedAmount > (user?.payoutBalance || 0)
                    }
                    className={`${primaryButtonClass} h-11 w-full px-4 text-sm cursor-pointer`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 aria-hidden className="size-4 animate-spin" />
                        <span>Converting…</span>
                      </>
                    ) : parsedAmount > (user?.payoutBalance || 0) ? (
                      <span>Insufficient main balance</span>
                    ) : (
                      <>
                        <span>
                          Convert {parsedAmount > 0 ? `£${parsedAmount.toFixed(2)}` : ""} to NSC
                        </span>
                        <ArrowRight aria-hidden className="size-4" />
                      </>
                    )}
                  </button>

                  <p className="flex items-center justify-center gap-1.5 text-center text-xs text-(--ed-muted)">
                    <ShieldCheck aria-hidden className="size-3" />
                    Instant bridge · debited from cash earnings · credited directly to your vault
                  </p>
                </form>
              ) : paymentMode === "direct_treasury" ? (
                <form onSubmit={handleDirectTreasurySubmit} className="space-y-3 pt-1">
                  {/* Treasury Destination Card */}
                  <div className="rounded-xl border border-(--ed-border) bg-(--ed-bg) p-2.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className={`flex items-center gap-1.5 ${monoLabelClass}`}>
                        <ShieldCheck aria-hidden className="size-3.5" />
                        Treasury · {treasuryWallet.network}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowInlineQr(!showInlineQr)}
                        aria-expanded={showInlineQr}
                        className="flex items-center gap-1 text-xs text-(--ed-muted) transition-colors hover:text-(--ed-text)"
                      >
                        <QrCode aria-hidden className="size-3" />
                        {showInlineQr ? "Hide QR" : "Show QR"}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-(--ed-surface) border border-(--ed-border) font-mono">
                      <span className="flex-1 select-all truncate text-xs text-(--ed-text)">
                        {treasuryWallet.address}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyTreasury}
                        className="flex shrink-0 items-center gap-1 rounded border border-(--ed-border) bg-(--ed-raised) px-2 py-1 text-xs font-medium text-(--ed-text) transition-colors hover:bg-(--ed-hover)"
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
                        <p className="mt-1 text-xs text-(--ed-muted)">
                          Scan this from your wallet app or exchange
                        </p>
                      </div>
                    )}

                    <div className="flex items-start gap-1.5 border-t border-(--ed-divider) pt-2 text-xs text-(--ed-muted)">
                      <Info aria-hidden className="mt-0.5 size-3 shrink-0" />
                      <p className="leading-6">{gasAdvice.text}</p>
                    </div>
                  </div>

                  {/* Transaction Hash Input */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <label className={monoLabelClass}>Transaction hash</label>
                      <button
                        type="button"
                        onClick={handlePasteTxHash}
                        className="flex items-center gap-1 text-xs text-(--ed-primary) hover:underline"
                      >
                        <ClipboardPaste aria-hidden className="size-3" />
                        Paste
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
                    className={`${primaryButtonClass} h-11 w-full px-4 text-sm`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 aria-hidden className="size-4 animate-spin" />
                        <span>Verifying…</span>
                      </>
                    ) : (
                      <>
                        <span>
                          Confirm and claim {nscToReceive.toLocaleString()} {presaleConfig.symbol}
                        </span>
                        <ArrowRight aria-hidden className="size-4" />
                      </>
                    )}
                  </button>

                  <p className="flex items-center justify-center gap-1.5 text-center text-xs text-(--ed-muted)">
                    <ShieldCheck aria-hidden className="size-3" />
                    Sent straight to the treasury · verified from your transaction hash
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
                          <span className="block font-medium text-(--ed-text)">
                            You need about 15 TRX for gas
                          </span>
                          <p className="text-xs leading-6 text-(--ed-muted)">
                            Moving USDT on Tron costs TRX. Deposit about 15 TRX, or pay the treasury
                            directly instead, which needs none.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={handleOpenDepositTrx}
                          className={`${primaryButtonClass} h-9 flex-1 px-3 text-xs`}
                        >
                          <QrCode aria-hidden className="size-3" />
                          Deposit TRX
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMode("direct_treasury")}
                          className={`${secondaryButtonClass} h-9 flex-1 px-3 text-xs`}
                        >
                          Pay treasury instead
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
                          Not enough {selectedCoin} in your vault
                        </p>
                        <p className="text-xs leading-6 text-(--ed-muted)">
                          You need {parsedAmount} {selectedCoin} and have{" "}
                          {userVaultCoinBalance.toFixed(4)}. Pay the treasury directly instead, from
                          an exchange or another wallet.
                        </p>
                        {userVaultAddress && (
                          <button
                            type="button"
                            onClick={handleOpenRegularDeposit}
                            className={`${secondaryButtonClass} mt-1 h-9 px-3 text-xs`}
                          >
                            <QrCode aria-hidden className="size-3" />
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
                    className={`${primaryButtonClass} h-11 w-full px-4 text-sm`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 aria-hidden className="size-4 animate-spin" />
                        <span>Swapping…</span>
                      </>
                    ) : isInsufficientVault ? (
                      <span>Not enough {selectedCoin} in your vault</span>
                    ) : hasZeroTrxOnTron ? (
                      <span>Needs about 15 TRX for gas</span>
                    ) : (
                      <>
                        <span>
                          Swap for {nscToReceive.toLocaleString()} {presaleConfig.symbol}
                        </span>
                        <ArrowRight aria-hidden className="size-4" />
                      </>
                    )}
                  </button>

                  <p className="flex items-center justify-center gap-1.5 text-center text-xs text-(--ed-muted)">
                    <ShieldCheck aria-hidden className="size-3" />
                    No gas · credited to your vault straight away
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
