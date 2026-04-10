/**
 * Centralised price formatters. Product policy: prices are quoted to
 * exactly 2 decimal places everywhere — buy box, cart, checkout, deal
 * cards, charts, JSON-LD, SEO metadata. Importing from here keeps that
 * invariant in one place so we can change formatting (currency symbol,
 * locale, fraction digits) without grepping the codebase.
 */

import {
  DEFAULT_CURRENCY_CODE,
  currencyMeta,
  formatAmount,
  formatMoney,
  type CurrencyCode,
} from "./currency";

const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Round any number to 2 decimal places (banker-friendly half-away-from-zero). */
export function round2(value: number | string | null | undefined): number {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Format a price with the currency's native grouping, no symbol.
 * Defaults to the build-time DEFAULT_CURRENCY_CODE. Client components
 * that need the *live* user-selected currency should call
 * `useCurrency().formatAmount()` from CurrencyContext instead.
 */
export function formatPrice(
  value: number | string | null | undefined,
  currency: CurrencyCode = DEFAULT_CURRENCY_CODE
): string {
  if (currency === "INR") return INR_FORMATTER.format(round2(value));
  return formatAmount(round2(value), currency);
}

/** Format a price with the currency symbol prefix: "₹ 1,23,456.78". */
export function formatPriceWithSymbol(
  value: number | string | null | undefined,
  currency: CurrencyCode = DEFAULT_CURRENCY_CODE
): string {
  if (currency === "INR") return `₹ ${formatPrice(value, "INR")}`;
  return formatMoney(round2(value), currency);
}

/**
 * String safe for schema.org Offer.price — bare number with 2 decimals,
 * no thousands separators (e.g. "123456.78"). Schema.org rejects locale
 * separators in numeric properties.
 */
export function formatPriceForSchema(
  value: number | string | null | undefined
): string {
  return round2(value).toFixed(2);
}
