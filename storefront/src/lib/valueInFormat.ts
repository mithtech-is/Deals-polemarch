/**
 * Storefront Value In formatter. Snapshot values arrive already projected into
 * the `displayHint.scale` by the Calcula backend, so this helper just handles
 * locale-aware number formatting and the panel label.
 *
 * Unitless and per-share codes are identified by the shared code sets below
 * (mirrors calcula/src/common/value-in.ts).
 */

import type { DisplayHint, ScaleUnit } from "./snapshot";

export const SCALE_LABEL: Record<ScaleUnit, string> = {
  units: "Units",
  thousands: "Thousands",
  lakhs: "Lakhs",
  crores: "Crores",
  millions: "Millions",
  billions: "Billions",
};

export const DEFAULT_HINT: DisplayHint = {
  currency: "INR",
  scale: "crores",
  label: "All values in ₹ Crores",
};

export function labelFor(
  hint: DisplayHint | undefined,
  overrideSymbol?: string
): string {
  if (!hint) {
    if (overrideSymbol) {
      return DEFAULT_HINT.label.replace("₹", overrideSymbol);
    }
    return DEFAULT_HINT.label;
  }
  if (overrideSymbol) {
    // Swap the canonical symbol for the user's preferred symbol without
    // re-scaling the underlying number — the backend already projected
    // values into the display scale.
    return hint.label
      .replace("₹", overrideSymbol)
      .replace("$", overrideSymbol)
      .replace("€", overrideSymbol)
      .replace("£", overrideSymbol);
  }
  return hint.label;
}

export function currencySymbol(currency: string): string {
  if (currency === "INR") return "₹";
  if (currency === "USD") return "$";
  if (currency === "EUR") return "€";
  if (currency === "GBP") return "£";
  return currency + " ";
}

export const UNITLESS_CODES = new Set<string>([
  "current_ratio", "quick_ratio", "cash_ratio", "net_working_capital_to_assets",
  "debt_to_equity", "debt_to_assets", "long_term_debt_to_equity", "long_term_debt_to_capital",
  "debt_to_ebitda", "net_debt_to_equity", "interest_coverage",
  "net_margin", "gross_margin", "operating_margin", "ebitda_margin",
  "roe", "roa", "roce", "pretax_roe", "cash_roa", "rona", "operating_roa",
  "asset_turnover", "equity_turnover", "capital_employed_turnover",
  "inventory_turnover", "receivables_turnover",
  "capex_to_sales", "capex_to_ocf", "dividend_payout_ratio", "retention_ratio",
  "capex_depreciation_ratio",
  "pe_ratio", "pb_ratio", "ps_ratio", "ev_to_ebitda", "ev_to_sales", "ev_to_fcf",
  "ev_to_assets", "ev_to_capital_employed", "ev_to_invested_capital", "ev_to_ebit",
  "earnings_yield", "fcf_yield", "price_to_ocf", "dividend_yield",
  "ebit_margin", "pretax_margin", "roic", "fcf_to_net_income",
  "operating_cashflow_to_sales", "operating_cashflow_to_net_income",
  "cash_flow_to_debt", "cash_interest_coverage", "ebitda_interest_coverage",
  "free_cashflow_margin",
  "shares_outstanding", "shares_outstanding_aux", "weighted_avg_shares_aux",
  "employee_count", "avg_interest_rate", "effective_tax_rate",
  "dupont_tax_burden", "dupont_interest_burden", "dupont_ebit_margin",
  "dupont_asset_turnover", "dupont_equity_multiplier", "dupont_roe_5step",
  "accruals_to_assets", "accruals_to_income", "cash_earnings_coverage",
]);

export const PER_SHARE_CODES = new Set<string>([
  "eps", "eps_basic", "eps_basic_aux", "bvps", "dps", "cfps", "diluted_eps",
  "cash_per_share", "cash_per_share_aux",
  "ebitda_per_share", "ebitda_per_share_aux",
  "ebit_per_share", "ebit_per_share_aux",
  "book_value_per_share", "book_value_per_share_aux",
  "sales_per_share", "sales_per_share_aux",
  "fcf_per_share", "fcf_per_share_aux",
  "operating_cashflow_per_share", "operating_cash_flow_per_share_aux",
  "dividends_per_share_aux",
  "historical_share_price", "market_price_per_share",
]);

export const PERCENT_CODES = new Set<string>([
  "net_margin", "gross_margin", "operating_margin", "ebitda_margin", "ebit_margin", "pretax_margin",
  "roe", "roa", "roce", "roic", "pretax_roe", "cash_roa", "rona", "operating_roa",
  "dividend_payout_ratio", "retention_ratio", "fcf_yield", "earnings_yield",
  "free_cashflow_margin", "operating_cashflow_to_sales",
]);

/**
 * Format a snapshot value already projected into `displayHint.scale`. Picks
 * the right rendering based on the line item code.
 */
export function formatValueWithHint(
  value: number | null,
  code: string,
  hint: DisplayHint | undefined = DEFAULT_HINT,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";

  // Percent ratios
  if (PERCENT_CODES.has(code)) {
    const pct = Math.abs(value) < 1 ? value * 100 : value;
    return `${pct.toFixed(2)}%`;
  }

  // Unitless ratios → "1.23x" or plain number depending on magnitude
  if (UNITLESS_CODES.has(code)) {
    if (Math.abs(value) >= 1) return `${value.toFixed(2)}x`;
    return value.toFixed(3);
  }

  // Per-share → base currency units, 2 decimals
  if (PER_SHARE_CODES.has(code)) {
    const sym = currencySymbol((hint ?? DEFAULT_HINT).currency);
    return `${sym}${value.toFixed(2)}`;
  }

  // Regular statement value — already in display scale.
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return `${sign}${abs.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}
