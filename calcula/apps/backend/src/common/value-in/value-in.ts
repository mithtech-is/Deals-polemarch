/**
 * Shared Value In (currency + scale) helpers.
 *
 * Resolution order (most specific → least specific):
 *   PeriodStatementValueIn → FinancialPeriod → Company defaults → global (INR, crores)
 *
 * Used by snapshots.service, financials.service, and the currency REST endpoints.
 */

import { ScaleUnit, StatementType } from '@prisma/client';

export const GLOBAL_DEFAULT = {
  currency: 'INR',
  scale: 'crores' as ScaleUnit,
};

export const SCALE_FACTOR: Record<ScaleUnit, number> = {
  units: 1,
  thousands: 1_000,
  lakhs: 100_000,
  crores: 10_000_000,
  millions: 1_000_000,
  billions: 1_000_000_000,
};

export const SCALE_LABEL: Record<ScaleUnit, string> = {
  units: 'Units',
  thousands: 'Thousands',
  lakhs: 'Lakhs',
  crores: 'Crores',
  millions: 'Millions',
  billions: 'Billions',
};

export type ValueInSource = 'period_statement' | 'period' | 'company' | 'global';

export type ResolvedValueIn = {
  currency: string;
  scale: ScaleUnit;
  source: ValueInSource;
  missing: boolean; // true if we fell through to company or global
};

export type ValueInRow = { currency: string | null; scale: ScaleUnit | null };

export function resolveValueIn(
  perStatement: ValueInRow | null | undefined,
  perPeriod: ValueInRow | null | undefined,
  company: { defaultCurrency: string; defaultScale: ScaleUnit },
): ResolvedValueIn {
  if (perStatement?.currency && perStatement?.scale) {
    return { currency: perStatement.currency, scale: perStatement.scale, source: 'period_statement', missing: false };
  }
  if (perPeriod?.currency && perPeriod?.scale) {
    return { currency: perPeriod.currency, scale: perPeriod.scale, source: 'period', missing: false };
  }
  if (company.defaultCurrency && company.defaultScale) {
    return { currency: company.defaultCurrency, scale: company.defaultScale, source: 'company', missing: true };
  }
  return { currency: GLOBAL_DEFAULT.currency, scale: GLOBAL_DEFAULT.scale, source: 'global', missing: true };
}

/**
 * Line-item codes that are ratios (unitless). These bypass scale + currency
 * conversion entirely — storefront formats them as plain numbers (or %, x).
 */
export const UNITLESS_CODES = new Set<string>([
  // Liquidity
  'current_ratio', 'quick_ratio', 'cash_ratio', 'net_working_capital_to_assets',
  // Leverage
  'debt_to_equity', 'debt_to_assets', 'long_term_debt_to_equity', 'long_term_debt_to_capital',
  'debt_to_ebitda', 'net_debt_to_equity', 'interest_coverage',
  // Profitability
  'net_margin', 'gross_margin', 'operating_margin', 'ebitda_margin',
  'roe', 'roa', 'roce', 'pretax_roe', 'cash_roa', 'rona', 'operating_roa',
  // Efficiency
  'asset_turnover', 'equity_turnover', 'capital_employed_turnover',
  'inventory_turnover', 'receivables_turnover',
  // Cashflow ratios
  'capex_to_sales', 'capex_to_ocf', 'dividend_payout_ratio', 'retention_ratio',
  'capex_depreciation_ratio',
  // Valuation multiples
  'pe_ratio', 'pb_ratio', 'ps_ratio', 'ev_to_ebitda', 'ev_to_sales', 'ev_to_fcf',
  'ev_to_assets', 'ev_to_capital_employed', 'ev_to_invested_capital', 'ev_to_ebit',
  'earnings_yield', 'fcf_yield', 'price_to_ocf', 'dividend_yield',
  // Profitability extras
  'ebit_margin', 'pretax_margin', 'roic', 'fcf_to_net_income',
  // Cashflow ratios extras
  'operating_cashflow_to_sales', 'operating_cashflow_to_net_income',
  'cash_flow_to_debt', 'cash_interest_coverage', 'ebitda_interest_coverage',
  'free_cashflow_margin',
  // Aux share-counts are counts (unitless, not rupees)
  'shares_outstanding', 'shares_outstanding_aux', 'weighted_avg_shares_aux',
  'employee_count', 'avg_interest_rate', 'effective_tax_rate',
  // DuPont
  'dupont_tax_burden', 'dupont_interest_burden', 'dupont_ebit_margin',
  'dupont_asset_turnover', 'dupont_equity_multiplier', 'dupont_roe_5step',
  // Quality
  'accruals_to_assets', 'accruals_to_income', 'cash_earnings_coverage',
]);

/**
 * Line-item codes that are per-share values. Currency-converted but never
 * scale-converted — always rendered in base currency units (e.g. ₹ 12.40).
 */
export const PER_SHARE_CODES = new Set<string>([
  'eps', 'eps_basic', 'eps_basic_aux', 'bvps', 'dps', 'cfps', 'diluted_eps',
  'cash_per_share', 'cash_per_share_aux',
  'ebitda_per_share', 'ebitda_per_share_aux',
  'ebit_per_share', 'ebit_per_share_aux',
  'book_value_per_share', 'book_value_per_share_aux',
  'sales_per_share', 'sales_per_share_aux',
  'fcf_per_share', 'fcf_per_share_aux',
  'operating_cashflow_per_share', 'operating_cash_flow_per_share_aux',
  'dividends_per_share_aux',
  // Period-end share price is naturally per-share.
  'historical_share_price', 'market_price_per_share',
]);

export function isUnitless(code: string) { return UNITLESS_CODES.has(code); }
export function isPerShare(code: string) { return PER_SHARE_CODES.has(code); }

/**
 * Pick the largest "nice" display scale so the biggest absolute value in a
 * statement comes out in single-to-triple digits. Operates on CANONICAL values
 * (already in base units, ₹).
 */
export function pickDisplayScale(canonicalValues: number[]): ScaleUnit {
  const maxAbs = canonicalValues.reduce((m, v) => (Number.isFinite(v) ? Math.max(m, Math.abs(v)) : m), 0);
  if (maxAbs >= 1e9) return 'billions';
  if (maxAbs >= 1e7) return 'crores';
  if (maxAbs >= 1e5) return 'lakhs';
  if (maxAbs >= 1e3) return 'thousands';
  return 'units';
}

export function displayLabel(currency: string, scale: ScaleUnit): string {
  const sym = currency === 'INR' ? '₹' : currency;
  return `All values in ${sym} ${SCALE_LABEL[scale]}`;
}

/**
 * Normalize a raw DB value into canonical base-currency units.
 *
 *   canonical = value * scaleFactor(scale) * fxRate(currency → baseCurrency)
 *
 * Unitless rows pass through unchanged; per-share rows are currency-converted
 * but NOT scale-multiplied.
 */
export function toCanonical(
  value: number,
  vi: ResolvedValueIn,
  fxRate: number,
  code: string,
): number {
  if (!Number.isFinite(value)) return value;
  if (isUnitless(code)) return value;
  const scaleMul = isPerShare(code) ? 1 : SCALE_FACTOR[vi.scale];
  return value * scaleMul * fxRate;
}

/** Project a canonical value down to the display scale for storefront rendering. */
export function fromCanonical(canonical: number, displayScale: ScaleUnit, code: string): number {
  if (!Number.isFinite(canonical)) return canonical;
  if (isUnitless(code)) return canonical;
  if (isPerShare(code)) return canonical; // per-share stays in units
  return canonical / SCALE_FACTOR[displayScale];
}

export const ALL_SCALES: ScaleUnit[] = ['units', 'thousands', 'lakhs', 'crores', 'millions', 'billions'];
export const COMMON_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AED'];
