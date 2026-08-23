/**
 * Countries offered at registration, each mapped to the payout currency used
 * there. Every currency named here exists in currencies.ts — a contributor's
 * default payout currency comes from this map, and they (or an admin) can
 * override it.
 */

export interface Country {
  name: string;
  currency: string;
}

export const COUNTRIES: Country[] = [
  { name: "Albania", currency: "ALL" },
  { name: "Andorra", currency: "EUR" },
  { name: "Argentina", currency: "ARS" },
  { name: "Armenia", currency: "AMD" },
  { name: "Australia", currency: "AUD" },
  { name: "Austria", currency: "EUR" },
  { name: "Azerbaijan", currency: "AZN" },
  { name: "Bahamas", currency: "BSD" },
  { name: "Bahrain", currency: "BHD" },
  { name: "Bangladesh", currency: "BDT" },
  { name: "Barbados", currency: "BBD" },
  { name: "Belgium", currency: "EUR" },
  { name: "Bolivia", currency: "BOB" },
  { name: "Bosnia and Herzegovina", currency: "BAM" },
  { name: "Brazil", currency: "BRL" },
  { name: "Brunei", currency: "BND" },
  { name: "Bulgaria", currency: "BGN" },
  { name: "Cambodia", currency: "KHR" },
  { name: "Canada", currency: "CAD" },
  { name: "Chile", currency: "CLP" },
  { name: "China", currency: "CNY" },
  { name: "Colombia", currency: "COP" },
  { name: "Costa Rica", currency: "CRC" },
  { name: "Croatia", currency: "EUR" },
  { name: "Cyprus", currency: "EUR" },
  { name: "Czechia", currency: "CZK" },
  { name: "Denmark", currency: "DKK" },
  { name: "Dominican Republic", currency: "DOP" },
  { name: "Ecuador", currency: "USD" },
  { name: "El Salvador", currency: "USD" },
  { name: "Estonia", currency: "EUR" },
  { name: "Fiji", currency: "FJD" },
  { name: "Finland", currency: "EUR" },
  { name: "France", currency: "EUR" },
  { name: "Georgia", currency: "GEL" },
  { name: "Germany", currency: "EUR" },
  { name: "Greece", currency: "EUR" },
  { name: "Guatemala", currency: "GTQ" },
  { name: "Hong Kong", currency: "HKD" },
  { name: "Hungary", currency: "HUF" },
  { name: "Iceland", currency: "ISK" },
  { name: "India", currency: "INR" },
  { name: "Indonesia", currency: "IDR" },
  { name: "Iraq", currency: "IQD" },
  { name: "Ireland", currency: "EUR" },
  { name: "Israel", currency: "ILS" },
  { name: "Italy", currency: "EUR" },
  { name: "Jamaica", currency: "JMD" },
  { name: "Japan", currency: "JPY" },
  { name: "Jordan", currency: "JOD" },
  { name: "Kazakhstan", currency: "KZT" },
  { name: "Kuwait", currency: "KWD" },
  { name: "Kyrgyzstan", currency: "KGS" },
  { name: "Laos", currency: "LAK" },
  { name: "Latvia", currency: "EUR" },
  { name: "Lebanon", currency: "LBP" },
  { name: "Liechtenstein", currency: "CHF" },
  { name: "Lithuania", currency: "EUR" },
  { name: "Luxembourg", currency: "EUR" },
  { name: "Macao", currency: "MOP" },
  { name: "Malaysia", currency: "MYR" },
  { name: "Malta", currency: "EUR" },
  { name: "Mexico", currency: "MXN" },
  { name: "Moldova", currency: "MDL" },
  { name: "Monaco", currency: "EUR" },
  { name: "Mongolia", currency: "MNT" },
  { name: "Montenegro", currency: "EUR" },
  { name: "Nepal", currency: "NPR" },
  { name: "Netherlands", currency: "EUR" },
  { name: "New Zealand", currency: "NZD" },
  { name: "North Macedonia", currency: "MKD" },
  { name: "Norway", currency: "NOK" },
  { name: "Oman", currency: "OMR" },
  { name: "Pakistan", currency: "PKR" },
  { name: "Panama", currency: "USD" },
  { name: "Papua New Guinea", currency: "PGK" },
  { name: "Paraguay", currency: "PYG" },
  { name: "Peru", currency: "PEN" },
  { name: "Philippines", currency: "PHP" },
  { name: "Poland", currency: "PLN" },
  { name: "Portugal", currency: "EUR" },
  { name: "Qatar", currency: "QAR" },
  { name: "Romania", currency: "RON" },
  { name: "Russia", currency: "RUB" },
  { name: "San Marino", currency: "EUR" },
  { name: "Saudi Arabia", currency: "SAR" },
  { name: "Serbia", currency: "RSD" },
  { name: "Singapore", currency: "SGD" },
  { name: "Slovakia", currency: "EUR" },
  { name: "Slovenia", currency: "EUR" },
  { name: "South Korea", currency: "KRW" },
  { name: "Spain", currency: "EUR" },
  { name: "Sri Lanka", currency: "LKR" },
  { name: "Sweden", currency: "SEK" },
  { name: "Switzerland", currency: "CHF" },
  { name: "Taiwan", currency: "TWD" },
  { name: "Thailand", currency: "THB" },
  { name: "Trinidad and Tobago", currency: "TTD" },
  { name: "Türkiye", currency: "TRY" },
  { name: "Ukraine", currency: "UAH" },
  { name: "United Arab Emirates", currency: "AED" },
  { name: "United Kingdom", currency: "GBP" },
  { name: "United States", currency: "USD" },
  { name: "Uruguay", currency: "UYU" },
  { name: "Uzbekistan", currency: "UZS" },
  { name: "Vietnam", currency: "VND" },
];

const BY_NAME = new Map(COUNTRIES.map((c) => [c.name.toLowerCase(), c]));

/** The currency normally used in a country. Undefined if we don't cover it. */
export function currencyForCountry(country: string | null | undefined): string | undefined {
  if (!country) return undefined;
  return BY_NAME.get(country.trim().toLowerCase())?.currency;
}

/**
 * The currency a contributor should be paid in: their explicit choice if they
 * have made one, otherwise the currency of the country they registered from,
 * and GBP as the platform's own currency if neither is known.
 */
export function resolvePayoutCurrency(
  chosenCurrency: string | null | undefined,
  country: string | null | undefined,
): string {
  return chosenCurrency || currencyForCountry(country) || "GBP";
}
