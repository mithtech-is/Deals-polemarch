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
  { code: 'opening_equity', name: 'Opening Equity Balance', orderCode: '01' },
  { code: 'changes_during_period', name: 'Changes During Period', orderCode: '02' },
  { code: 'profit_for_period_equity', name: 'Profit for the Period', orderCode: '0201', parentCode: 'changes_during_period', isCalculated: true, formula: 'net_profit' },
  { code: 'other_comprehensive_income', name: 'Other Comprehensive Income', orderCode: '0202', parentCode: 'changes_during_period' },
  { code: 'total_comprehensive_income', name: 'Total Comprehensive Income', orderCode: '0203', parentCode: 'changes_during_period', isCalculated: true, formula: 'profit_for_period_equity + other_comprehensive_income' },
  { code: 'dividends_declared_equity', name: 'Dividends Declared', orderCode: '0204', parentCode: 'changes_during_period' },
  { code: 'share_capital_issued', name: 'Share Capital Issued', orderCode: '0205', parentCode: 'changes_during_period' },
  { code: 'securities_premium_added', name: 'Securities Premium Added', orderCode: '0206', parentCode: 'changes_during_period' },
  { code: 'share_buyback', name: 'Share Buyback', orderCode: '0207', parentCode: 'changes_during_period' },
  { code: 'treasury_shares_movement', name: 'Treasury Shares Movement', orderCode: '0208', parentCode: 'changes_during_period' },
  { code: 'share_based_payment_reserve', name: 'Share-Based Payment Reserve Movement', orderCode: '0209', parentCode: 'changes_during_period' },
  { code: 'transfer_to_reserves', name: 'Transfer to/from Reserves', orderCode: '0210', parentCode: 'changes_during_period' },
  { code: 'other_equity_movements', name: 'Other Equity Movements', orderCode: '0211', parentCode: 'changes_during_period' },
  {
    code: 'closing_equity',
    name: 'Closing Equity Balance',
    orderCode: '03',
    isCalculated: true,
    formula:
      'opening_equity + total_comprehensive_income - dividends_declared_equity + share_capital_issued + securities_premium_added - share_buyback + treasury_shares_movement + share_based_payment_reserve + transfer_to_reserves + other_equity_movements',
  },
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
        statementType: StatementType.change_in_equity,
        parentId,
        orderCode: item.orderCode,
        isCalculated: item.isCalculated ?? false,
        formula: item.formula ?? null,
      },
      create: {
        code: item.code,
        name: item.name,
        statementType: StatementType.change_in_equity,
        parentId,
        orderCode: item.orderCode,
        displayOrder: parseInt(item.orderCode, 10),
        isCalculated: item.isCalculated ?? false,
        formula: item.formula ?? null,
      },
    });
    idByCode.set(item.code, row.id);
    if (existing) updated++;
    else created++;
  }

  const bumped = await prisma.company.updateMany({
    data: { statementsVersion: { increment: 1 }, contentUpdatedAt: new Date() },
  });

  console.log(`SOCIE seed: created=${created}, updated=${updated}, companies bumped=${bumped.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
