import { useId } from "react";
import {
  OVERRIDABLE_TIERS,
  checkPricing,
  multiplierLabel,
  tierInfo,
  withPricingMode,
  type LicensePricingValue,
  type LicenseTier,
  type PricingMode,
} from "../data/licensing";
import type { Photo } from "../data/photos";

type Rights = Pick<Photo, "license"> & Partial<Pick<Photo, "modelRelease" | "propertyRelease">>;

const labelClass = "font-mono text-[9px] tracking-wider text-[#758078] uppercase";
const inputClass =
  "mt-2 w-full rounded-xl border bg-white px-4 py-2.5 text-sm shadow-sm outline-none transition focus:ring-2";
const MODES: { id: PricingMode; label: string }[] = [
  { id: "auto", label: "Set by NS CAPTURES" },
  { id: "custom", label: "Set my own" },
];

const formatPounds = (value?: number) =>
  value === undefined ? "—" : `£${value.toLocaleString("en-GB")}`;

/**
 * Licence prices for a photograph: NS CAPTURES' automatic prices from one Commercial price, or the
 * photographer's own price for each licence. Photos sold under a single licence get one field.
 */
export function LicensePricingFields({
  value,
  onChange,
  rights,
  compact = false,
}: {
  value: LicensePricingValue;
  onChange: (next: LicensePricingValue) => void;
  rights: Rights;
  /** Stack the fields in one column (portfolio cards) */
  compact?: boolean;
}) {
  const idPrefix = useId();
  const check = checkPricing(value, rights);
  const single = check.tiers.length === 1;
  const custom = !single && value.mode === "custom";

  const priceField = (tier: LicenseTier, raw: string, set: (next: string) => void) => {
    const info = tierInfo(tier);
    const error = check.errors[tier];
    const hintId = `${idPrefix}-${tier}-hint`;
    return (
      <div key={tier}>
        <label className="block">
          <span className={labelClass}>{info.label} price (£)</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={raw}
            onChange={(e) => set(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={hintId}
            className={`${inputClass} ${
              error
                ? "border-[#d4183d] focus:border-[#d4183d] focus:ring-[#d4183d]/10"
                : "border-[#ececec] focus:border-[#1e4a3f] focus:ring-[#1e4a3f]/10"
            }`}
          />
        </label>
        <p
          id={hintId}
          className={`mt-1 text-[10px] leading-4 ${error ? "text-[#d4183d]" : "text-[#8a8f89]"}`}
        >
          {error ?? info.usage}
        </p>
      </div>
    );
  };

  const setBase = (base: string) => onChange({ ...value, base });

  return (
    <div className="rounded-xl border border-[#ececec] bg-[#FAF9F5] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={labelClass}>Licence prices</span>
        {!single && (
          <div
            role="group"
            aria-label="Who sets the licence prices"
            className="inline-flex rounded-full bg-[#f1efe8] p-1"
          >
            {MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                aria-pressed={value.mode === mode.id}
                onClick={() => onChange(withPricingMode(value, mode.id))}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  value.mode === mode.id
                    ? "bg-white text-[#18211f] shadow-sm"
                    : "text-[#4a534e] hover:text-[#18211f]"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {single && (
        <div className="mt-3 space-y-2">
          {priceField(check.tiers[0], value.base, setBase)}
          <p className="text-xs leading-5 text-[#4a534e]">
            {check.tiers[0] === "EDITORIAL"
              ? "Editorial use only, so this is the only licence buyers can choose."
              : "Sold outright: one buyer gets exclusive rights, so this is the only price."}
          </p>
        </div>
      )}

      {!single && !custom && (
        <div className="mt-3">
          {priceField("COMMERCIAL", value.base, setBase)}
          <dl className="mt-3 divide-y divide-[#ececec] rounded-xl border border-[#ececec] bg-white">
            {OVERRIDABLE_TIERS.map((tier) => (
              <div key={tier} className="flex items-center justify-between gap-3 px-3 py-2">
                <dt className="text-sm text-[#4a534e]">
                  {tierInfo(tier).label}
                  <span className="ml-1.5 text-[11px] text-[#8a8f89]">{multiplierLabel(tier)}</span>
                </dt>
                <dd className="text-sm font-medium text-[#18211f]">
                  {formatPounds(check.prices[tier])}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[10px] leading-4 text-[#8a8f89]">
            Change the Commercial price and the others follow. Choose “Set my own” to price each
            licence yourself.
          </p>
        </div>
      )}

      {custom && (
        <div className="mt-3 space-y-3">
          <div className={`grid gap-4 ${compact ? "grid-cols-1" : "sm:grid-cols-2"}`}>
            {priceField("COMMERCIAL", value.base, setBase)}
            {OVERRIDABLE_TIERS.map((tier) =>
              priceField(tier, value.custom[tier], (next) =>
                onChange({ ...value, custom: { ...value.custom, [tier]: next } }),
              ),
            )}
          </div>
          {check.warning && (
            <p className="rounded-xl bg-[#f6ecd8] p-3 text-xs text-[#7a5a17]">{check.warning}</p>
          )}
        </div>
      )}
    </div>
  );
}
