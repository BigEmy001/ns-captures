import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  ArrowRightLeft,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { convertWeb2ToNsc } from "../data/db";
import { sendNscConversionNotification } from "../../lib/email";

interface ConvertBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableWeb2Balance: number;
  targetId: string;
  userName?: string;
  userEmail?: string;
  vaultEvmAddress?: string;
  onConverted?: (result: { fiatAmount: number; nscReceived: number }) => void;
}

export function ConvertBalanceModal({
  isOpen,
  onClose,
  availableWeb2Balance,
  targetId,
  userName = "Collector",
  userEmail,
  vaultEvmAddress,
  onConverted,
}: ConvertBalanceModalProps) {
  const [amountStr, setAmountStr] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [result, setResult] = useState<{
    fiatAmount: number;
    nscReceived: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAmountStr("");
      setResult(null);
      setIsConverting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const parsedAmount = parseFloat(amountStr) || 0;
  const isAmountValid = parsedAmount > 0 && parsedAmount <= availableWeb2Balance;
  // 1:1 rate as requested by user
  const nscToReceive = parsedAmount;

  const handleConvert = async () => {
    if (!isAmountValid || isConverting) return;
    setIsConverting(true);

    try {
      const convRes = await convertWeb2ToNsc(targetId, parsedAmount, "GBP");
      if (!convRes.success) {
        throw new Error(convRes.error || "Failed to convert balance");
      }

      // Send email notification to user
      if (userEmail) {
        await sendNscConversionNotification({
          to: userEmail,
          userName,
          fiatAmount: parsedAmount.toFixed(2),
          currency: "GBP",
          nscAmount: convRes.nscReceived.toFixed(2),
          vaultAddress: vaultEvmAddress,
        }).catch((e) => console.error("Conversion email failed:", e));
      }

      setResult({
        fiatAmount: parsedAmount,
        nscReceived: convRes.nscReceived,
      });

      toast.success(
        `Successfully converted £${parsedAmount.toFixed(2)} to ${convRes.nscReceived} NSC!`,
      );

      if (onConverted) {
        onConverted({
          fiatAmount: parsedAmount,
          nscReceived: convRes.nscReceived,
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to convert balance");
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl border border-[#ececec] bg-white p-6 shadow-xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-1 text-[#758078] hover:bg-[#FAF9F5] hover:text-[#18211f] transition cursor-pointer"
        >
          <X className="size-4" />
        </button>

        {result ? (
          <div className="py-6 text-center space-y-4">
            <div className="size-13 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-2xl text-[#18211f]">Conversion Complete!</h3>
              <p className="text-xs text-[#758078]">
                Your Web2 earnings have been converted to Web3 tokens and deposited into your vault.
              </p>
            </div>

            <div className="rounded-xl border border-[#dce8df] bg-[#FAF9F5] p-4 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#758078]">Deducted Web2 Balance:</span>
                <span className="font-mono text-[#18211f]">£{result.fiatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#758078]">Credited NSC Tokens:</span>
                <span className="font-semibold text-[#1e4a3f]">
                  +{result.nscReceived.toFixed(2)} NSC
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#758078]">Exchange Rate:</span>
                <span className="font-medium text-[#18211f]">1.00 GBP = 1.00 NSC (1:1)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#758078]">Vault Status:</span>
                <span className="text-emerald-700 font-medium">Credited & Confirmed</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-2 w-full rounded-full bg-[#18211f] py-2.5 text-xs font-medium text-white hover:bg-[#12231f] transition cursor-pointer"
            >
              View Updated Vault
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-[#1e4a3f] text-white flex items-center justify-center shrink-0">
                <ArrowRightLeft className="size-5" />
              </div>
              <div>
                <h3 className="font-serif text-xl text-[#18211f]">Convert Web2 to NSC</h3>
                <p className="text-xs text-[#758078]">
                  Bridge your platform cash earnings directly into native Web3 coins.
                </p>
              </div>
            </div>

            {/* Available Balance Box */}
            <div className="rounded-xl border border-[#dce8df] bg-[#FAF9F5] p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#758078]">
                  Available Web2 Balance
                </span>
                <p className="font-serif text-xl font-light text-[#18211f]">
                  £
                  {availableWeb2Balance.toLocaleString("en-GB", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAmountStr(availableWeb2Balance.toString())}
                disabled={availableWeb2Balance <= 0}
                className="rounded-full border border-[#1e4a3f] bg-white px-3 py-1 text-[11px] font-semibold text-[#1e4a3f] hover:bg-[#1e4a3f] hover:text-white transition cursor-pointer disabled:opacity-40"
              >
                Use MAX
              </button>
            </div>

            {/* Conversion Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-[#18211f]">Amount to Convert (£)</label>
                <span className="font-mono text-[11px] text-[#1e4a3f]">
                  1.00 GBP = 1.00 NSC (1:1 Peg)
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-serif text-sm text-[#758078]">
                  £
                </span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  max={availableWeb2Balance}
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-[#dce8df] pl-8 pr-16 py-2.5 text-sm text-[#18211f] outline-none focus:border-[#1e4a3f]"
                />
                <span className="absolute right-3.5 top-3 text-xs font-semibold text-[#758078]">
                  GBP
                </span>
              </div>
            </div>

            {/* Conversion Calculation Result */}
            {parsedAmount > 0 && (
              <div className="rounded-xl border border-[#ececec] bg-[#FAF9F5] p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#758078]">You will receive:</span>
                  <span className="text-base font-semibold text-[#1e4a3f]">
                    {nscToReceive.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    NSC
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#758078] pt-1 border-t border-[#ececec]">
                  <span>Conversion Fee:</span>
                  <span className="text-emerald-700 font-medium">£0.00 (Zero Fee)</span>
                </div>
                {vaultEvmAddress && (
                  <div className="text-[11px] text-[#758078] pt-1 border-t border-[#ececec] truncate">
                    <span>Crediting to Vault Address: </span>
                    <span className="font-mono text-[#18211f]">
                      {vaultEvmAddress.slice(0, 10)}...{vaultEvmAddress.slice(-8)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Info Advisory */}
            <p className="text-[11px] leading-relaxed text-[#758078]">
              NSC tokens are credited instantly to your self-custodial vault on Base/Polygon. You
              can use them across NS CAPTURES or withdraw to external wallets (Trust Wallet,
              MetaMask) at any time.
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#ececec]">
              <button
                type="button"
                onClick={onClose}
                disabled={isConverting}
                className="rounded-full border border-[#ececec] px-4 py-2 text-xs font-medium text-[#758078] hover:bg-[#FAF9F5] transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!isAmountValid || isConverting}
                onClick={handleConvert}
                className="inline-flex items-center gap-2 rounded-full bg-[#1e4a3f] px-5 py-2 text-xs font-semibold text-white hover:bg-[#123b31] transition cursor-pointer disabled:opacity-50"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <Coins className="size-3.5" />
                    <span>Convert to {parsedAmount > 0 ? parsedAmount.toFixed(2) : ""} NSC</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
