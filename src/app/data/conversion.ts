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
  /** What reaches the contributor. The charge is never taken out of this. */
  netConverted: number;
  /** What the contributor owes separately, in GBP. Zero if NS CAPTURES pays. */
  outstandingGbp: number;
  /** The same debt in the payout currency. */
  outstandingConverted: number;
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

  // The charge never comes out of the withdrawal. The contributor always
  // receives the full converted amount; when they bear the charge it becomes a
  // separate outstanding balance for them to settle, and when NS CAPTURES
  // bears it there is nothing to settle at all.
  const contributorPays = bearer === "contributor";

  return {
    amount: safeAmount,
    rate: safeRate,
    feePercent: safeFee,
    bearer,
    grossConverted,
    feeAmount,
    feeAmountGbp,
    netConverted: grossConverted,
    outstandingGbp: contributorPays ? feeAmountGbp : 0,
    outstandingConverted: contributorPays ? feeAmount : 0,
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
      ? `. A ${quote.feePercent}% conversion charge of £${quote.outstandingGbp.toFixed(
          2,
        )} is payable by the contributor separately`
      : `. The ${quote.feePercent}% conversion charge of ${formatConverted(
          quote.feeAmount,
          currency,
        )} is paid by NS CAPTURES`;

  return `${head}${charge} — ${formatConverted(quote.netConverted, currency)} to be delivered.`;
}
