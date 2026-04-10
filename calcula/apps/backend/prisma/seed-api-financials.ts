/**
 * Seed consolidated financial statements for API Holdings (FY21–FY25)
 * from the public consolidated financial statements PDFs on
 * apiholdings.in/reports. Only CHILD line items are populated — parent
 * / section totals (`*_section`, `assets`, etc.) are left blank so they
 * can be derived/displayed by the UI as sums of children.
 *
 * All amounts are in Rupees MILLIONS as reported in the consolidated
 * statements. Losses are stored as negative numbers.
 *
 * FY25 figures added from the PWC-audited Consolidated Financial
 * Statements for the year ended March 31, 2025 (signed August 6, 2025).
 *
 * Run: npx tsx prisma/seed-api-financials.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TARGET_ISIN = 'INE0DJ201029';

type YearCode = 'FY21' | 'FY22' | 'FY23' | 'FY24' | 'FY25';
const YEARS: Record<YearCode, { fiscalYear: number; periodStart: string; periodEnd: string }> = {
  FY21: { fiscalYear: 2021, periodStart: '2020-04-01', periodEnd: '2021-03-31' },
  FY22: { fiscalYear: 2022, periodStart: '2021-04-01', periodEnd: '2022-03-31' },
  FY23: { fiscalYear: 2023, periodStart: '2022-04-01', periodEnd: '2023-03-31' },
  FY24: { fiscalYear: 2024, periodStart: '2023-04-01', periodEnd: '2024-03-31' },
  FY25: { fiscalYear: 2025, periodStart: '2024-04-01', periodEnd: '2025-03-31' }
};

// Every value is in ₹ millions. `null` = not reported that year or skipped.
// Populated line items are leaf-level only; parents (Revenue, COGS,
// Operating expenses, etc.) are intentionally absent so the storefront
// shows the sum of children.
const METRICS: Record<string, Partial<Record<YearCode, number>>> = {
  // ── P&L ────────────────────────────────────────────────────────
  revenue_from_operations: { FY21: 23352.69, FY22: 57288.21, FY23: 66439.38, FY24: 56642.86, FY25: 58721.64 },
  // other_income = reported "Other income" + share of profit/(loss) of
  // investments accounted for using equity method (folded in because
  // there is no dedicated leaf in the taxonomy for associate income).
  other_income: {
    FY21: 253.93,
    FY22: 521.81 + 6.61, // 528.42
    FY23: 558.33 + -2.99, // 555.34 (loss share)
    FY24: 946.55 + 8.75, // 955.30
    FY25: 1078.65 + 81.55 // 1,160.20 (reported other income + share of associate profit)
  },

  cost_of_materials_consumed: { FY21: 0, FY22: 854.6, FY23: 1569.2, FY24: 1645.09, FY25: 1886.02 },
  purchase_of_stock_in_trade: { FY21: 22668.17, FY22: 52566.12, FY23: 55120.6, FY24: 45728.06, FY25: 47295.83 },
  changes_in_inventory: { FY21: -1143.95, FY22: -2290.53, FY23: 618.96, FY24: 1430.14, FY25: -39.76 },

  employee_benefits_expense: { FY21: 2702.94, FY22: 14589.71, FY23: 12833.2, FY24: 6993.63, FY25: 9083.99 },

  // "Expected credit loss on financial assets" maps to bad_debt_expense.
  bad_debt_expense: { FY23: 683.37, FY24: 1692.64, FY25: 1001.25 },

  // Aggregated "Other expenses" line in the PDF — storing on the
  // `miscellaneous_expenses` leaf under Other Expenses section.
  miscellaneous_expenses: { FY21: 4818.8, FY22: 15025.51, FY23: 9824.94, FY24: 5619.76, FY25: 6107.40 },

  // ── Exceptional items (P&L) ────────────────────────────────────
  // The consolidated P&L has a separate "Exceptional items" block below
  // the line; without these the seeded PBT doesn't reconcile to the
  // reported PBT. Mapped to existing leaves under Other Expenses.
  //   impairment_loss = goodwill impairment + impairment of investments
  //                     in associates + impairment of PPE (FY24)
  //   loss_on_investment = early redemption charges for NCDs +
  //                        "Others" exceptional line
  //   foreign_exchange_gain = +62.57 (FY22 gain on contingent
  //                     consideration — no better leaf exists)
  // Goodwill + investments-in-associates impairments — disclosed in
  // the consolidated P&L as "Exceptional items". ONLY amounts on the
  // face of the P&L statement are included here; cashflow-only
  // adjustments (PPE impairment, disposal losses) are NOT.
  impairment_loss: {
    FY21: 0,
    // FY22: 12,671.00 (goodwill)
    FY22: 12671.0,
    // FY23: 28,256.10 (goodwill) + 963.74 (investments in associates)
    FY23: 29219.84,
    // FY24: 5,825.00 (goodwill) + 334.25 (investments in associates)
    FY24: 6159.25,
    // FY25: 1,750.00 (goodwill) + 198.13 (investments in associates)
    FY25: 1948.13
  },
  // Exceptional line: "Others" (non-specified impairments / disposals)
  loss_on_investment: {
    FY24: 685.69,
    // FY25: 1,016.98 "Others" exceptional line
    FY25: 1016.98
  },
  // Exceptional line: early redemption charges for NCDs (FY24 only)
  loss_on_asset_sale: {
    FY24: 3424.94
  },
  // FY22 disclosure: "Gain in fair value of contingent consideration"
  // (+62.57). Added to revenue side via foreign_exchange_gain leaf
  // (positive = income) so PBT reconciles.
  foreign_exchange_gain: {
    FY22: 62.57
  },

  depreciation_expense: { FY21: 329.01, FY22: 1587.85, FY23: 2434.4, FY24: 2159.52, FY25: 1689.78 },

  // Finance costs — aggregated under interest_on_loans as the largest
  // component; the PDFs don't split further in the face of the statement.
  interest_on_loans: { FY21: 434.31, FY22: 2582.64, FY23: 6655.43, FY24: 7279.16, FY25: 5061.07 },

  // Tax expense pertaining to prior period (₹6.38 mn in FY25) folded
  // into current_tax_expense to keep reconciliation simple — the
  // taxonomy has no dedicated leaf for prior-period tax.
  current_tax_expense: { FY21: 46.68, FY22: 342.74, FY23: 389.48, FY24: 379.21, FY25: 651.07 + 6.38 },
  deferred_tax_expense: { FY21: 164.02, FY22: -125.48, FY23: -241.11, FY24: -270.03, FY25: -102.21 },

  profit_before_tax: { FY21: -6202.66, FY22: -39707.7, FY23: -51965.22, FY24: -25219.72, FY25: -15168.85 },
  net_profit: { FY21: -6413.36, FY22: -39924.96, FY23: -52117.34, FY24: -25335.13, FY25: -15723.89 },

  // ── Balance Sheet ──────────────────────────────────────────────
  property_plant_equipment: { FY21: 613.68, FY22: 3613.83, FY23: 3378.97, FY24: 2862.44, FY25: 2687.48 },
  capital_work_in_progress: { FY21: 2.5, FY22: 69.59, FY23: 30.63, FY24: 27.56, FY25: 141.62 },
  right_of_use_assets: { FY21: 948.48, FY22: 1994.89, FY23: 1541.02, FY24: 1385.84, FY25: 1314.26 },
  goodwill: { FY21: 31921.56, FY22: 70955.45, FY23: 42699.35, FY24: 36911.84, FY25: 35133.38 },
  other_intangible_assets: { FY21: 668.55, FY22: 6635.14, FY23: 5742.05, FY24: 4474.21, FY25: 3930.57 },
  intangible_assets_under_development: { FY21: 0, FY22: 9.97, FY23: 10.74, FY24: 9.48, FY25: 0 },
  deferred_tax_assets: { FY21: 16.75, FY22: 168.16, FY23: 219.18, FY24: 426.98, FY25: 144.13 },
  // Non-current tax assets + current tax assets rolled into the
  // single `non_current_tax_assets` leaf via PDF_LINE_SYNONYMS.
  // FY21 has a current tax asset of 2.35 that closes the reported
  // Total Assets reconciliation.
  non_current_tax_assets: {
    FY21: 186.14 + 2.35, // 188.49
    FY22: 558.46,
    FY23: 844.92,
    FY24: 758.44,
    FY25: 568.92
  },
  other_non_current_assets: { FY21: 1399.54, FY22: 1457.61, FY23: 205.82, FY24: 104.68, FY25: 38.71 },

  // Non-current financial assets that didn't have a dedicated leaf
  // above — investments, other financial assets, investments in
  // equity-accounted investees (associates + JV).
  financial_assets_investments_non_current: {
    // PDF: Investments (non-current) + Investments accounted for using
    // equity method (associates/JV).
    FY21: 1.08,
    FY22: 152.79 + 2965.22, // 3118.01
    FY23: 173.62 + 2016.06, // 2189.68
    FY24: 174.62 + 1748.03, // 1922.65
    FY25: 177.62 + 241.67 // 419.29
  },
  financial_assets_other_non_current: {
    FY21: 114.02,
    FY22: 380.11,
    FY23: 353.17,
    FY24: 249.95,
    FY25: 261.29
  },

  // "Inventories" on the consolidated PDF is stock-in-trade for API
  // Holdings (a pharmacy trader). inventories_total is derived as the
  // sum of the five leaves below, so we write the whole amount onto
  // stock_in_trade and leave the others at 0.
  inventories_stock_in_trade: { FY21: 4056.16, FY22: 7612.4, FY23: 6881.6, FY24: 5555.6, FY25: 5538.91 },
  trade_receivables: { FY21: 3582.86, FY22: 8608.5, FY23: 9050.34, FY24: 7062.1, FY25: 6605.08 },
  cash_and_cash_equivalents: { FY21: 2295.45, FY22: 1543.97, FY23: 1936.48, FY24: 3279.89, FY25: 1189.91 },
  bank_balances_other_than_cash: { FY21: 936.36, FY22: 1748.18, FY23: 1038.69, FY24: 12825.02, FY25: 6207.66 },
  short_term_loans: { FY21: 9.0, FY22: 555.36, FY23: 1171.28, FY24: 695.58, FY25: 0.43 },
  short_term_investments: { FY21: 8.06, FY22: 1261.53, FY23: 1232.37, FY24: 1367.55, FY25: 1373.64 },
  // PDF: "Other financial assets" (current)
  unbilled_revenue: {
    FY21: 421.34,
    FY22: 757.24,
    FY23: 920.24,
    FY24: 862.62,
    FY25: 916.15
  },
  other_current_assets: { FY21: 1869.56, FY22: 2934.87, FY23: 3116.49, FY24: 3071.28, FY25: 3196.44 },
  // PDF: "Assets classified as held for sale" (FY22+)
  assets_others: {
    FY22: 0, // not reported in FY22 statement
    FY23: 1.14,
    FY24: 42.89,
    FY25: 8.06
  },

  // total_assets is a calculated leaf (= non_current_assets + current_assets)
  // in the taxonomy, so don't seed it directly; the recalc will compute it.
  // total_assets intentionally omitted.

  // Equity — taxonomy only has `equity_share_capital` + `retained_earnings`
  // as generic leaves, so every non-share-capital equity line is rolled
  // into `retained_earnings` via the PDF_LINE_SYNONYMS dictionary:
  //   - Instruments entirely in the nature of equity
  //   - Equity component of compound financial instruments
  //   - Reserves and surplus
  //   - Non-controlling interests
  // This gives a single "Reserves + NCI" number on the storefront that
  // still ties out to reported total equity.
  equity_share_capital: { FY21: 256.2, FY22: 6142.04, FY23: 6142.04, FY24: 6240.44, FY25: 6516.67 },
  retained_earnings: {
    // FY21 = 115.47 + 828.90 + 33,193.24 + 1,417.95 = 35,555.56
    FY21: 35555.56,
    // FY22 = 0 + 78.90 + 60,751.91 + 3,251.96 = 64,082.77
    FY22: 64082.77,
    // FY23 = 0 + 78.90 + 14,703.77 + 3,444.18 = 18,226.85
    FY23: 18226.85,
    // FY24 = 256.53 + 78.90 + 15,568.55 + 3,738.68 = 19,642.66
    FY24: 19642.66,
    // FY25 = 433.00 (instruments) + 23,089.18 (other equity) + 2,683.96 (NCI) = 26,206.14
    FY25: 26206.14
  },

  // Non-current liabilities
  long_term_borrowings: { FY21: 2321.53, FY22: 1000.69, FY23: 32009.08, FY24: 20243.92, FY25: 16840.92 },
  lease_liabilities_non_current: { FY21: 795.68, FY22: 1505.61, FY23: 1028.72, FY24: 900.39, FY25: 913.75 },
  // PDF: "Other financial liabilities" (non-current). Taxonomy has no
  // dedicated leaf so it's rolled into other_non_current_liabilities
  // per PDF_LINE_SYNONYMS.
  other_non_current_liabilities: {
    FY21: 7.8,
    FY22: 1528.19,
    FY23: 0,
    FY24: 0,
    FY25: 0
  },
  long_term_provisions: { FY21: 146.8, FY22: 129.45, FY23: 131.36, FY24: 111.66, FY25: 131.63 },
  deferred_tax_liabilities: { FY21: 207.69, FY22: 1977.56, FY23: 1793.71, FY24: 1732.7, FY25: 1344.57 },
  contract_liabilities_non_current: {
    FY21: 0.08,
    FY22: 0.9,
    FY23: 0.17,
    FY24: 0,
    FY25: 0.01
  },

  // Current liabilities
  short_term_borrowings: { FY21: 3532.35, FY22: 24853.54, FY23: 9190.76, FY24: 20739.65, FY25: 3495.76 },
  trade_payables_micro_small: { FY21: 115.77, FY22: 185.67, FY23: 181.25, FY24: 322.97, FY25: 252.97 },
  trade_payables_other: { FY21: 3539.76, FY22: 4403.14, FY23: 3952.86, FY24: 3806.1, FY25: 4014.13 },
  short_term_provisions: { FY21: 245.39, FY22: 438.12, FY23: 366.24, FY24: 302.91, FY25: 291.30 },
  current_tax_liabilities: { FY21: 2.89, FY22: 47.19, FY23: 100.4, FY24: 41.06, FY25: 40.61 },
  // "Other current liabilities" in taxonomy absorbs three PDF lines
  // per the dictionary: lease liabilities (current), other financial
  // liabilities (current), and other current liabilities (the
  // reported line itself).
  other_current_liabilities: {
    // FY21 = 191.36 + 1,351.05 + 707.09 = 2,249.50
    FY21: 2249.5,
    // FY22 = 382.52 + 5,965.89 + 1,150.26 = 7,498.67
    FY22: 7498.67,
    // FY23 = 333.82 + 7,473.88 + 1,491.32 = 9,299.02
    FY23: 9299.02,
    // FY24 = 310.25 + 7,752.28 + 1,618.82 = 9,681.35
    FY24: 9681.35,
    // FY25 = 267.20 (lease) + 7,577.52 (other financial) + 1,643.72 (other current) = 9,488.44
    FY25: 9488.44
  },
  // "Contract liabilities" (current) — taxonomy has `contract_liabilities`
  contract_liabilities: {
    FY21: 76.44,
    FY22: 189.73,
    FY23: 141.7,
    FY24: 130.79,
    FY25: 228.94
  },

  // ── Cash Flow ──────────────────────────────────────────────────
  net_cash_from_operating_activities: { FY21: -8136.82, FY22: -25893.69, FY23: -7465.86, FY24: -611.36, FY25: -2235.32 },
  net_cash_from_investing_activities: { FY21: 44.94, FY22: -57892.06, FY23: -710.77, FY24: -12609.5, FY25: 7749.61 },
  net_cash_from_financing_activities: { FY21: 10190.24, FY22: 83053.68, FY23: 8534.85, FY24: 14568.33, FY25: -7599.11 },
  net_increase_in_cash: { FY22: -732.07, FY23: 358.22, FY24: 1347.47, FY25: -2084.82 },
  cash_at_end_of_period: { FY22: 1543.97, FY23: 1926.98, FY24: 3274.45, FY25: 1189.63 },

  // ── Auxiliary Data (ratio / analytics inputs) ──────────────────
  // total_equity = equity_share_capital + retained_earnings (where
  // `retained_earnings` in this seed is the rolled-up "Other equity"
  // including instruments + NCI per the PDF_LINE_SYNONYMS mapping).
  // Re-stated here so ratio formulas can reference a single leaf.
  total_equity: {
    FY21: 256.2 + 35555.56, // 35,811.76
    FY22: 6142.04 + 64082.77, // 70,224.81
    FY23: 6142.04 + 18226.85, // 24,368.89
    FY24: 6240.44 + 19642.66, // 25,883.10
    FY25: 6516.67 + 26206.14 // 32,722.81
  },
  // total_equity_ex_nci (owners of parent only). FY24 and FY25 come
  // straight from the reported BS "Equity attributable to owners";
  // FY21–FY23 derived as (total_equity − reported NCI).
  total_equity_ex_nci: {
    FY21: 35811.76 - 1417.95, // 34,393.81
    FY22: 70224.81 - 3251.96, // 66,972.85
    FY23: 24368.89 - 3444.18, // 20,924.71
    FY24: 22144.42,
    FY25: 30038.85
  },
  // total_debt_aux = LT + ST borrowings. Drives net_debt_aux (calculated).
  total_debt_aux: {
    FY21: 2321.53 + 3532.35, // 5,853.88
    FY22: 1000.69 + 24853.54, // 25,854.23
    FY23: 32009.08 + 9190.76, // 41,199.84
    FY24: 20243.92 + 20739.65, // 40,983.57
    FY25: 16840.92 + 3495.76 // 20,336.68
  },
  // cash_aux = cash + other bank balances. Subtracted from debt for net_debt_aux.
  cash_aux: {
    FY21: 2295.45 + 936.36, // 3,231.81
    FY22: 1543.97 + 1748.18, // 3,292.15
    FY23: 1936.48 + 1038.69, // 2,975.17
    FY24: 3279.89 + 12825.02, // 16,104.91
    FY25: 1189.91 + 6207.66 // 7,397.57
  },

  // Balance-sheet totals re-stated for ratio formulas.
  total_assets_aux: {
    FY21: 48233.07, // reported in FY21 Reconciliation
    FY22: 130137.56,
    FY23: 82516.71,
    FY24: 83896.60,
    FY25: 69765.84
  },
  total_liabilities_aux: {
    FY21: 12421.31, // total assets − total equity
    FY22: 59912.75,
    FY23: 58147.82,
    FY24: 58013.50,
    FY25: 37043.03
  },
  // capital_employed = total_equity + long_term_borrowings
  capital_employed_aux: {
    FY21: 35811.76 + 2321.53, // 38,133.29
    FY22: 70224.81 + 1000.69, // 71,225.50
    FY23: 24368.89 + 32009.08, // 56,377.97
    FY24: 25883.10 + 20243.92, // 46,127.02
    FY25: 32722.81 + 16840.92 // 49,563.73
  },
  invested_capital_aux: {
    FY21: 35811.76 + 2321.53, // same as capital_employed for these reports
    FY22: 70224.81 + 1000.69,
    FY23: 24368.89 + 32009.08,
    FY24: 25883.10 + 20243.92,
    FY25: 32722.81 + 16840.92
  },
  working_capital_aux: {
    FY21: (4056.16 + 3582.86 + 2295.45 + 936.36 + 9 + 8.06 + 421.34 + 1869.56) - (3532.35 + 115.77 + 3539.76 + 245.39 + 2.89 + 2249.5 + 76.44),
    FY22: (7612.4 + 8608.5 + 1543.97 + 1748.18 + 555.36 + 1261.53 + 757.24 + 2934.87) - (24853.54 + 185.67 + 4403.14 + 438.12 + 47.19 + 7498.67 + 189.73),
    FY23: (6881.6 + 9050.34 + 1936.48 + 1038.69 + 1171.28 + 1232.37 + 920.24 + 3116.49 + 1.14) - (9190.76 + 181.25 + 3952.86 + 366.24 + 100.4 + 9299.02 + 141.7),
    FY24: (5555.6 + 7062.1 + 3279.89 + 12825.02 + 695.58 + 1367.55 + 862.62 + 3071.28 + 42.89) - (20739.65 + 322.97 + 3806.1 + 302.91 + 41.06 + 9681.35 + 130.79),
    FY25: (5538.91 + 6605.08 + 1189.91 + 6207.66 + 0.43 + 1373.64 + 916.15 + 3196.44 + 8.06) - (3495.76 + 252.97 + 4014.13 + 291.30 + 40.61 + 9488.44 + 228.94)
  },

  // ── P&L re-statements ─────────────────────────────────────────
  // Matches revenue_from_operations on the face of the P&L.
  revenue_aux: { FY21: 23352.69, FY22: 57288.21, FY23: 66439.38, FY24: 56642.86, FY25: 58721.64 },
  // Net income attributable to owners of the group (NOT total net_profit).
  // FY24/FY25 from the "Profit/(loss) attributable to Owners" line in the
  // P&L. FY21-FY23 approximated as net_profit − (assumed NCI impact = 0).
  net_income_aux: {
    FY21: -6413.36,
    FY22: -39924.96,
    FY23: -52117.34,
    FY24: -25499.31,
    FY25: -15931.53
  },
  // Tax expense (current + deferred + prior period).
  tax_expense_aux: {
    FY21: 46.68 + 164.02,
    FY22: 342.74 - 125.48,
    FY23: 389.48 - 241.11,
    FY24: 379.21 - 270.03,
    FY25: 651.07 + 6.38 - 102.21
  },
  // Depreciation & amortisation — same as depreciation_expense leaf.
  depreciation_aux: { FY21: 329.01, FY22: 1587.85, FY23: 2434.4, FY24: 2159.52, FY25: 1689.78 },
  interest_expense_aux: { FY21: 434.31, FY22: 2582.64, FY23: 6655.43, FY24: 7279.16, FY25: 5061.07 },
  // EBIT = PBT + interest expense
  ebit_aux: {
    FY21: -6202.66 + 434.31,
    FY22: -39707.7 + 2582.64,
    FY23: -51965.22 + 6655.43,
    FY24: -25219.72 + 7279.16,
    FY25: -15168.85 + 5061.07
  },
  // EBITDA = EBIT + depreciation
  ebitda_aux: {
    FY21: -6202.66 + 434.31 + 329.01,
    FY22: -39707.7 + 2582.64 + 1587.85,
    FY23: -51965.22 + 6655.43 + 2434.4,
    FY24: -25219.72 + 7279.16 + 2159.52,
    FY25: -15168.85 + 5061.07 + 1689.78
  },

  // ── Cash flow re-statements ───────────────────────────────────
  operating_cash_flow_aux: { FY21: -8136.82, FY22: -25893.69, FY23: -7465.86, FY24: -611.36, FY25: -2235.32 },
  // capex = PPE + intangibles purchases (FY25 PDF: 806.37, FY24: 725.14).
  capex_aux: {
    FY24: 725.14,
    FY25: 806.37
  },
  dividends_paid_aux: {
    FY24: 295.08,
    FY25: 281.71
  },

  // ── Share structure (period-end, millions) ────────────────────
  // face value Rs 1 → shares_outstanding = equity_share_capital (in mn).
  shares_outstanding_aux: {
    FY21: 256.20,
    FY22: 6142.04,
    FY23: 6142.04,
    FY24: 6240.44,
    FY25: 6516.67
  },
  // Weighted-average shares implied from reported loss-per-share:
  //   WA = loss_to_owners / loss_per_share
  // FY25 PDF: EPS (basic) (1.05), loss to owners (15,931.53) → 15,173 mn.
  // FY24 PDF: EPS (basic) (3.02), loss to owners (25,499.31) → 8,443 mn.
  // Earlier years: use period-end shares as a best-effort proxy.
  weighted_avg_shares_aux: {
    FY21: 256.20,
    FY22: 6142.04,
    FY23: 6142.04,
    FY24: 8443.48, // 25,499.31 / 3.02
    FY25: 15172.89 // 15,931.53 / 1.05
  },
  // historical_share_price intentionally left unseeded — populated by
  // backfill-period-end-prices.ts from CompanyPriceHistory if available;
  // otherwise left null and dependent ratios stay empty.

  // ── SOCIE ──────────────────────────────────────────────────────
  // FY24 + FY25 movements pulled from the audited Consolidated
  // SOCIE in the FY25 PDF (pages 25–26).
  // FY22 + FY23 values are a *roll-forward plug* so closing_equity
  // reconciles to the BS-derived total_equity; without year-specific
  // SOCIE PDFs we can't split the plug into precise premium / reserve
  // movements. FY21 left partial because we don't seed FY20 opening.
  opening_equity: {
    // FY21 opening is a plug: FY21 closing (BS) − FY21 net profit, since
    // no other movements are reported for FY21 (share capital unchanged
    // at ₹256.20 mn, no dividends declared, no ESOP reserve flow in the
    // seed). Gets closing_equity to tie out to the BS for FY21 too.
    FY21: 35811.76 - -6413.36, // 42,225.12
    FY22: 35811.76,
    FY23: 70224.81,
    FY24: 24368.89,
    FY25: 25883.10
  },
  other_comprehensive_income: {
    FY24: 23.42,
    FY25: -0.10
  },
  dividends_declared_equity: {
    FY24: 295.08,
    FY25: 281.71
  },
  share_capital_issued: {
    // Δ equity_share_capital year-over-year
    FY22: 6142.04 - 256.20, // 5,885.84
    FY23: 0,
    FY24: 6240.44 - 6142.04, // 98.40
    FY25: 6516.67 - 6240.44 // 276.23
  },
  securities_premium_added: {
    FY24: 19794.18,
    FY25: 17892.43
  },
  share_based_payment_reserve: {
    FY24: 2218.52,
    FY25: 4822.46
  },
  // `other_equity_movements` is the roll-forward plug that makes the
  // SOCIE closing_equity formula tie out to the BS total. Computed as:
  //   plug = Δtotal_equity − profit − OCI + dividends
  //          − share_capital_issued − securities_premium_added
  //          − share_based_payment_reserve
  // (profit_for_period_equity is the calculated `net_profit` leaf, so
  // we don't double-count it here — the SOCIE formula evaluates it.)
  other_equity_movements: {
    // FY22: 34,413.05 − (−39,924.96) − 0 + 0 − 5,885.84 − 0 − 0 = 68,452.17
    //       (dominated by Prosus Series E securities premium)
    FY22: 68452.17,
    // FY23: −45,855.92 − (−52,117.34) = 6,261.42
    FY23: 6261.42,
    // FY24: 1,514.21 + 25,335.13 − 23.42 − 295.08 − 98.40 − 19,794.18 − 2,218.52 = 4,419.74
    FY24: 4419.74,
    // FY25: 6,839.71 + 15,723.89 + 0.10 − 281.71 − 276.23 − 17,892.43 − 4,822.46 = −709.13
    FY25: -709.13
  }
};

async function main() {
  const company = await prisma.company.findUnique({
    where: { isin: TARGET_ISIN },
    select: { id: true, name: true }
  });
  if (!company) throw new Error(`${TARGET_ISIN} not found`);
  console.log(`Target: ${company.name}`);

  // Pre-load all line items once so every metric upsert is cheap. Includes
  // isCalculated + statementType because the zero-fill step below filters
  // on them.
  const lineItems = await prisma.financialLineItem.findMany({
    select: { id: true, code: true, isCalculated: true, statementType: true }
  });
  const codeToId = new Map(lineItems.map((li) => [li.code, li.id]));

  // Upsert the 4 fiscal periods. Prisma's compound unique-key where
  // doesn't accept null, so we use findFirst + update-or-create for
  // annual periods (fiscalQuarter IS NULL).
  const periodIds: Record<YearCode, string> = {} as Record<YearCode, string>;
  for (const [code, spec] of Object.entries(YEARS) as [YearCode, typeof YEARS[YearCode]][]) {
    const existing = await prisma.financialPeriod.findFirst({
      where: {
        companyId: company.id,
        fiscalYear: spec.fiscalYear,
        fiscalQuarter: null
      },
      select: { id: true }
    });
    if (existing) {
      await prisma.financialPeriod.update({
        where: { id: existing.id },
        data: {
          periodStart: new Date(spec.periodStart),
          periodEnd: new Date(spec.periodEnd),
          isAudited: true,
          // All metrics below are in ₹ millions as reported on the
          // consolidated PDFs. Setting `scale` here lets the Value In
          // pipeline multiply by 1e6 to get canonical rupees on read.
          currency: 'INR',
          scale: 'millions'
        }
      });
      periodIds[code] = existing.id;
    } else {
      const created = await prisma.financialPeriod.create({
        data: {
          companyId: company.id,
          fiscalYear: spec.fiscalYear,
          fiscalQuarter: null,
          periodStart: new Date(spec.periodStart),
          periodEnd: new Date(spec.periodEnd),
          isAudited: true,
          currency: 'INR',
          scale: 'millions'
        }
      });
      periodIds[code] = created.id;
    }
  }

  let metricsWritten = 0;
  let metricsSkipped = 0;
  const missingCodes: string[] = [];

  for (const [lineCode, byYear] of Object.entries(METRICS)) {
    const lineItemId = codeToId.get(lineCode);
    if (!lineItemId) {
      missingCodes.push(lineCode);
      continue;
    }
    for (const [yearCode, value] of Object.entries(byYear) as [YearCode, number][]) {
      if (value == null) {
        metricsSkipped += 1;
        continue;
      }
      await prisma.financialMetric.upsert({
        where: {
          companyId_periodId_lineItemId: {
            companyId: company.id,
            periodId: periodIds[yearCode],
            lineItemId
          }
        },
        update: { value: value.toString(), currency: 'INR', valueSource: 'manual' },
        create: {
          companyId: company.id,
          periodId: periodIds[yearCode],
          lineItemId,
          value: value.toString(),
          currency: 'INR',
          valueSource: 'manual'
        }
      });
      metricsWritten += 1;
    }
  }

  // Zero-fill every balance_sheet / pnl / cashflow LEAF that hasn't
  // been explicitly written. Without this, any parent @SUM_CHILDREN
  // formula that references an unpopulated leaf returns null (the
  // service checks "all identifiers present" before evaluating), and
  // the whole derived-value cascade stalls halfway — no EBITDA, no
  // current_assets, no current_ratio, no debt_to_equity, etc.
  //
  // `ratios_valuations` and `auxiliary_data` are EXCLUDED — their leaves
  // are inputs to analytics (market price, shares outstanding, etc.) and
  // zero-filling would corrupt ratio / valuation computations.
  //
  // `change_in_equity` leaves (treasury_shares_movement, transfer_to_reserves,
  // dividends_declared_equity, etc.) ARE zero-filled because the
  // `closing_equity` formula is purely additive and needs every addend to
  // be non-null for the row to evaluate. Sparse nulls would break the
  // roll-forward for every year.
  const bsPnlCfLeaves = lineItems.filter(
    (li) =>
      !li.isCalculated &&
      ['balance_sheet', 'pnl', 'cashflow', 'change_in_equity'].includes(li.statementType)
  );
  let zerosWritten = 0;
  for (const [, periodId] of Object.entries(periodIds) as [YearCode, string][]) {
    // Check actual DB presence so re-runs stay idempotent.
    const existing = await prisma.financialMetric.findMany({
      where: { companyId: company.id, periodId },
      select: { lineItemId: true }
    });
    const present = new Set(existing.map((r) => r.lineItemId));
    const missing = bsPnlCfLeaves.filter((li) => !present.has(li.id));
    if (!missing.length) continue;
    await prisma.$transaction(
      missing.map((li) =>
        prisma.financialMetric.create({
          data: {
            companyId: company.id,
            periodId,
            lineItemId: li.id,
            value: '0',
            currency: 'INR',
            valueSource: 'manual'
          }
        })
      )
    );
    zerosWritten += missing.length;
  }

  // Bump statementsVersion so Medusa pulls on next sync.
  await prisma.company.update({
    where: { id: company.id },
    data: {
      statementsVersion: { increment: 1 },
      contentUpdatedAt: new Date()
    }
  });

  console.log(`Wrote ${metricsWritten} metrics across ${Object.keys(YEARS).length} periods.`);
  console.log(`Zero-filled ${zerosWritten} unpopulated leaves to satisfy @SUM_CHILDREN formulas.`);
  console.log(`Skipped ${metricsSkipped} null values.`);
  if (missingCodes.length) {
    console.log(`Missing line item codes (add to taxonomy first):`);
    for (const c of missingCodes) console.log(`  - ${c}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
