import React, { useState, useEffect } from "react";
import { X, Gift, Coins, ShieldCheck, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { creditNscToVault, type CreatorWeb3Vault } from "../data/db";
import { sendNscGiftNotification } from "../../lib/email";

interface TargetUser {
  id: string;
  slug?: string;
  name?: string;
  email?: string;
}

interface GiftNscModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledUser?: TargetUser | null;
  onGiftSuccess?: (result: {
    userId: string;
    amount: number;
    reason: string;
    newVault: CreatorWeb3Vault;
  }) => void;
}

const PRESET_AMOUNTS = [50, 100, 250, 500, 1000];

const PRESET_REASONS = [
  "Welcome Gift",
  "Early Contributor Airdrop",
  "Contest Winner",
  "Creator Royalty Bonus",
  "Curator Award",
];

export function GiftNscModal({ isOpen, onClose, prefilledUser, onGiftSuccess }: GiftNscModalProps) {
  const [targetId, setTargetId] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [amount, setAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  const [selectedReason, setSelectedReason] = useState(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [isCustomReason, setIsCustomReason] = useState(false);

  const [sendEmailAlert, setSendEmailAlert] = useState(true);
  const [isDispatching, setIsDispatching] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    amount: number;
    recipient: string;
    newBalance: number;
  } | null>(null);

  useEffect(() => {
    if (prefilledUser) {
      setTargetId(prefilledUser.slug || prefilledUser.id || "");
      setUserName(prefilledUser.name || "Collector");
      setUserEmail(prefilledUser.email || "");
    } else {
      setTargetId("");
      setUserName("");
      setUserEmail("");
    }
    setAmount(100);
    setCustomAmount("");
    setIsCustom(false);
    setSelectedReason(PRESET_REASONS[0]);
    setCustomReason("");
    setIsCustomReason(false);
    setSuccessResult(null);
  }, [prefilledUser, isOpen]);

  if (!isOpen) return null;

  const effectiveAmount = isCustom ? parseFloat(customAmount) || 0 : amount;
  const effectiveReason = isCustomReason ? customReason.trim() : selectedReason;
  const isValid = effectiveAmount > 0 && targetId.trim().length > 0 && effectiveReason.length > 0;

  const handleDispatchGift = async () => {
    if (!isValid || isDispatching) return;
    setIsDispatching(true);

    try {
      const updatedVault = await creditNscToVault(targetId, effectiveAmount, {
        reason: effectiveReason,
        grantedBy: "NS Captures Admin",
        type: "gift",
      });

      if (!updatedVault) {
        throw new Error("Failed to credit NSC tokens to the user's Web3 vault");
      }

      const totalNsc = updatedVault.tokenBalances?.nsc || effectiveAmount;

      // Trigger celebratory email
      if (sendEmailAlert && userEmail) {
        const fiatFormatted = `£${effectiveAmount.toFixed(2)}`;

        await sendNscGiftNotification({
          to: userEmail,
          userName: userName || "Collector",
          amount: effectiveAmount.toLocaleString("en-US", { minimumFractionDigits: 2 }),
          reason: effectiveReason,
          fiatValue: fiatFormatted,
          newNscBalance: totalNsc.toLocaleString("en-US", { minimumFractionDigits: 2 }),
        }).catch((err) => console.error("User gift email failed:", err));
      }

      setSuccessResult({
        amount: effectiveAmount,
        recipient: userName || userEmail || targetId,
        newBalance: totalNsc,
      });

      toast.success(`Successfully gifted ${effectiveAmount} NSC to ${userName || targetId}!`);

      if (onGiftSuccess) {
        onGiftSuccess({
          userId: targetId,
          amount: effectiveAmount,
          reason: effectiveReason,
          newVault: updatedVault,
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to dispatch gift");
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-[#ececec] bg-white p-6 shadow-xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-1 text-[#758078] hover:bg-[#FAF9F5] hover:text-[#18211f] transition cursor-pointer"
        >
          <X className="size-4" />
        </button>

        {successResult ? (
          <div className="py-8 text-center space-y-4">
            <div className="size-14 rounded-full bg-[#18211f]/5 border border-[#18211f]/10 text-[#18211f] flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-2xl text-[#18211f]">NSC Tokens Gifted</h3>
              <p className="text-xs text-[#758078]">
                Successfully credited <strong>{successResult.amount} NSC</strong> (≈ £
                {successResult.amount.toFixed(2)}) to {successResult.recipient}.
              </p>
            </div>

            <div className="rounded-xl border border-[#dce8df] bg-[#FAF9F5] p-4 text-left text-xs space-y-2 max-w-sm mx-auto">
              <div className="flex justify-between">
                <span className="text-[#758078]">Gift Amount:</span>
                <span className="font-semibold text-[#18211f]">+{successResult.amount} NSC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#758078]">Pegged Value (1:1):</span>
                <span className="font-mono text-[#18211f]">£{successResult.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#758078]">New Vault NSC Total:</span>
                <span className="font-semibold text-[#18211f]">{successResult.newBalance} NSC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#758078]">Email Notice:</span>
                <span className="text-[#18211f] font-mono font-medium">Dispatched</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-4 rounded-full bg-[#18211f] px-6 py-2.5 text-xs font-medium text-white hover:bg-[#12231f] transition cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-[#1e4a3f] text-white flex items-center justify-center shrink-0">
                <Gift className="size-5" />
              </div>
              <div>
                <h3 className="font-serif text-xl text-[#18211f]">Gift NSC Tokens</h3>
                <p className="text-xs text-[#758078]">
                  Airdrop native platform coins directly into the creator's Web3 Vault.
                </p>
              </div>
            </div>

            {/* Target Recipient Info */}
            <div className="rounded-xl border border-[#ececec] bg-[#FAF9F5] p-3.5 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#758078] font-mono uppercase text-[10px]">Recipient</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-[#59645f] bg-white px-2 py-0.5 rounded-full border border-[#dce8df]">
                  <ShieldCheck className="size-3 text-[#18211f]" />
                  Web3 Vault Ready
                </span>
              </div>
              <p className="text-sm font-semibold text-[#18211f]">
                {userName || targetId || "User"}
              </p>
              {userEmail && <p className="text-xs text-[#758078] font-mono">{userEmail}</p>}
            </div>

            {/* Amount Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#18211f]">Gift Amount (NSC)</label>
                <span className="text-xs font-mono text-[#1e4a3f]">
                  ≈ £{effectiveAmount.toFixed(2)} GBP (1:1 Value)
                </span>
              </div>

              {/* Preset Chips */}
              <div className="grid grid-cols-5 gap-1.5">
                {PRESET_AMOUNTS.map((amt) => {
                  const active = !isCustom && amount === amt;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setAmount(amt);
                        setIsCustom(false);
                      }}
                      className={`rounded-lg py-2 text-xs font-medium transition cursor-pointer border ${
                        active
                          ? "bg-[#18211f] text-white border-[#18211f]"
                          : "bg-white text-[#18211f] border-[#ececec] hover:bg-[#FAF9F5]"
                      }`}
                    >
                      {amt}
                    </button>
                  );
                })}
              </div>

              {/* Custom Amount Field */}
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setIsCustom(!isCustom)}
                  className="text-[11px] text-[#1e4a3f] font-medium hover:underline cursor-pointer"
                >
                  {isCustom ? "← Choose from presets" : "Enter custom amount..."}
                </button>
                {isCustom && (
                  <div className="mt-1 relative">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="e.g. 750"
                      className="w-full rounded-xl border border-[#dce8df] px-3.5 py-2 text-sm text-[#18211f] outline-none focus:border-[#1e4a3f]"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-[#758078] font-mono">
                      NSC
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Reason Selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#18211f]">Reason / Category</label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_REASONS.map((reason) => {
                  const active = !isCustomReason && selectedReason === reason;
                  return (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => {
                        setSelectedReason(reason);
                        setIsCustomReason(false);
                      }}
                      className={`rounded-full px-3 py-1 text-[11px] font-medium transition cursor-pointer border ${
                        active
                          ? "bg-[#1e4a3f] text-white border-[#1e4a3f]"
                          : "bg-white text-[#555555] border-[#ececec] hover:bg-[#FAF9F5]"
                      }`}
                    >
                      {reason}
                    </button>
                  );
                })}
              </div>

              {/* Custom Reason */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsCustomReason(!isCustomReason)}
                  className="text-[11px] text-[#1e4a3f] font-medium hover:underline cursor-pointer"
                >
                  {isCustomReason ? "← Pick standard reason" : "Write custom note..."}
                </button>
                {isCustomReason && (
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="e.g. Special portrait commission bonus"
                    className="mt-1 w-full rounded-xl border border-[#dce8df] px-3.5 py-2 text-xs text-[#18211f] outline-none focus:border-[#1e4a3f]"
                  />
                )}
              </div>
            </div>

            {/* Email Notification Option */}
            <div className="flex items-center justify-between rounded-xl border border-[#ececec] p-3 text-xs">
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-[#1e4a3f]" />
                <span className="text-[#18211f]">Send email notification to recipient</span>
              </div>
              <input
                type="checkbox"
                checked={sendEmailAlert}
                onChange={(e) => setSendEmailAlert(e.target.checked)}
                className="size-4 rounded accent-[#1e4a3f] cursor-pointer"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#ececec]">
              <button
                type="button"
                onClick={onClose}
                disabled={isDispatching}
                className="rounded-full border border-[#ececec] px-4 py-2 text-xs font-medium text-[#758078] hover:bg-[#FAF9F5] transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!isValid || isDispatching}
                onClick={handleDispatchGift}
                className="inline-flex items-center gap-2 rounded-full bg-[#1e4a3f] px-5 py-2 text-xs font-semibold text-white hover:bg-[#123b31] transition cursor-pointer disabled:opacity-50"
              >
                {isDispatching ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Dispatching Gift...</span>
                  </>
                ) : (
                  <>
                    <Gift className="size-3.5" />
                    <span>Confirm & Gift {effectiveAmount} NSC</span>
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
