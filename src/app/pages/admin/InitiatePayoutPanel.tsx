import { useMemo, useState } from "react";
import { toast } from "sonner";
import { adminInitiatePayout, type PayoutRequest } from "../../data/db";

/**
 * Raises a withdrawal for a contributor who cannot reach the form themselves —
 * a support-assisted request.
 *
 * The amount is bounded by the contributor's real balance. The database
 * function checks it again on the way in, so a stale figure on this screen
 * cannot produce a payout the ledger will not honour.
 */

export interface PayoutCandidate {
  slug: string;
  name: string;
  balance: number;
}

const METHODS = [
  { id: "local_bank", label: "Registered Bank Account" },
  { id: "card", label: "Registered Card" },
  { id: "paypal", label: "PayPal Account" },
  { id: "crypto", label: "Crypto Wallet" },
] as const;

export function InitiatePayoutPanel({
  candidates,
  onCreated,
}: {
  candidates: PayoutCandidate[];
  onCreated: (request: PayoutRequest) => void;
}) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<(typeof METHODS)[number]["id"]>("local_bank");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = useMemo(() => candidates.find((c) => c.slug === slug), [candidates, slug]);
  const parsed = Number(amount);
  const amountValid = Number.isFinite(parsed) && parsed > 0;
  const overBalance = Boolean(selected && amountValid && parsed > selected.balance);
  const canSubmit = Boolean(selected) && amountValid && !overBalance && !saving;

  const reset = () => {
    setSlug("");
    setAmount("");
    setMethod("local_bank");
    setNote("");
  };

  const submit = async () => {
    if (!selected || !amountValid) return;
    setSaving(true);
    const result = await adminInitiatePayout(selected.slug, parsed, method, {}, note || undefined);
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error || "Could not raise the withdrawal");
      return;
    }

    toast.success(`Withdrawal raised for ${selected.name}`);
    onCreated({
      id: result.id as string,
      photographerId: selected.slug,
      amount: parsed,
      method,
      details: {},
      status: "PENDING",
      stage: "requested",
      adminNote: note,
      requestedAt: new Date().toISOString(),
      processedAt: null,
      payoutCurrency: null,
      conversionRate: null,
      conversionFeePercent: null,
      conversionFeeAmount: null,
      conversionFeeBearer: null,
      conversionFeeGbp: null,
      conversionFeeStatus: null,
      conversionFeePaidAt: null,
      convertedAmount: null,
      transactionReference: null,
      debitedAt: null,
      initiatedBy: "self",
      reinitiatedFrom: null,
      returnedReason: null,
      estimatedArrival: null,
    });
    reset();
    setOpen(false);
  };

  return (
    <div className="mb-5 rounded-2xl border border-[#ececec] bg-[#f8f9f7]">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
      >
        <span className="min-w-0">
          <span className="block font-serif text-base text-[#18211f]">
            Raise a withdrawal for a contributor
          </span>
          <span className="mt-0.5 block text-xs text-[#6b716d]">
            For support cases where the contributor cannot submit the request themselves.
          </span>
        </span>
        <span className="shrink-0 font-mono text-xs text-[#1e4a3f]">{open ? "Close" : "Open"}</span>
      </button>

      {open && (
        <div className="border-t border-[#ececec] px-4 py-4 sm:px-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#8a8f89]">
                Contributor
              </span>
              <select
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#ececec] bg-white px-3 py-2 text-sm outline-none focus:border-[#1e4a3f]"
              >
                <option value="">Select a contributor…</option>
                {candidates.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name} — £{c.balance.toLocaleString()} available
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#8a8f89]">
                Amount (GBP)
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1 w-full rounded-lg border border-[#ececec] bg-white px-3 py-2 text-sm outline-none focus:border-[#1e4a3f]"
              />
              {selected && (
                <span
                  className={`mt-1 block text-[11px] ${overBalance ? "text-[#9b2c2c]" : "text-[#6b716d]"}`}
                >
                  {overBalance
                    ? `Over the available balance of £${selected.balance.toLocaleString()}`
                    : `Available: £${selected.balance.toLocaleString()}`}
                </span>
              )}
            </label>

            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#8a8f89]">
                Method
              </span>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as typeof method)}
                className="mt-1 w-full rounded-lg border border-[#ececec] bg-white px-3 py-2 text-sm outline-none focus:border-[#1e4a3f]"
              >
                {METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#8a8f89]">
                Note (shown on the timeline)
              </span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why this was raised on their behalf"
                className="mt-1 w-full rounded-lg border border-[#ececec] bg-white px-3 py-2 text-sm outline-none focus:border-[#1e4a3f]"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <button
              onClick={() => {
                reset();
                setOpen(false);
              }}
              className="rounded-full border border-[#ececec] px-4 py-2 text-xs font-semibold text-[#6b716d] transition hover:border-[#1e4a3f] hover:text-[#1e4a3f]"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="rounded-full bg-[#1e4a3f] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#123b31] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Raising…" : "Raise withdrawal"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
