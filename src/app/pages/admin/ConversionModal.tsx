import { useState } from "react";
import { X } from "lucide-react";
import { CURRENCY_GROUPS, currencySymbol } from "../../../lib/currencies";
import {
  DEFAULT_CONVERSION_FEE_PERCENT,
  quoteConversion,
  formatConverted,
  type ConversionQuote,
} from "../../data/conversion";

export interface ConversionResult extends ConversionQuote {
  currency: string;
}

/**
 * Applied when a payout reaches the Currency Conversion stage. The admin enters
 * the rate they actually got and the charge to apply; every figure shown here
 * is the same arithmetic that gets stored and shown to the contributor.
 */
export function ConversionModal({
  amount,
  contributorName,
  defaultCurrency,
  defaultFeePercent = DEFAULT_CONVERSION_FEE_PERCENT,
  onConfirm,
  onCancel,
}: {
  amount: number;
  contributorName: string;
  defaultCurrency: string;
  defaultFeePercent?: number;
  onConfirm: (result: ConversionResult) => void;
  onCancel: () => void;
}) {
  const [currency, setCurrency] = useState(defaultCurrency);
  const [rate, setRate] = useState("");
  const [feePercent, setFeePercent] = useState(String(defaultFeePercent));

  const quote = quoteConversion(amount, Number(rate), Number(feePercent));
  const canConfirm = Number(rate) > 0;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conversion-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#ececec] px-6 py-5">
          <div>
            <p className="font-mono text-[9px] tracking-[0.14em] text-[#758078] uppercase">
              Currency Conversion
            </p>
            <h2 id="conversion-title" className="mt-1 font-serif text-xl text-[#18211f]">
              Convert £{amount.toLocaleString()}
            </h2>
            <p className="mt-0.5 text-sm text-[#6b716d]">Payout to {contributorName}</p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Cancel conversion"
            className="rounded-full p-1.5 text-[#758078] transition hover:bg-[#f2f2f2] hover:text-[#18211f]"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <label className="block">
            <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">
              Payout currency
            </span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#ececec] bg-white px-3 py-2 text-sm outline-none focus:border-[#1e4a3f]"
            >
              {CURRENCY_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <span className="mt-1 block text-xs text-[#758078]">
              Defaults to the contributor's own payout currency.
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">
                Rate ({currency} per £1)
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="e.g. 1750"
                autoFocus
                className="mt-1.5 w-full rounded-lg border border-[#ececec] bg-white px-3 py-2 text-sm outline-none focus:border-[#1e4a3f]"
              />
            </label>

            <label className="block">
              <span className="font-mono text-[9px] tracking-wider text-[#758078] uppercase">
                Conversion charge (%)
              </span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={feePercent}
                onChange={(e) => setFeePercent(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#ececec] bg-white px-3 py-2 text-sm outline-none focus:border-[#1e4a3f]"
              />
            </label>
          </div>

          <div className="rounded-xl border border-[#ececec] bg-[#FAF9F5] p-5">
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[#59645f]">Amount converted</dt>
                <dd className="tabular-nums text-[#18211f]">
                  {currencySymbol("GBP")}
                  {amount.toLocaleString()}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[#59645f]">Converted at {rate || "—"}</dt>
                <dd className="tabular-nums text-[#18211f]">
                  {canConfirm ? formatConverted(quote.grossConverted, currency) : "—"}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[#59645f]">Conversion charge ({quote.feePercent}%)</dt>
                <dd className="tabular-nums text-[#9c3320]">
                  {canConfirm ? `− ${formatConverted(quote.feeAmount, currency)}` : "—"}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-[#e4e2da] pt-2.5">
                <dt className="font-semibold text-[#18211f]">Contributor receives</dt>
                <dd className="font-serif text-lg tabular-nums text-[#18211f]">
                  {canConfirm ? formatConverted(quote.netConverted, currency) : "—"}
                </dd>
              </div>
            </dl>
          </div>

          <p className="text-xs text-[#758078]">
            These figures are recorded on the payout and shown to the contributor on their timeline,
            so enter the rate you actually received.
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-[#ececec] px-6 py-4">
          <button
            onClick={onCancel}
            className="rounded-full border border-[#ececec] px-5 py-2.5 text-sm font-semibold text-[#4a534e] transition hover:border-[#1e4a3f] hover:text-[#1e4a3f]"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ ...quote, currency })}
            disabled={!canConfirm}
            className="rounded-full bg-[#1e4a3f] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#123b31] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Apply conversion
          </button>
        </div>
      </div>
    </div>
  );
}
