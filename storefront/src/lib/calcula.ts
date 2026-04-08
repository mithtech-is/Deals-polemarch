/**
 * Calcula API client for the storefront.
 *
 * Fetches synced financial data from Medusa's /store/calcula/* routes.
 * Data is stored locally in Medusa via webhook sync from Calcula,
 * so this has zero runtime dependency on the Calcula backend.
 */

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";

export interface CalculaOverviewCard {
  code: string;
  value: number | null;
}

export interface CalculaOverview {
  companyId: string;
  periodId: string | null;
  cards: CalculaOverviewCard[];
}

export interface CalculaRatio {
  code: string;
  value: number | null;
}

export interface CalculaTrendPoint {
  periodLabel: string;
  revenue: number | null;
  netProfit: number | null;
  networth: number | null;
}

export interface CalculaCompanyData {
  // Calcula-synced
  company_id: string;
  company_name: string;
  isin: string | null;
  cin: string | null;
  sector: string | null;
  industry: string | null;
  description: string | null;
  listing_status: string | null;
  overview: CalculaOverview | null;
  ratios: CalculaRatio[] | null;
  trends: CalculaTrendPoint[] | null;
  synced_at: string;
  // Static deal fields
  market_cap: string | null;
  share_type: string | null;
  lot_size: number | null;
  face_value: string | null;
  depository: string | null;
  pan_number: string | null;
  rta: string | null;
  total_shares: string | null;
  fifty_two_week_high: number | null;
  fifty_two_week_low: number | null;
  founded: string | null;
  headquarters: string | null;
  valuation: string | null;
  pe_ratio: string | null;
  pb_ratio: string | null;
  roe_value: string | null;
  debt_to_equity: string | null;
  book_value: string | null;
}

/**
 * Fetch synced financial data for a company by ISIN from Medusa's local store.
 * ISIN is the shared identifier between Medusa products and Calcula companies.
 * Returns null if not found or on error (graceful degradation).
 */
export async function getCompanyFinancials(isin: string): Promise<CalculaCompanyData | null> {
  if (!isin) return null;
  try {
    const response = await fetch(`${MEDUSA_URL}/store/calcula/isin/${isin}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Helper: extract a specific KPI value from overview cards.
 */
export function getOverviewValue(overview: CalculaOverview | null, code: string): number | null {
  if (!overview?.cards) return null;
  const card = overview.cards.find((c) => c.code === code);
  return card?.value ?? null;
}

/**
 * Helper: extract a specific ratio value.
 */
export function getRatioValue(ratios: CalculaRatio[] | null, code: string): number | null {
  if (!ratios) return null;
  const ratio = ratios.find((r) => r.code === code);
  return ratio?.value ?? null;
}

/**
 * Helper: format large numbers for display (e.g., 1234567 → "12.35 Cr")
 */
export function formatFinancialValue(value: number | null): string {
  if (value === null || value === undefined) return "—";
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue >= 1e7) return `${sign}${(absValue / 1e7).toFixed(2)} Cr`;
  if (absValue >= 1e5) return `${sign}${(absValue / 1e5).toFixed(2)} L`;
  if (absValue >= 1e3) return `${sign}${(absValue / 1e3).toFixed(1)} K`;
  return `${sign}${absValue.toFixed(0)}`;
}
