/**
 * Working out a payout conversion. Kept separate from the UI so the figures
 * the admin sees in the modal, the figures stored on the payout, and the
 * figures shown to the contributor are all produced by the same arithmetic.
 */

export const DEFAULT_CONVERSION_FEE_PERCENT = 3.7;

/** Who absorbs the conversion charge. */
export type FeeBearer = "contributor" | "company";

export interface ConversionQuote {
  /** Amount leaving NS CAPTURES, in GBP. */
  amount: number;
  /** Units of the payout currency per £1. */
  rate: number;
  feePercent: number;
  bearer: FeeBearer;
  /** Converted before any charge. */
  grossConverted: number;
  /** The conversion charge, in the payout currency. */
  feeAmount: number;
  /** The same charge expressed in GBP. */
  feeAmountGbp: number;
  /** What actually reaches the contributor. */
  netConverted: number;
  /** What leaves NS CAPTURES, in GBP — the payout plus any charge it absorbs. */
  companyCostGbp: number;
}

export function quoteConversion(
  amount: number,
  rate: number,
  feePercent: number,
  bearer: FeeBearer = "contributor",
): ConversionQuote {
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const safeRate = Number.isFinite(rate) && rate > 0 ? rate : 0;
  // A negative charge would quietly pay out more than was converted.
  const safeFee = Number.isFinite(feePercent) && feePercent >= 0 ? Math.min(feePercent, 100) : 0;

  const grossConverted = safeAmount * safeRate;
  const feeAmount = grossConverted * (safeFee / 100);
  const feeAmountGbp = safeAmount * (safeFee / 100);

  // When the contributor bears the charge it comes out of what they receive.
  // When NS CAPTURES bears it, the charge is added on top: the contributor
  // receives the full converted amount and the company sends more.
  const contributorPays = bearer === "contributor";

  return {
    amount: safeAmount,
    rate: safeRate,
    feePercent: safeFee,
    bearer,
    grossConverted,
    feeAmount,
    feeAmountGbp,
    netConverted: contributorPays ? grossConverted - feeAmount : grossConverted,
    companyCostGbp: contributorPays ? safeAmount : safeAmount + feeAmountGbp,
  };
}

/**
 * Currencies conventionally written without decimal places. Showing
 * ¥1,250,000.00 or ₩16,852,500.00 reads as an error to anyone who uses them.
 */
const ZERO_DECIMAL = new Set([
  "JPY",
  "KRW",
  "VND",
  "IDR",
  "CLP",
  "PYG",
  "ISK",
  "HUF",
  "COP",
  "LAK",
  "KHR",
  "MNT",
  "UZS",
  "IQD",
  "LBP",
]);

export function formatConverted(amount: number, currency: string): string {
  const digits = ZERO_DECIMAL.has(currency) ? 0 : 2;
  return `${amount.toLocaleString("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} ${currency}`;
}

/** One line summarising a conversion, for the timeline and the audit note. */
export function conversionSummary(quote: ConversionQuote, currency: string): string {
  const head = `£${quote.amount.toLocaleString()} converted at ${quote.rate.toLocaleString(
    "en-GB",
    {
      maximumFractionDigits: 6,
    },
  )} ${currency}/£`;

  const charge =
    quote.bearer === "contributor"
      ? `, less a ${quote.feePercent}% conversion charge of ${formatConverted(quote.feeAmount, currency)}`
      : `. The ${quote.feePercent}% conversion charge of ${formatConverted(
          quote.feeAmount,
          currency,
        )} is paid by NS CAPTURES`;

  return `${head}${charge} — ${formatConverted(quote.netConverted, currency)} to be delivered.`;
}
