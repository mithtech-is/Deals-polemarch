import { PrismaClient, StatementType } from '@prisma/client';

const prisma = new PrismaClient();

const groups: Array<{ statementType: StatementType; names: string[] }> = [
  {
    statementType: 'pnl',
    names: [
      'Revenue',
      'Cost of Goods Sold',
      'Expenses',
      'Operating Expenses',
      'Administrative Expenses',
      'Other Expenses',
      'Selling and Distribution',
      'Depreciation',
      'Finance Costs',
      'Tax'
    ]
  },
  {
    statementType: 'balance_sheet',
    names: [
      'Assets',
      'Non Current Assets',
      'Current Assets',
      'Equity',
      'Non Current Liabilities',
      'Current Liabilities'
    ]
  },
  {
    statementType: 'cashflow',
    names: [
      'Operating Activities',
      'Working Capital Adjustments',
      'Investing Activities',
      'Financing Activities',
      'Net Cash Reconciliation'
    ]
  }
];

async function main() {
  for (const group of groups) {
    const existing = await prisma.financialLineItem.findMany({
      where: { statementType: group.statementType, name: { in: group.names } },
      select: { name: true }
    });
    const foundNames = new Set(existing.map((item) => item.name));
    const missing = group.names.filter((name) => !foundNames.has(name));

    const result = await prisma.financialLineItem.updateMany({
      where: { statementType: group.statementType, name: { in: group.names } },
      data: { isRequired: true }
    });

    console.log(`[${group.statementType}] updated ${result.count} / ${group.names.length}`);
    if (missing.length) {
      console.log(`  missing (not in DB, skipped): ${missing.join(', ')}`);
    }
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
