/**
 * Expand the Ratios & Valuations taxonomy:
 *  1. delete orphan rows (`derived_root`, `operating_cash_flow_section`)
 *  2. upsert 9 category grouping nodes (pure parents, no formula)
 *  3. reparent every existing ratio under its proper category + re-order
 *  4. insert new ratios across every category (incl. two new categories:
 *     DuPont Analysis, Earnings Quality)
 *
 * Idempotent: keyed on the unique `code` column, safe to re-run.
 * Run:  cd calcula/apps/backend && npx tsx prisma/expand-ratios.ts
 */
import { PrismaClient, StatementType } from '@prisma/client';

const prisma = new PrismaClient();

const ST = 'ratios_valuations' as unknown as StatementType;

type CategorySpec = { code: string; name: string; orderCode: string };

const CATEGORIES: CategorySpec[] = [
  { code: 'liquidity_ratios',      name: 'Liquidity Ratios',      orderCode: '01' },
  { code: 'leverage_ratios',       name: 'Leverage Ratios',       orderCode: '02' },
  { code: 'profitability_ratios',  name: 'Profitability Ratios',  orderCode: '03' },
  { code: 'efficiency_ratios',     name: 'Efficiency Ratios',     orderCode: '04' },
  { code: 'cashflow_ratios',       name: 'Cashflow Ratios',       orderCode: '05' },
  { code: 'valuation_models',      name: 'Valuation Models',      orderCode: '06' },
  { code: 'per_share_metrics',     name: 'Per Share Metrics',     orderCode: '07' },
  { code: 'dupont_analysis',       name: 'DuPont Analysis',       orderCode: '08' },
  { code: 'quality_metrics',       name: 'Earnings Quality',      orderCode: '09' },
];

type Existing = { code: string; parentCode: string; orderCode: string };

// Every existing ratio gets a parent + new 4-digit orderCode.
// Items whose parent here is different from their current parent get reparented.
const EXISTING: Existing[] = [
  // Liquidity
  { code: 'working_capital',              parentCode: 'liquidity_ratios',     orderCode: '0101' },
  { code: 'current_ratio',                parentCode: 'liquidity_ratios',     orderCode: '0102' },
  { code: 'quick_assets',                 parentCode: 'liquidity_ratios',     orderCode: '0103' },
  { code: 'quick_ratio',                  parentCode: 'liquidity_ratios',     orderCode: '0104' },
  { code: 'cash_ratio',                   parentCode: 'liquidity_ratios',     orderCode: '0105' },
  { code: 'working_capital_to_sales',     parentCode: 'liquidity_ratios',     orderCode: '0106' },
  { code: 'defensive_interval_ratio',     parentCode: 'liquidity_ratios',     orderCode: '0107' },

  // Leverage
  { code: 'total_debt',                   parentCode: 'leverage_ratios',      orderCode: '0201' },
  { code: 'net_debt',                     parentCode: 'leverage_ratios',      orderCode: '0202' },
  { code: 'debt_to_equity',               parentCode: 'leverage_ratios',      orderCode: '0203' },
  { code: 'debt_to_assets',               parentCode: 'leverage_ratios',      orderCode: '0204' },
  { code: 'debt_to_capital',              parentCode: 'leverage_ratios',      orderCode: '0205' },
  { code: 'equity_ratio',                 parentCode: 'leverage_ratios',      orderCode: '0206' },
  { code: 'financial_leverage',           parentCode: 'leverage_ratios',      orderCode: '0207' },
  { code: 'interest_coverage',            parentCode: 'leverage_ratios',      orderCode: '0208' },
  { code: 'ebitda_interest_coverage',     parentCode: 'leverage_ratios',      orderCode: '0209' },
  { code: 'net_debt_to_ebitda',           parentCode: 'leverage_ratios',      orderCode: '0210' },

  // Profitability
  { code: 'tax_rate_effective',           parentCode: 'profitability_ratios', orderCode: '0301' },
  { code: 'nopat',                        parentCode: 'profitability_ratios', orderCode: '0302' },
  { code: 'invested_capital',             parentCode: 'profitability_ratios', orderCode: '0303' },
  { code: 'gross_margin',                 parentCode: 'profitability_ratios', orderCode: '0304' },
  { code: 'ebitda_margin',                parentCode: 'profitability_ratios', orderCode: '0305' },
  { code: 'ebit_margin',                  parentCode: 'profitability_ratios', orderCode: '0306' },
  { code: 'pretax_margin',                parentCode: 'profitability_ratios', orderCode: '0307' },
  { code: 'net_margin',                   parentCode: 'profitability_ratios', orderCode: '0308' },
  { code: 'roa',                          parentCode: 'profitability_ratios', orderCode: '0309' },
  { code: 'roe',                          parentCode: 'profitability_ratios', orderCode: '0310' },
  { code: 'roce',                         parentCode: 'profitability_ratios', orderCode: '0311' },
  { code: 'roic',                         parentCode: 'profitability_ratios', orderCode: '0312' },

  // Efficiency
  { code: 'asset_turnover',               parentCode: 'efficiency_ratios',    orderCode: '0401' },
  { code: 'fixed_asset_turnover',         parentCode: 'efficiency_ratios',    orderCode: '0402' },
  { code: 'inventory_turnover',           parentCode: 'efficiency_ratios',    orderCode: '0403' },
  { code: 'receivables_turnover',         parentCode: 'efficiency_ratios',    orderCode: '0404' },
  { code: 'payables_turnover',            parentCode: 'efficiency_ratios',    orderCode: '0405' },
  { code: 'working_capital_turnover',     parentCode: 'efficiency_ratios',    orderCode: '0406' },
  { code: 'days_inventory_outstanding',   parentCode: 'efficiency_ratios',    orderCode: '0407' },
  { code: 'days_sales_outstanding',       parentCode: 'efficiency_ratios',    orderCode: '0408' },
  { code: 'days_payables_outstanding',    parentCode: 'efficiency_ratios',    orderCode: '0409' },
  { code: 'cash_conversion_cycle',        parentCode: 'efficiency_ratios',    orderCode: '0410' },

  // Cashflow
  { code: 'operating_cashflow_to_sales',      parentCode: 'cashflow_ratios',  orderCode: '0501' },
  { code: 'operating_cashflow_to_net_income', parentCode: 'cashflow_ratios',  orderCode: '0502' },
  { code: 'free_cash_flow',                   parentCode: 'cashflow_ratios',  orderCode: '0503' },
  { code: 'free_cashflow_margin',             parentCode: 'cashflow_ratios',  orderCode: '0504' },
  { code: 'cash_flow_to_debt',                parentCode: 'cashflow_ratios',  orderCode: '0505' },
  { code: 'cash_interest_coverage',           parentCode: 'cashflow_ratios',  orderCode: '0506' },
  { code: 'fcf_to_net_income',                parentCode: 'cashflow_ratios',  orderCode: '0507' },

  // Valuation
  { code: 'market_price_per_share',       parentCode: 'valuation_models',     orderCode: '0601' },
  { code: 'shares_outstanding',           parentCode: 'valuation_models',     orderCode: '0602' },
  { code: 'enterprise_value_manual',      parentCode: 'valuation_models',     orderCode: '0603' },
  { code: 'market_cap',                   parentCode: 'valuation_models',     orderCode: '0604' },
  { code: 'enterprise_value_calc',        parentCode: 'valuation_models',     orderCode: '0605' },
  { code: 'pe_ratio',                     parentCode: 'valuation_models',     orderCode: '0606' },
  { code: 'pb_ratio',                     parentCode: 'valuation_models',     orderCode: '0607' },
  { code: 'ps_ratio',                     parentCode: 'valuation_models',     orderCode: '0608' },
  { code: 'ev_to_ebitda',                 parentCode: 'valuation_models',     orderCode: '0609' },
  { code: 'ev_to_sales',                  parentCode: 'valuation_models',     orderCode: '0610' },
  { code: 'ev_to_ebit',                   parentCode: 'valuation_models',     orderCode: '0611' },
  { code: 'earnings_yield',               parentCode: 'valuation_models',     orderCode: '0612' },
  { code: 'fcf_yield',                    parentCode: 'valuation_models',     orderCode: '0613' },
  { code: 'price_to_ocf',                 parentCode: 'valuation_models',     orderCode: '0614' },

  // Per share
  { code: 'eps_basic',                    parentCode: 'per_share_metrics',    orderCode: '0701' },
  { code: 'book_value_per_share',         parentCode: 'per_share_metrics',    orderCode: '0702' },
  { code: 'sales_per_share',              parentCode: 'per_share_metrics',    orderCode: '0703' },
  { code: 'operating_cashflow_per_share', parentCode: 'per_share_metrics',    orderCode: '0704' },
  { code: 'fcf_per_share',                parentCode: 'per_share_metrics',    orderCode: '0705' },
];

type NewRatio = {
  code: string;
  name: string;
  parentCode: string;
  orderCode: string;
  formula: string;
  isCalculated?: boolean; // default true
};

const NEW_RATIOS: NewRatio[] = [
  // Liquidity
  { code: 'net_working_capital_to_assets', name: 'Net Working Capital to Assets',
    parentCode: 'liquidity_ratios', orderCode: '0108',
    formula: 'working_capital / total_assets' },

  // Leverage
  { code: 'long_term_debt_to_equity', name: 'Long Term Debt to Equity',
    parentCode: 'leverage_ratios', orderCode: '0211',
    formula: 'long_term_borrowings / equity' },
  { code: 'long_term_debt_to_capital', name: 'Long Term Debt to Capital',
    parentCode: 'leverage_ratios', orderCode: '0212',
    formula: 'long_term_borrowings / (long_term_borrowings + equity)' },
  { code: 'debt_to_ebitda', name: 'Debt to EBITDA',
    parentCode: 'leverage_ratios', orderCode: '0213',
    formula: 'total_debt / ebitda' },
  { code: 'net_debt_to_equity', name: 'Net Debt to Equity',
    parentCode: 'leverage_ratios', orderCode: '0214',
    formula: 'net_debt / equity' },

  // Profitability
  { code: 'pretax_roe', name: 'Pre-Tax ROE',
    parentCode: 'profitability_ratios', orderCode: '0313',
    formula: 'profit_before_tax / equity' },
  { code: 'cash_roa', name: 'Cash ROA',
    parentCode: 'profitability_ratios', orderCode: '0314',
    formula: 'net_cash_from_operating_activities / total_assets' },
  { code: 'rona', name: 'Return on Net Assets',
    parentCode: 'profitability_ratios', orderCode: '0315',
    formula: 'net_profit / (total_assets - current_liabilities)' },
  { code: 'operating_roa', name: 'Operating ROA',
    parentCode: 'profitability_ratios', orderCode: '0316',
    formula: 'ebit / total_assets' },

  // Efficiency
  { code: 'equity_turnover', name: 'Equity Turnover',
    parentCode: 'efficiency_ratios', orderCode: '0411',
    formula: 'revenue_from_operations / equity' },
  { code: 'capital_employed_turnover', name: 'Capital Employed Turnover',
    parentCode: 'efficiency_ratios', orderCode: '0412',
    formula: 'revenue_from_operations / (equity + long_term_borrowings)' },

  // Cashflow (capex is the base used by several formulas below and by quality)
  { code: 'capex', name: 'Capital Expenditure',
    parentCode: 'cashflow_ratios', orderCode: '0508',
    formula: 'purchase_of_property_plant_equipment + purchase_of_intangible_assets' },
  { code: 'capex_to_sales', name: 'Capex to Sales',
    parentCode: 'cashflow_ratios', orderCode: '0509',
    formula: 'capex / revenue_from_operations' },
  { code: 'capex_to_ocf', name: 'Capex to Operating Cashflow',
    parentCode: 'cashflow_ratios', orderCode: '0510',
    formula: 'capex / net_cash_from_operating_activities' },
  { code: 'dividend_payout_ratio', name: 'Dividend Payout Ratio',
    parentCode: 'cashflow_ratios', orderCode: '0511',
    formula: 'dividends_paid / net_profit' },
  { code: 'retention_ratio', name: 'Retention Ratio',
    parentCode: 'cashflow_ratios', orderCode: '0512',
    formula: '(net_profit - dividends_paid) / net_profit' },

  // Valuation
  { code: 'ev_to_fcf', name: 'EV to FCF',
    parentCode: 'valuation_models', orderCode: '0615',
    formula: 'enterprise_value_calc / free_cash_flow' },
  { code: 'ev_to_assets', name: 'EV to Assets',
    parentCode: 'valuation_models', orderCode: '0616',
    formula: 'enterprise_value_calc / total_assets' },
  { code: 'ev_to_capital_employed', name: 'EV to Capital Employed',
    parentCode: 'valuation_models', orderCode: '0617',
    formula: 'enterprise_value_calc / (equity + long_term_borrowings)' },
  { code: 'ev_to_invested_capital', name: 'EV to Invested Capital',
    parentCode: 'valuation_models', orderCode: '0618',
    formula: 'enterprise_value_calc / invested_capital' },

  // Per-share
  { code: 'cash_per_share', name: 'Cash per Share',
    parentCode: 'per_share_metrics', orderCode: '0706',
    formula: 'cash_and_cash_equivalents / shares_outstanding' },
  { code: 'ebitda_per_share', name: 'EBITDA per Share',
    parentCode: 'per_share_metrics', orderCode: '0707',
    formula: 'ebitda / shares_outstanding' },
  { code: 'ebit_per_share', name: 'EBIT per Share',
    parentCode: 'per_share_metrics', orderCode: '0708',
    formula: 'ebit / shares_outstanding' },

  // DuPont Analysis (new category)
  { code: 'dupont_tax_burden', name: 'DuPont: Tax Burden',
    parentCode: 'dupont_analysis', orderCode: '0801',
    formula: 'net_profit / profit_before_tax' },
  { code: 'dupont_interest_burden', name: 'DuPont: Interest Burden',
    parentCode: 'dupont_analysis', orderCode: '0802',
    formula: 'profit_before_tax / ebit' },
  { code: 'dupont_ebit_margin', name: 'DuPont: EBIT Margin',
    parentCode: 'dupont_analysis', orderCode: '0803',
    formula: 'ebit / revenue_from_operations' },
  { code: 'dupont_asset_turnover', name: 'DuPont: Asset Turnover',
    parentCode: 'dupont_analysis', orderCode: '0804',
    formula: 'revenue_from_operations / total_assets' },
  { code: 'dupont_equity_multiplier', name: 'DuPont: Equity Multiplier',
    parentCode: 'dupont_analysis', orderCode: '0805',
    formula: 'total_assets / equity' },
  { code: 'dupont_roe_5step', name: 'DuPont ROE (5-step)',
    parentCode: 'dupont_analysis', orderCode: '0806',
    formula: 'dupont_tax_burden * dupont_interest_burden * dupont_ebit_margin * dupont_asset_turnover * dupont_equity_multiplier' },

  // Earnings Quality (new category)
  { code: 'accruals_to_assets', name: 'Accruals to Assets',
    parentCode: 'quality_metrics', orderCode: '0901',
    formula: '(net_income_aux - operating_cash_flow_aux) / total_assets_aux' },
  { code: 'accruals_to_income', name: 'Accruals to Net Income',
    parentCode: 'quality_metrics', orderCode: '0902',
    formula: '(net_income_aux - operating_cash_flow_aux) / net_income_aux' },
  { code: 'cash_earnings_coverage', name: 'Cash Earnings Coverage',
    parentCode: 'quality_metrics', orderCode: '0903',
    formula: 'operating_cash_flow_aux / net_income_aux' },
  { code: 'capex_depreciation_ratio', name: 'Capex to Depreciation',
    parentCode: 'quality_metrics', orderCode: '0904',
    formula: 'capex_aux / depreciation_aux' },

  // ── Period-consistent valuation models (sourced from auxiliary_data) ──
  // Previously manual inputs — now derived from aux leaves so every
  // ratio uses the same period-aligned share price, earnings, and
  // capital-structure snapshot.
  { code: 'market_price_per_share', name: 'Market Price per Share',
    parentCode: 'valuation_models', orderCode: '0601',
    formula: 'historical_share_price' },
  { code: 'shares_outstanding', name: 'Shares Outstanding',
    parentCode: 'valuation_models', orderCode: '0602',
    formula: 'shares_outstanding_aux' },
  { code: 'market_cap', name: 'Market Cap',
    parentCode: 'valuation_models', orderCode: '0604',
    formula: 'market_cap_aux' },
  { code: 'enterprise_value_calc', name: 'Enterprise Value',
    parentCode: 'valuation_models', orderCode: '0605',
    formula: 'enterprise_value_aux' },
  { code: 'pe_ratio', name: 'P/E Ratio',
    parentCode: 'valuation_models', orderCode: '0606',
    formula: 'historical_share_price / eps_basic_aux' },
  { code: 'pb_ratio', name: 'P/B Ratio',
    parentCode: 'valuation_models', orderCode: '0607',
    formula: 'historical_share_price / book_value_per_share_aux' },
  { code: 'ps_ratio', name: 'P/S Ratio',
    parentCode: 'valuation_models', orderCode: '0608',
    formula: 'market_cap_aux / revenue_aux' },
  { code: 'ev_to_ebitda', name: 'EV / EBITDA',
    parentCode: 'valuation_models', orderCode: '0609',
    formula: 'enterprise_value_aux / ebitda_aux' },
  { code: 'ev_to_sales', name: 'EV / Sales',
    parentCode: 'valuation_models', orderCode: '0610',
    formula: 'enterprise_value_aux / revenue_aux' },
  { code: 'ev_to_ebit', name: 'EV / EBIT',
    parentCode: 'valuation_models', orderCode: '0611',
    formula: 'enterprise_value_aux / ebit_aux' },
  { code: 'earnings_yield', name: 'Earnings Yield',
    parentCode: 'valuation_models', orderCode: '0612',
    formula: 'eps_basic_aux / historical_share_price' },
  { code: 'fcf_yield', name: 'Free Cash Flow Yield',
    parentCode: 'valuation_models', orderCode: '0613',
    formula: 'fcf_per_share_aux / historical_share_price' },
  { code: 'price_to_ocf', name: 'Price / Operating Cash Flow',
    parentCode: 'valuation_models', orderCode: '0614',
    formula: 'historical_share_price / operating_cash_flow_per_share_aux' },

  // Per-share metrics (previously manual inputs / or shares_outstanding-based).
  // Rewritten to use weighted-average shares for P&L flows and
  // period-end shares for stock metrics (cash, book value).
  { code: 'eps_basic', name: 'EPS (Basic)',
    parentCode: 'per_share_metrics', orderCode: '0701',
    formula: 'eps_basic_aux' },
  { code: 'book_value_per_share', name: 'Book Value per Share',
    parentCode: 'per_share_metrics', orderCode: '0702',
    formula: 'book_value_per_share_aux' },
  { code: 'sales_per_share', name: 'Sales per Share',
    parentCode: 'per_share_metrics', orderCode: '0703',
    formula: 'sales_per_share_aux' },
  { code: 'operating_cashflow_per_share', name: 'Operating Cash Flow per Share',
    parentCode: 'per_share_metrics', orderCode: '0704',
    formula: 'operating_cash_flow_per_share_aux' },
  { code: 'fcf_per_share', name: 'Free Cash Flow per Share',
    parentCode: 'per_share_metrics', orderCode: '0705',
    formula: 'fcf_per_share_aux' },
  { code: 'cash_per_share', name: 'Cash per Share',
    parentCode: 'per_share_metrics', orderCode: '0706',
    formula: 'cash_per_share_aux' },
  { code: 'ebitda_per_share', name: 'EBITDA per Share',
    parentCode: 'per_share_metrics', orderCode: '0707',
    formula: 'ebitda_per_share_aux' },
  { code: 'ebit_per_share', name: 'EBIT per Share',
    parentCode: 'per_share_metrics', orderCode: '0708',
    formula: 'ebit_per_share_aux' },

  // Cash-flow ratio upgrades that now use aux re-statements so the same
  // operating cash flow / FCF number drives every dependent ratio.
  { code: 'operating_cashflow_to_sales', name: 'Operating Cash Flow to Sales',
    parentCode: 'cashflow_ratios', orderCode: '0501',
    formula: 'operating_cash_flow_aux / revenue_aux' },
  { code: 'operating_cashflow_to_net_income', name: 'Operating Cash Flow to Net Income',
    parentCode: 'cashflow_ratios', orderCode: '0502',
    formula: 'operating_cash_flow_aux / net_income_aux' },
  { code: 'free_cash_flow', name: 'Free Cash Flow',
    parentCode: 'cashflow_ratios', orderCode: '0503',
    formula: 'free_cash_flow_aux' },
  { code: 'free_cashflow_margin', name: 'Free Cash Flow Margin',
    parentCode: 'cashflow_ratios', orderCode: '0504',
    formula: 'free_cash_flow_aux / revenue_aux' },
  { code: 'cash_flow_to_debt', name: 'Cash Flow to Debt',
    parentCode: 'cashflow_ratios', orderCode: '0505',
    formula: 'operating_cash_flow_aux / total_debt_aux' },
  { code: 'fcf_to_net_income', name: 'FCF to Net Income',
    parentCode: 'cashflow_ratios', orderCode: '0507',
    formula: 'free_cash_flow_aux / net_income_aux' },

  // Leverage ratio upgrades — aux inputs for period-consistent results.
  { code: 'total_debt', name: 'Total Debt',
    parentCode: 'leverage_ratios', orderCode: '0201',
    formula: 'total_debt_aux' },
  { code: 'net_debt', name: 'Net Debt',
    parentCode: 'leverage_ratios', orderCode: '0202',
    formula: 'net_debt_aux' },
  { code: 'debt_to_equity', name: 'Debt to Equity',
    parentCode: 'leverage_ratios', orderCode: '0203',
    formula: 'total_debt_aux / total_equity' },
  { code: 'debt_to_assets', name: 'Debt to Assets',
    parentCode: 'leverage_ratios', orderCode: '0204',
    formula: 'total_debt_aux / total_assets_aux' },
  { code: 'debt_to_ebitda', name: 'Debt to EBITDA',
    parentCode: 'leverage_ratios', orderCode: '0213',
    formula: 'total_debt_aux / ebitda_aux' },
  { code: 'net_debt_to_equity', name: 'Net Debt to Equity',
    parentCode: 'leverage_ratios', orderCode: '0214',
    formula: 'net_debt_aux / total_equity' },
  { code: 'net_debt_to_ebitda', name: 'Net Debt to EBITDA',
    parentCode: 'leverage_ratios', orderCode: '0210',
    formula: 'net_debt_aux / ebitda_aux' },

  // Profitability upgrades.
  { code: 'roe', name: 'Return on Equity',
    parentCode: 'profitability_ratios', orderCode: '0310',
    formula: 'net_income_aux / total_equity_ex_nci' },
  { code: 'roa', name: 'Return on Assets',
    parentCode: 'profitability_ratios', orderCode: '0309',
    formula: 'net_income_aux / total_assets_aux' },
  { code: 'roce', name: 'Return on Capital Employed',
    parentCode: 'profitability_ratios', orderCode: '0311',
    formula: 'ebit_aux / capital_employed_aux' },
  { code: 'net_margin', name: 'Net Margin',
    parentCode: 'profitability_ratios', orderCode: '0308',
    formula: 'net_income_aux / revenue_aux' },
  { code: 'ebit_margin', name: 'EBIT Margin',
    parentCode: 'profitability_ratios', orderCode: '0306',
    formula: 'ebit_aux / revenue_aux' },
  { code: 'ebitda_margin', name: 'EBITDA Margin',
    parentCode: 'profitability_ratios', orderCode: '0305',
    formula: 'ebitda_aux / revenue_aux' },

  // EV aggregates re-sourced from aux so they stay period-consistent.
  { code: 'ev_to_fcf', name: 'EV to FCF',
    parentCode: 'valuation_models', orderCode: '0615',
    formula: 'enterprise_value_aux / free_cash_flow_aux' },
  { code: 'ev_to_assets', name: 'EV to Assets',
    parentCode: 'valuation_models', orderCode: '0616',
    formula: 'enterprise_value_aux / total_assets_aux' },
  { code: 'ev_to_capital_employed', name: 'EV to Capital Employed',
    parentCode: 'valuation_models', orderCode: '0617',
    formula: 'enterprise_value_aux / capital_employed_aux' },
];

async function main() {
  // 1. Delete orphans
  const del = await prisma.financialLineItem.deleteMany({
    where: { code: { in: ['derived_root', 'operating_cash_flow_section'] } },
  });

  // 2. Upsert categories
  let catCount = 0;
  const catIdByCode = new Map<string, string>();
  for (const cat of CATEGORIES) {
    const row = await prisma.financialLineItem.upsert({
      where: { code: cat.code },
      create: {
        code: cat.code,
        name: cat.name,
        statementType: ST,
        parentId: null,
        orderCode: cat.orderCode,
        displayOrder: Number(cat.orderCode),
        isRequired: false,
        isCalculated: false,
        formula: null,
      },
      update: {
        name: cat.name,
        statementType: ST,
        parentId: null,
        orderCode: cat.orderCode,
        displayOrder: Number(cat.orderCode),
        isCalculated: false,
        formula: null,
      },
      select: { id: true, code: true },
    });
    catIdByCode.set(row.code, row.id);
    catCount++;
  }

  // 3. Reparent existing ratios (parentId + orderCode only — leave formulas,
  //    isCalculated, isRequired untouched to preserve manual-input items like
  //    market_price_per_share / shares_outstanding / enterprise_value_manual).
  let reparented = 0;
  for (const ex of EXISTING) {
    const parentId = catIdByCode.get(ex.parentCode);
    if (!parentId) throw new Error(`Missing category ${ex.parentCode} for ${ex.code}`);
    const res = await prisma.financialLineItem.updateMany({
      where: { code: ex.code },
      data: { parentId, orderCode: ex.orderCode, displayOrder: Number(ex.orderCode) },
    });
    if (res.count === 0) {
      console.warn(`  (skipped) existing ratio not found: ${ex.code}`);
    } else {
      reparented += res.count;
    }
  }

  // 4. Upsert new ratios
  let inserted = 0;
  let updated = 0;
  for (const n of NEW_RATIOS) {
    const parentId = catIdByCode.get(n.parentCode);
    if (!parentId) throw new Error(`Missing category ${n.parentCode} for ${n.code}`);
    const existing = await prisma.financialLineItem.findUnique({ where: { code: n.code } });
    if (existing) {
      await prisma.financialLineItem.update({
        where: { code: n.code },
        data: {
          name: n.name,
          statementType: ST,
          parentId,
          orderCode: n.orderCode,
          displayOrder: Number(n.orderCode),
          isCalculated: n.isCalculated ?? true,
          formula: n.formula,
        },
      });
      updated++;
    } else {
      await prisma.financialLineItem.create({
        data: {
          code: n.code,
          name: n.name,
          statementType: ST,
          parentId,
          orderCode: n.orderCode,
          displayOrder: Number(n.orderCode),
          isRequired: false,
          isCalculated: n.isCalculated ?? true,
          formula: n.formula,
        },
      });
      inserted++;
    }
  }

  console.log(
    `deleted: ${del.count}, categories upserted: ${catCount}, ` +
    `reparented: ${reparented}, new items inserted: ${inserted}, new items updated: ${updated}`
  );
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
