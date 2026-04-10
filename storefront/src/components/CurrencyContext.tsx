"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_CURRENCY_CODE,
  SUPPORTED_CURRENCIES,
  currencyMeta,
  currencySymbol,
  fetchSiteSettings,
  formatAmount,
  formatMoney,
  formatMoneyShort,
  isCurrencyCode,
  type CurrencyCode,
  type SiteDisplayScale,
} from "@/lib/currency";

/**
 * Client-side currency state. Reads the build-time default from
 * `DEFAULT_CURRENCY_CODE` (env) and hydrates any user override from
 * localStorage on mount. The switcher dropdown in the header calls
 * `setCurrency` to update + persist. Everything downstream (formatters,
 * ValuationPanel, CompanyDetailsGrid, FinancialStatements) reads from
 * this single source of truth via `useCurrency()`.
 */

const STORAGE_KEY = "polemarch:default-currency";

export type CurrencyContextValue = {
  currency: CurrencyCode;
  symbol: string;
  /** Site-wide display scale chosen by the Calcula admin. `auto` = legacy per-statement best-fit. */
  displayScale: SiteDisplayScale;
  /** Source of `currency` — "user" means the visitor picked it explicitly via the switcher. */
  source: "site" | "user" | "default";
  setCurrency: (code: CurrencyCode) => void;
  formatMoney: (v: number | string | null | undefined, digits?: number) => string;
  formatMoneyShort: (v: number | string | null | undefined) => string;
  formatAmount: (v: number | string | null | undefined, digits?: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_CURRENCY_CODE);
  const [displayScale, setDisplayScale] = useState<SiteDisplayScale>("auto");
  const [source, setSource] = useState<"site" | "user" | "default">("default");

  // Hydrate precedence on mount:
  //   1. user localStorage override (if set)
  //   2. Calcula site settings via Medusa proxy
  //   3. build-time env default
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    let userOverride: CurrencyCode | null = null;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && isCurrencyCode(stored)) userOverride = stored;
    } catch {
      /* ignore */
    }

    (async () => {
      const site = await fetchSiteSettings();
      if (cancelled) return;
      if (site) setDisplayScale(site.defaultScale);
      if (userOverride) {
        setCurrencyState(userOverride);
        setSource("user");
      } else if (site) {
        setCurrencyState(site.defaultCurrency);
        setSource("site");
      } else {
        setSource("default");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    setSource("user");
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      symbol: currencySymbol(currency),
      displayScale,
      source,
      setCurrency,
      formatMoney: (v, digits) => formatMoney(v, currency, digits),
      formatMoneyShort: (v) => formatMoneyShort(v, currency),
      formatAmount: (v, digits) => formatAmount(v, currency, digits),
    }),
    [currency, displayScale, source, setCurrency]
  );

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

/**
 * Read the active currency. Safe to call from any client component. If
 * called outside the provider (or on the server) it falls back to the
 * build-time default so formatters don't crash.
 */
export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (ctx) return ctx;
  // Graceful fallback — keeps the hook safe to use in legacy code paths
  // that haven't been wrapped yet.
  const fallback: CurrencyContextValue = {
    currency: DEFAULT_CURRENCY_CODE,
    symbol: currencySymbol(DEFAULT_CURRENCY_CODE),
    displayScale: "auto",
    source: "default",
    setCurrency: () => {},
    formatMoney: (v, d) => formatMoney(v, DEFAULT_CURRENCY_CODE, d),
    formatMoneyShort: (v) => formatMoneyShort(v, DEFAULT_CURRENCY_CODE),
    formatAmount: (v, d) => formatAmount(v, DEFAULT_CURRENCY_CODE, d),
  };
  return fallback;
}

/** Header dropdown to switch currencies. Compact, works on mobile. */
export function CurrencySwitcher({ className }: { className?: string }) {
  const { currency, setCurrency } = useCurrency();
  return (
    <label className={`inline-flex items-center ${className ?? ""}`}>
      <span className="sr-only">Currency</span>
      <select
        value={currency}
        onChange={(e) => {
          const next = e.target.value;
          if (isCurrencyCode(next)) setCurrency(next);
        }}
        className="appearance-none rounded-full border border-slate-200 bg-white px-3 py-1.5 pr-7 text-xs font-semibold text-slate-700 hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        aria-label="Default display currency"
      >
        {SUPPORTED_CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.symbol.trim()} {c.code}
          </option>
        ))}
      </select>
      <svg
        className="-ml-5 pointer-events-none h-3 w-3 text-slate-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </label>
  );
}

export { currencyMeta };
