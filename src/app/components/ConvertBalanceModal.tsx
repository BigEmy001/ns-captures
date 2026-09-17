import React, { useState, useEffect } from "react";
import { X, ArrowRightLeft, Coins, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { convertWeb2ToNsc } from "../data/db";
import { useAuth } from "../context/AuthContext";
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
  const { refreshProfile } = useAuth();
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
  // 1:1 rate
  const nscToReceive = parsedAmount;

  const handleConvert = async () => {
    if (!isAmountValid || isConverting) return;
    setIsConverting(true);

    try {
      const convRes = await convertWeb2ToNsc(targetId, parsedAmount, "GBP");
      if (!convRes.success) {
        throw new Error(convRes.error || "Failed to convert balance");
      }

      // Refresh auth profile so user.payoutBalance is updated across all components
      await refreshProfile().catch(() => {});

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
        `Successfully converted £${parsedAmount.toFixed(2)} to ${convRes.nscReceived.toFixed(2)} NSC!`,
      );

      if (onConverted) {
        onConverted({
          fiatAmount: parsedAmount,
          nscReceived: convRes.nscReceived,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to convert balance";
      toast.error(msg);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 transition cursor-pointer"
        >
          <X className="size-4" />
        </button>

        {result ? (
          <div className="py-4 text-center space-y-4">
            <div className="size-12 rounded-full bg-neutral-100 border border-neutral-300 text-neutral-900 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-2xl text-neutral-900">Conversion Complete</h3>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                Your cash earnings have been converted to native Web3 tokens and credited to your
                vault.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-left text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-neutral-500">Deducted Main Balance:</span>
                <span className="font-mono font-medium text-neutral-900">
                  £{result.fiatAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Credited NSC Tokens:</span>
                <span className="font-mono font-semibold text-neutral-900">
                  +{result.nscReceived.toFixed(2)} NSC
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Exchange Rate:</span>
                <span className="font-mono text-neutral-700">1.00 GBP = 1.00 NSC (1:1)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Vault Status:</span>
                <span className="font-mono font-medium text-neutral-900">Confirmed & Ready</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-2 w-full rounded-xl bg-neutral-900 py-2.5 text-xs font-medium text-white hover:bg-neutral-800 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900 flex items-center justify-center shrink-0">
                <ArrowRightLeft className="size-4" />
              </div>
              <div>
                <h3 className="font-serif text-xl tracking-tight text-neutral-900">
                  Convert Web2 to NSC
                </h3>
                <p className="text-xs text-neutral-500">
                  Bridge your platform cash balance into native platform NSC tokens.
                </p>
              </div>
            </div>

            {/* Available Balance Box */}
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500">
                  Available Main Balance
                </span>
                <p className="font-serif text-xl font-light text-neutral-900">
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
                className="rounded-lg border border-neutral-300 bg-white px-3 py-1 text-[11px] font-mono font-semibold text-neutral-800 hover:bg-neutral-100 transition cursor-pointer disabled:opacity-40"
              >
                MAX
              </button>
            </div>

            {/* Conversion Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-neutral-800">Amount to Convert (£)</label>
                <span className="font-mono text-[11px] text-neutral-500">
                  1.00 GBP = 1.00 NSC (1:1)
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-serif text-sm text-neutral-400">
                  £
                </span>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  max={availableWeb2Balance}
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-neutral-300 bg-white pl-8 pr-16 py-2 text-sm font-mono text-neutral-900 outline-none focus:border-neutral-900 transition-colors"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-mono text-neutral-400">
                  GBP
                </span>
              </div>
            </div>

            {/* Conversion Calculation Result */}
            {parsedAmount > 0 && (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">You will receive:</span>
                  <span className="text-sm font-mono font-semibold text-neutral-900">
                    {nscToReceive.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    NSC
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1.5 border-t border-neutral-200">
                  <span>Conversion Fee:</span>
                  <span className="font-mono font-medium text-neutral-800">£0.00 (Zero Fee)</span>
                </div>
                {vaultEvmAddress && (
                  <div className="text-[11px] text-neutral-500 pt-1.5 border-t border-neutral-200 truncate">
                    <span>Crediting to Vault: </span>
                    <span className="font-mono text-neutral-800">
                      {vaultEvmAddress.slice(0, 10)}...{vaultEvmAddress.slice(-8)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Info Advisory */}
            <p className="text-[11px] leading-relaxed text-neutral-500">
              NSC tokens are credited instantly to your self-custodial vault. You can use them to
              mint editions, pay platform fees, or withdraw to an external wallet at any time.
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isConverting}
                className="rounded-xl border border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!isAmountValid || isConverting}
                onClick={handleConvert}
                className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2 text-xs font-medium text-white hover:bg-neutral-800 transition cursor-pointer disabled:opacity-50"
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
