/**
 * Working out a payout conversion. Kept separate from the UI so the figures
 * the admin sees in the modal, the figures stored on the payout, and the
 * figures shown to the contributor are all produced by the same arithmetic.
 */

export const DEFAULT_CONVERSION_FEE_PERCENT = 3.7;

export interface ConversionQuote {
  /** Amount leaving NS CAPTURES, in GBP. */
  amount: number;
  /** Units of the payout currency per £1. */
  rate: number;
  feePercent: number;
  /** Converted before any charge. */
  grossConverted: number;
  /** The conversion charge, in the payout currency. */
  feeAmount: number;
  /** What actually reaches the contributor. */
  netConverted: number;
}

export function quoteConversion(amount: number, rate: number, feePercent: number): ConversionQuote {
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const safeRate = Number.isFinite(rate) && rate > 0 ? rate : 0;
  // A negative charge would quietly pay out more than was converted.
  const safeFee = Number.isFinite(feePercent) && feePercent >= 0 ? Math.min(feePercent, 100) : 0;

  const grossConverted = safeAmount * safeRate;
  const feeAmount = grossConverted * (safeFee / 100);

  return {
    amount: safeAmount,
    rate: safeRate,
    feePercent: safeFee,
    grossConverted,
    feeAmount,
    netConverted: grossConverted - feeAmount,
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
  return (
    `£${quote.amount.toLocaleString()} converted at ${quote.rate.toLocaleString("en-GB", {
      maximumFractionDigits: 6,
    })} ${currency}/£, ` +
    `less a ${quote.feePercent}% conversion charge of ${formatConverted(quote.feeAmount, currency)} — ` +
    `${formatConverted(quote.netConverted, currency)} to be delivered.`
  );
}
