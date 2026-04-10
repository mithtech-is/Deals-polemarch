/**
 * Synonym dictionary mapping labels / short codes as they appear in
 * Indian Ind-AS consolidated financial statements (API Holdings,
 * Pharmeasy, Thyrocare etc.) to the existing canonical codes already
 * present in the calcula FinancialLineItem taxonomy.
 *
 * Any time a seed script wants to store a value under a "natural"
 * label, it should look it up through `resolveLineItemCode()` so the
 * canonical code wins. If the label doesn't map here yet, the function
 * returns `null` — extend the dictionary rather than guessing a new
 * slug.
 *
 * IMPORTANT: multiple PDF labels may legitimately collapse onto one
 * canonical leaf (e.g. "Finance costs" in the P&L rolls into the
 * existing `interest_on_loans` leaf under the Finance Cost section,
 * because the consolidated statement doesn't split interest further).
 * That's intentional — callers should pre-aggregate before calling the
 * service if they need to collapse.
 */
export const PDF_LINE_SYNONYMS: Record<string, string> = {
  // ── P&L ──────────────────────────────────────────────────────
  'finance_costs_total': 'interest_on_loans',
  'finance costs': 'interest_on_loans',
  'depreciation_and_amortisation': 'depreciation_expense',
  'depreciation and amortisation expense': 'depreciation_expense',
  'expected_credit_loss': 'bad_debt_expense',
  'expected credit loss on financial assets': 'bad_debt_expense',
  'other_expenses_total': 'miscellaneous_expenses',
  'other expenses': 'miscellaneous_expenses',
  'share_of_associate_profit': 'other_income', // folded into other_income
  'share of profit/(loss) of associates': 'other_income',
  // Exceptional items — all roll into impairment_loss /
  // loss_on_investment / loss_on_asset_sale under Other Expenses.
  'impairment_of_goodwill': 'impairment_loss',
  'impairment_of_associates': 'impairment_loss',
  'impairment of goodwill': 'impairment_loss',
  'impairment of investments in associates': 'impairment_loss',
  'exceptional_others': 'loss_on_investment',
  'exceptional — others': 'loss_on_investment',
  'ncd_early_redemption_charges': 'loss_on_asset_sale',
  'early redemption charges for ncds': 'loss_on_asset_sale',
  'gain_on_contingent_consideration': 'foreign_exchange_gain',
  'gain in fair value of contingent consideration': 'foreign_exchange_gain',
  'tax_prior_periods': 'current_tax_expense', // rolled into current_tax_expense
  'tax pertaining to prior periods': 'current_tax_expense',

  // ── Balance Sheet ────────────────────────────────────────────
  'investments_in_associates_nc': 'financial_assets_investments_non_current',
  'investments accounted for using equity method': 'financial_assets_investments_non_current',
  'other_current_financial_assets': 'unbilled_revenue', // taxonomy leaf used for "other financial assets (current)"
  'other financial assets (current)': 'unbilled_revenue',
  'current_tax_assets_net': 'non_current_tax_assets', // taxonomy only has non-current leaf; current folds here
  'current tax assets (net)': 'non_current_tax_assets',
  'assets_held_for_sale': 'assets_others',
  'assets classified as held for sale': 'assets_others',

  // Equity — taxonomy doesn't split instruments-in-nature-of-equity
  // vs equity-component-of-compound-fi vs reserves, so everything
  // except share capital and NCI folds into `retained_earnings`.
  'instruments_nature_of_equity': 'retained_earnings',
  'instruments entirely in the nature of equity': 'retained_earnings',
  'equity_component_compound_fi': 'retained_earnings',
  'equity component of compound financial instruments': 'retained_earnings',
  'reserves_and_surplus': 'retained_earnings',
  'reserves and surplus': 'retained_earnings',
  'non_controlling_interests': 'retained_earnings',
  'non-controlling interests': 'retained_earnings',

  // Non-current liabilities
  'other_non_current_financial_liabilities': 'other_non_current_liabilities',
  'other financial liabilities (non-current)': 'other_non_current_liabilities',

  // Current liabilities
  'lease_liabilities_current': 'other_current_liabilities', // taxonomy doesn't have a current lease-liability leaf
  'lease liabilities (current)': 'other_current_liabilities',
  'other_current_financial_liabilities': 'other_current_liabilities',
  'other financial liabilities (current)': 'other_current_liabilities',
  'contract_liabilities_current': 'contract_liabilities',
  'contract liabilities (current)': 'contract_liabilities'
};

/**
 * Resolve a free-form label or short code (case-insensitive) to the
 * canonical taxonomy code. Returns null when the label isn't mapped —
 * add new entries to PDF_LINE_SYNONYMS instead of making up codes.
 */
export function resolveLineItemCode(label: string): string | null {
  const key = label.trim().toLowerCase();
  return PDF_LINE_SYNONYMS[key] ?? null;
}
