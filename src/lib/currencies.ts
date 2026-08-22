/**
 * Payout currencies offered across the platform (creator payout methods and
 * admin payment methods). Codes are ISO 4217 and are stored verbatim in the
 * `details.currency` field of payment method records.
 */

export type CurrencyOption = {
  code: string;
  symbol: string;
  name: string;
};

export type CurrencyGroup = {
  label: string;
  currencies: CurrencyOption[];
};

export const CURRENCY_GROUPS: CurrencyGroup[] = [
  {
    label: "Europe",
    currencies: [
      { code: "GBP", symbol: "£", name: "British Pound" },
      { code: "EUR", symbol: "€", name: "Euro" },
      { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
      { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
      { code: "SEK", symbol: "kr", name: "Swedish Krona" },
      { code: "DKK", symbol: "kr", name: "Danish Krone" },
      { code: "ISK", symbol: "kr", name: "Icelandic Krona" },
      { code: "PLN", symbol: "zł", name: "Polish Zloty" },
      { code: "CZK", symbol: "Kč", name: "Czech Koruna" },
      { code: "HUF", symbol: "Ft", name: "Hungarian Forint" },
      { code: "RON", symbol: "lei", name: "Romanian Leu" },
      { code: "BGN", symbol: "лв", name: "Bulgarian Lev" },
      { code: "RSD", symbol: "дин", name: "Serbian Dinar" },
      { code: "BAM", symbol: "KM", name: "Bosnia-Herzegovina Mark" },
      { code: "MKD", symbol: "ден", name: "Macedonian Denar" },
      { code: "ALL", symbol: "L", name: "Albanian Lek" },
      { code: "MDL", symbol: "L", name: "Moldovan Leu" },
      { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia" },
      { code: "RUB", symbol: "₽", name: "Russian Ruble" },
      { code: "TRY", symbol: "₺", name: "Turkish Lira" },
      { code: "GEL", symbol: "₾", name: "Georgian Lari" },
      { code: "AMD", symbol: "֏", name: "Armenian Dram" },
      { code: "AZN", symbol: "₼", name: "Azerbaijani Manat" },
    ],
  },
  {
    label: "North America",
    currencies: [
      { code: "USD", symbol: "$", name: "US Dollar" },
      { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
      { code: "MXN", symbol: "Mex$", name: "Mexican Peso" },
    ],
  },
  {
    label: "Latin America & Caribbean",
    currencies: [
      { code: "BRL", symbol: "R$", name: "Brazilian Real" },
      { code: "ARS", symbol: "AR$", name: "Argentine Peso" },
      { code: "CLP", symbol: "CLP$", name: "Chilean Peso" },
      { code: "COP", symbol: "COL$", name: "Colombian Peso" },
      { code: "PEN", symbol: "S/", name: "Peruvian Sol" },
      { code: "UYU", symbol: "$U", name: "Uruguayan Peso" },
      { code: "PYG", symbol: "₲", name: "Paraguayan Guarani" },
      { code: "BOB", symbol: "Bs", name: "Bolivian Boliviano" },
      { code: "CRC", symbol: "₡", name: "Costa Rican Colon" },
      { code: "GTQ", symbol: "Q", name: "Guatemalan Quetzal" },
      { code: "DOP", symbol: "RD$", name: "Dominican Peso" },
      { code: "JMD", symbol: "J$", name: "Jamaican Dollar" },
      { code: "TTD", symbol: "TT$", name: "Trinidad & Tobago Dollar" },
      { code: "BSD", symbol: "B$", name: "Bahamian Dollar" },
      { code: "BBD", symbol: "Bds$", name: "Barbadian Dollar" },
    ],
  },
  {
    label: "Asia",
    currencies: [
      { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
      { code: "JPY", symbol: "¥", name: "Japanese Yen" },
      { code: "KRW", symbol: "₩", name: "South Korean Won" },
      { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
      { code: "TWD", symbol: "NT$", name: "New Taiwan Dollar" },
      { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
      { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
      { code: "THB", symbol: "฿", name: "Thai Baht" },
      { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
      { code: "PHP", symbol: "₱", name: "Philippine Peso" },
      { code: "VND", symbol: "₫", name: "Vietnamese Dong" },
      { code: "INR", symbol: "₹", name: "Indian Rupee" },
      { code: "PKR", symbol: "₨", name: "Pakistani Rupee" },
      { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
      { code: "LKR", symbol: "Rs", name: "Sri Lankan Rupee" },
      { code: "NPR", symbol: "रू", name: "Nepalese Rupee" },
      { code: "KHR", symbol: "៛", name: "Cambodian Riel" },
      { code: "LAK", symbol: "₭", name: "Lao Kip" },
      { code: "MNT", symbol: "₮", name: "Mongolian Tugrik" },
      { code: "BND", symbol: "B$", name: "Brunei Dollar" },
      { code: "MOP", symbol: "MOP$", name: "Macanese Pataca" },
      { code: "KZT", symbol: "₸", name: "Kazakhstani Tenge" },
      { code: "UZS", symbol: "soʻm", name: "Uzbekistani Som" },
      { code: "KGS", symbol: "с", name: "Kyrgyzstani Som" },
    ],
  },
  {
    label: "Middle East",
    currencies: [
      { code: "AED", symbol: "AED", name: "UAE Dirham" },
      { code: "SAR", symbol: "SR", name: "Saudi Riyal" },
      { code: "QAR", symbol: "QR", name: "Qatari Riyal" },
      { code: "KWD", symbol: "KD", name: "Kuwaiti Dinar" },
      { code: "BHD", symbol: "BD", name: "Bahraini Dinar" },
      { code: "OMR", symbol: "RO", name: "Omani Rial" },
      { code: "JOD", symbol: "JD", name: "Jordanian Dinar" },
      { code: "ILS", symbol: "₪", name: "Israeli Shekel" },
      { code: "IQD", symbol: "ID", name: "Iraqi Dinar" },
      { code: "LBP", symbol: "LL", name: "Lebanese Pound" },
    ],
  },
  {
    label: "Oceania",
    currencies: [
      { code: "AUD", symbol: "A$", name: "Australian Dollar" },
      { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
      { code: "FJD", symbol: "FJ$", name: "Fijian Dollar" },
      { code: "PGK", symbol: "K", name: "Papua New Guinean Kina" },
    ],
  },
];

export const CURRENCIES: CurrencyOption[] = CURRENCY_GROUPS.flatMap((g) => g.currencies);

const CURRENCY_BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

export function getCurrency(code: string | null | undefined): CurrencyOption | undefined {
  return code ? CURRENCY_BY_CODE.get(code.toUpperCase()) : undefined;
}

export function currencySymbol(code: string | null | undefined): string {
  return getCurrency(code)?.symbol || (code || "").toUpperCase();
}

/** Dropdown label, e.g. "GBP (£) — British Pound" or "CHF — Swiss Franc". */
export function currencyLabel(currency: CurrencyOption): string {
  return currency.symbol === currency.code
    ? `${currency.code} — ${currency.name}`
    : `${currency.code} (${currency.symbol}) — ${currency.name}`;
}
