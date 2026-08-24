import { useEffect, useState } from "react";
import { X, Check, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  fetchAdminPaymentMethods,
  submitConversionFeePayment,
  type AdminPaymentMethod,
  type PayoutRequest,
} from "../../data/db";

/** Field keys that are labels rather than payment details. */
const HIDDEN_DETAIL_KEYS = new Set(["currency", "enabled"]);

function prettyKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

/**
 * Paying an outstanding conversion charge, in the same shape as the
 * verification fee: choose a published payment method, see its details, pay
 * outside the platform, then upload proof so NS CAPTURES can confirm it.
 */
export function SettleChargeModal({
  request,
  contributorName,
  onClose,
  onSubmitted,
}: {
  request: PayoutRequest;
  contributorName: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [methods, setMethods] = useState<AdminPaymentMethod[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAdminPaymentMethods()
      .then((all) => setMethods(all.filter((m) => m.enabled)))
      .catch(() => setMethods([]));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const owed = (request.conversionFeeGbp || 0).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const submit = async () => {
    if (!selectedId) {
      toast.error("Choose how you paid");
      return;
    }
    if (!receipt) {
      toast.error("Upload your proof of transfer");
      return;
    }

    setIsSubmitting(true);
    try {
      const cloudName = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME;
      const preset = (import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET;

      const fd = new FormData();
      fd.append("file", receipt);
      fd.append("upload_preset", preset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Could not upload your receipt");
      const json = await res.json();

      const method = methods.find((m) => m.id === selectedId);
      const ok = await submitConversionFeePayment(
        request.id,
        json.secure_url,
        method?.name || "Payment method",
      );
      if (!ok) throw new Error("Could not record your payment");

      toast.success("Payment submitted", {
        description: "NS CAPTURES will confirm receipt and release your payout.",
      });
      onSubmitted();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Could not submit your payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settle-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#ececec] px-6 py-5">
          <div>
            <p className="font-mono text-[9px] tracking-[0.14em] text-[#758078] uppercase">
              Conversion charge
            </p>
            <h2 id="settle-title" className="mt-1 font-serif text-xl text-[#18211f]">
              Settle £{owed}
            </h2>
            <p className="mt-0.5 text-sm text-[#6b716d]">
              On your {request.payoutCurrency || "currency"} payout of £
              {request.amount.toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-[#758078] transition hover:bg-[#f2f2f2] hover:text-[#18211f]"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <p className="rounded-xl bg-[#f6ecd8] p-3 text-xs text-[#7a5a17]">
            This charge is separate from your payout — you still receive the full converted amount.
            Your payout continues once we have confirmed the charge.
          </p>

          <div>
            <p className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">
              Select payment method
            </p>

            {methods.length === 0 ? (
              <p className="mt-3 text-sm text-[#758078]">
                No payment methods are published yet. Contact NS CAPTURES to arrange payment.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {methods.map((method) => {
                  const isSelected = selectedId === method.id;
                  const details = Object.entries(method.details || {}).filter(
                    ([k, v]) => typeof v === "string" && v && !HIDDEN_DETAIL_KEYS.has(k),
                  );

                  return (
                    <label
                      key={method.id}
                      className={`block cursor-pointer rounded-xl border p-4 transition ${
                        isSelected
                          ? "border-[#1e4a3f] bg-[#f2f7f4]"
                          : "border-[#ececec] hover:border-[#1e4a3f]/40"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="settle-method"
                          value={method.id}
                          checked={isSelected}
                          onChange={() => setSelectedId(method.id)}
                          className="size-4 shrink-0 accent-[#1e4a3f]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-[#18211f]">
                            {method.name}
                          </span>
                          <span className="block font-mono text-[9px] tracking-wider text-[#758078] uppercase">
                            {method.methodType}
                          </span>
                        </span>
                      </span>

                      {isSelected && details.length > 0 && (
                        <dl className="mt-3 space-y-1.5 border-t border-[#1e4a3f]/15 pt-3">
                          {details.map(([k, v]) => (
                            <div key={k} className="flex flex-wrap justify-between gap-2">
                              <dt className="text-xs text-[#59645f]">{prettyKey(k)}</dt>
                              <dd className="font-mono text-xs break-all text-[#18211f]">
                                {String(v)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <label className="block">
            <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">
              Proof of transfer
            </span>
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-dashed border-[#ececec] p-4">
              <Upload className="size-4 shrink-0 text-[#758078]" />
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                className="min-w-0 flex-1 text-sm text-[#4a534e]"
              />
            </div>
            {receipt && (
              <span className="mt-1.5 flex items-center gap-1.5 text-xs text-[#285746]">
                <Check className="size-3.5" /> {receipt.name}
              </span>
            )}
          </label>

          <p className="text-xs text-[#758078]">
            Include your name, {contributorName}, as the payment reference so we can match it.
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-[#ececec] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-full border border-[#ececec] px-5 py-2.5 text-sm font-semibold text-[#4a534e] transition hover:border-[#1e4a3f] hover:text-[#1e4a3f]"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={isSubmitting || !selectedId || !receipt}
            className="rounded-full bg-[#1e4a3f] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#123b31] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? "Submitting…" : "I have paid this charge"}
          </button>
        </div>
      </div>
    </div>
  );
}
