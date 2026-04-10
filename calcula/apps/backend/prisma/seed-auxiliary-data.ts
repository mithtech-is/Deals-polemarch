/**
 * Seed the `auxiliary_data` taxonomy — a dedicated namespace for raw
 * time-variant inputs used by ratio / analytics / valuation computations
 * that need period-consistent lookups.
 *
 * Philosophy: every value here is either
 *   (a) a RE-STATEMENT of a P&L / BS / CF leaf under a stable code that
 *       ratio formulas can reference without caring about taxonomy
 *       reshuffles, or
 *   (b) an EXOGENOUS INPUT that doesn't live in the accounting statements
 *       (share price, shares outstanding, employee count), or
 *   (c) a DERIVED SCALAR computed from (a) + (b) — market cap, EV, EPS,
 *       BVPS, FCF per share, etc.
 *
 * Every ratio in expand-ratios.ts is rewritten to source its inputs from
 * this namespace so ratio values are period-aligned even if the admin
 * restates the underlying BS/PL (e.g. changing display scale, swapping
 * line items). `historical_share_price` is backfilled from
 * CompanyPriceHistory via `backfill-period-end-prices.ts`, giving us the
 * correct period-end price for PE / PB / EV ratios.
 *
 * Run: npx tsx prisma/seed-auxiliary-data.ts
 */
import { PrismaClient, StatementType } from '@prisma/client';

const prisma = new PrismaClient();

type Item = {
  code: string;
  name: string;
  orderCode: string;
  parentCode?: string;
  isCalculated?: boolean;
  formula?: string;
};

const items: Item[] = [
  // ── Balance Sheet re-statements (raw leaves copied from BS) ──
  { code: 'total_equity',         name: 'Total Equity (incl. NCI)',         orderCode: '0101' },
  { code: 'total_equity_ex_nci',  name: 'Total Equity (owners of parent)',  orderCode: '0102' },
  { code: 'total_assets_aux',     name: 'Total Assets',                     orderCode: '0103' },
  { code: 'total_liabilities_aux',name: 'Total Liabilities',                orderCode: '0104' },
  { code: 'total_debt_aux',       name: 'Total Debt (LT + ST)',             orderCode: '0105' },
  { code: 'cash_aux',             name: 'Cash & Equivalents + Bank Balances', orderCode: '0106' },
  {
    code: 'net_debt_aux',
    name: 'Net Debt',
    orderCode: '0107',
    isCalculated: true,
    formula: 'total_debt_aux - cash_aux'
  },
  { code: 'invested_capital_aux', name: 'Invested Capital',                 orderCode: '0108' },
  { code: 'working_capital_aux',  name: 'Working Capital',                  orderCode: '0109' },
  { code: 'capital_employed_aux', name: 'Capital Employed',                 orderCode: '0110' },

  // ── P&L re-statements ───────────────────────────────────────
  { code: 'revenue_aux',          name: 'Revenue',                          orderCode: '0201' },
  { code: 'gross_profit_aux',     name: 'Gross Profit',                     orderCode: '0202' },
  { code: 'ebit_aux',             name: 'EBIT',                             orderCode: '0203' },
  { code: 'ebitda_aux',           name: 'EBITDA',                           orderCode: '0204' },
  { code: 'interest_expense_aux', name: 'Interest Expense',                 orderCode: '0205' },
  { code: 'depreciation_aux',     name: 'Depreciation & Amortisation',      orderCode: '0206' },
  { code: 'net_income_aux',       name: 'Net Income (to owners)',           orderCode: '0207' },
  { code: 'tax_expense_aux',      name: 'Tax Expense',                      orderCode: '0208' },

  // ── Cash flow re-statements ────────────────────────────────
  { code: 'operating_cash_flow_aux', name: 'Operating Cash Flow',           orderCode: '0301' },
  { code: 'capex_aux',            name: 'Capital Expenditure',              orderCode: '0302' },
  {
    code: 'free_cash_flow_aux',
    name: 'Free Cash Flow',
    orderCode: '0303',
    isCalculated: true,
    formula: 'operating_cash_flow_aux - capex_aux'
  },
  { code: 'dividends_paid_aux',   name: 'Dividends Paid',                   orderCode: '0304' },

  // ── Share structure & exogenous market inputs ──────────────
  { code: 'shares_outstanding_aux', name: 'Shares Outstanding (millions)',  orderCode: '0401' },
  { code: 'weighted_avg_shares_aux',name: 'Weighted Avg. Shares (millions)',orderCode: '0402' },
  { code: 'historical_share_price', name: 'Historical Share Price (period end)', orderCode: '0403' },

  // ── Derived per-share + valuation snapshots ─────────────────
  {
    code: 'market_cap_aux',
    name: 'Market Capitalisation',
    orderCode: '0501',
    isCalculated: true,
    formula: 'shares_outstanding_aux * historical_share_price'
  },
  {
    code: 'enterprise_value_aux',
    name: 'Enterprise Value',
    orderCode: '0502',
    isCalculated: true,
    formula: 'market_cap_aux + net_debt_aux'
  },
  {
    code: 'book_value_per_share_aux',
    name: 'Book Value per Share',
    orderCode: '0503',
    isCalculated: true,
    formula: 'total_equity_ex_nci / shares_outstanding_aux'
  },
  {
    code: 'eps_basic_aux',
    name: 'EPS (Basic)',
    orderCode: '0504',
    isCalculated: true,
    formula: 'net_income_aux / weighted_avg_shares_aux'
  },
  {
    code: 'sales_per_share_aux',
    name: 'Sales per Share',
    orderCode: '0505',
    isCalculated: true,
    formula: 'revenue_aux / weighted_avg_shares_aux'
  },
  {
    code: 'operating_cash_flow_per_share_aux',
    name: 'Operating Cash Flow per Share',
    orderCode: '0506',
    isCalculated: true,
    formula: 'operating_cash_flow_aux / weighted_avg_shares_aux'
  },
  {
    code: 'fcf_per_share_aux',
    name: 'Free Cash Flow per Share',
    orderCode: '0507',
    isCalculated: true,
    formula: 'free_cash_flow_aux / weighted_avg_shares_aux'
  },
  {
    code: 'dividends_per_share_aux',
    name: 'Dividends per Share',
    orderCode: '0508',
    isCalculated: true,
    formula: 'dividends_paid_aux / weighted_avg_shares_aux'
  },
  {
    code: 'ebitda_per_share_aux',
    name: 'EBITDA per Share',
    orderCode: '0509',
    isCalculated: true,
    formula: 'ebitda_aux / weighted_avg_shares_aux'
  },
  {
    code: 'ebit_per_share_aux',
    name: 'EBIT per Share',
    orderCode: '0510',
    isCalculated: true,
    formula: 'ebit_aux / weighted_avg_shares_aux'
  },
  {
    code: 'cash_per_share_aux',
    name: 'Cash per Share',
    orderCode: '0511',
    isCalculated: true,
    formula: 'cash_aux / weighted_avg_shares_aux'
  },

  // ── People / productivity / cost-of-capital inputs ─────────
  { code: 'employee_count',       name: 'Employee Count (period end)',      orderCode: '0601' },
  {
    code: 'revenue_per_employee',
    name: 'Revenue per Employee',
    orderCode: '0602',
    isCalculated: true,
    formula: 'revenue_aux / employee_count'
  },
  { code: 'avg_interest_rate',    name: 'Average Interest Rate on Debt',    orderCode: '0603' },
  {
    code: 'effective_tax_rate',
    name: 'Effective Tax Rate',
    orderCode: '0604',
    isCalculated: true,
    formula: 'tax_expense_aux / (net_income_aux + tax_expense_aux)'
  }
];

async function main() {
  const idByCode = new Map<string, string>();
  let created = 0;
  let updated = 0;

  for (const item of items) {
    const parentId = item.parentCode ? idByCode.get(item.parentCode) ?? null : null;
    const existing = await prisma.financialLineItem.findUnique({ where: { code: item.code } });
    const row = await prisma.financialLineItem.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        statementType: StatementType.auxiliary_data,
        parentId,
        orderCode: item.orderCode,
        isCalculated: item.isCalculated ?? false,
        formula: item.formula ?? null
      },
      create: {
        code: item.code,
        name: item.name,
        statementType: StatementType.auxiliary_data,
        parentId,
        orderCode: item.orderCode,
        displayOrder: parseInt(item.orderCode, 10),
        isCalculated: item.isCalculated ?? false,
        formula: item.formula ?? null
      }
    });
    idByCode.set(item.code, row.id);
    if (existing) updated++;
    else created++;
  }

  const bumped = await prisma.company.updateMany({
    data: { statementsVersion: { increment: 1 }, contentUpdatedAt: new Date() }
  });

  console.log(`Auxiliary data seed: created=${created}, updated=${updated}, companies bumped=${bumped.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
