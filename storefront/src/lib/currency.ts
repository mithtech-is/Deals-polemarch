/**
 * Default-currency configuration. Site-wide default comes from the
 * `NEXT_PUBLIC_DEFAULT_CURRENCY` env var (falls back to INR). A user can
 * override the default via the currency switcher in the header — the
 * override is persisted in localStorage and surfaced through the
 * `CurrencyContext` React context.
 *
 * All formatters in this file accept an explicit `currency` parameter so
 * they can be called from both client components (which read the context)
 * and server components (which fall back to the env-var default).
 */

export type CurrencyCode = "INR" | "USD" | "EUR" | "GBP" | "SGD" | "AED" | "JPY";

export type SiteDisplayScale =
  | "auto"
  | "units"
  | "thousands"
  | "lakhs"
  | "crores"
  | "millions"
  | "billions";

export type SiteSettingsPayload = {
  defaultCurrency: CurrencyCode;
  defaultScale: SiteDisplayScale;
};

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const MEDUSA_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

/**
 * Fetch site-wide defaults from Medusa's proxy. Used by the
 * CurrencyProvider as the primary source of truth. Falls back to the
 * env-var / INR default when the network is unreachable.
 */
export async function fetchSiteSettings(): Promise<SiteSettingsPayload | null> {
  try {
    const res = await fetch(`${MEDUSA_URL}/store/calcula/site-settings`, {
      cache: "no-store",
      headers: MEDUSA_PUBLISHABLE_KEY
        ? { "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY }
        : undefined,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as Partial<SiteSettingsPayload>;
    const code = String(body.defaultCurrency || "").toUpperCase();
    const scale = String(body.defaultScale || "auto");
    return {
      defaultCurrency: isCurrencyCode(code) ? code : "INR",
      defaultScale: [
        "auto",
        "units",
        "thousands",
        "lakhs",
        "crores",
        "millions",
        "billions",
      ].includes(scale)
        ? (scale as SiteDisplayScale)
        : "auto",
    };
  } catch {
    return null;
  }
}

export const SUPPORTED_CURRENCIES: ReadonlyArray<{
  code: CurrencyCode;
  label: string;
  symbol: string;
  locale: string;
}> = [
  { code: "INR", label: "Indian Rupee",   symbol: "₹",  locale: "en-IN" },
  { code: "USD", label: "US Dollar",      symbol: "$",  locale: "en-US" },
  { code: "EUR", label: "Euro",           symbol: "€",  locale: "de-DE" },
  { code: "GBP", label: "British Pound",  symbol: "£",  locale: "en-GB" },
  { code: "SGD", label: "Singapore Dollar", symbol: "S$", locale: "en-SG" },
  { code: "AED", label: "UAE Dirham",     symbol: "AED ", locale: "en-AE" },
  { code: "JPY", label: "Japanese Yen",   symbol: "¥",  locale: "ja-JP" },
];

export function isCurrencyCode(v: unknown): v is CurrencyCode {
  return (
    typeof v === "string" &&
    SUPPORTED_CURRENCIES.some((c) => c.code === v)
  );
}

/**
 * Build-time default. Set `NEXT_PUBLIC_DEFAULT_CURRENCY=USD` in
 * `storefront/.env.local` to change the site-wide default. Anything
 * unrecognised falls back to INR so the storefront never renders a blank
 * currency.
 */
export const DEFAULT_CURRENCY_CODE: CurrencyCode = (() => {
  const raw = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY;
  return isCurrencyCode(raw) ? raw : "INR";
})();

export function currencyMeta(code: CurrencyCode) {
  return (
    SUPPORTED_CURRENCIES.find((c) => c.code === code) ??
    SUPPORTED_CURRENCIES[0]
  );
}

export function currencySymbol(code: CurrencyCode): string {
  return currencyMeta(code).symbol;
}

/** Format an amount with the currency's native grouping. No symbol. */
export function formatAmount(
  value: number | string | null | undefined,
  code: CurrencyCode = DEFAULT_CURRENCY_CODE,
  fractionDigits = 2
): string {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  if (!Number.isFinite(n)) return "0.00";
  const meta = currencyMeta(code);
  return new Intl.NumberFormat(meta.locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n);
}

/** Format with the currency symbol prefix: "₹ 1,23,456.78". */
export function formatMoney(
  value: number | string | null | undefined,
  code: CurrencyCode = DEFAULT_CURRENCY_CODE,
  fractionDigits = 2
): string {
  const meta = currencyMeta(code);
  const sym = meta.symbol.trim();
  const needsSpace = !meta.symbol.endsWith(" ");
  return `${sym}${needsSpace ? " " : ""}${formatAmount(value, code, fractionDigits)}`;
}

/**
 * Short form with K/L/Cr/M/B suffix for big numbers. Used on cards and
 * charts where space is tight. Uses Indian scale (L/Cr) for INR and
 * Western scale (K/M/B) for every other currency.
 */
export function formatMoneyShort(
  value: number | string | null | undefined,
  code: CurrencyCode = DEFAULT_CURRENCY_CODE
): string {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  if (!Number.isFinite(n) || n == null) return "—";
  const sym = currencySymbol(code).trim();
  const space = currencySymbol(code).endsWith(" ") ? "" : " ";
  const abs = Math.abs(n);
  const neg = n < 0 ? "-" : "";
  const fmt = (v: number, suf: string) =>
    `${neg}${sym}${space}${v.toLocaleString(currencyMeta(code).locale, {
      maximumFractionDigits: 2,
    })}${suf}`;
  if (code === "INR") {
    if (abs >= 1e7) return fmt(abs / 1e7, " Cr");
    if (abs >= 1e5) return fmt(abs / 1e5, " L");
    if (abs >= 1e3) return fmt(abs / 1e3, " K");
  } else {
    if (abs >= 1e12) return fmt(abs / 1e12, "T");
    if (abs >= 1e9) return fmt(abs / 1e9, "B");
    if (abs >= 1e6) return fmt(abs / 1e6, "M");
    if (abs >= 1e3) return fmt(abs / 1e3, "K");
  }
  return fmt(abs, "");
}
