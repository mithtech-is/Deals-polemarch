/**
 * Centralised price formatters. All prices are INR. Importing from here
 * keeps the invariant (2 decimal places, en-IN grouping) in one place.
 */

const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function round2(value: number | string | null | undefined): number {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/** Format a price with Indian grouping, no symbol: "1,23,456.78". */
export function formatPrice(
  value: number | string | null | undefined
): string {
  return INR_FORMATTER.format(round2(value));
}

/**
 * Bare number for schema.org Offer.price — "123456.78" (no separators).
 */
export function formatPriceForSchema(
  value: number | string | null | undefined
): string {
  return round2(value).toFixed(2);
}
