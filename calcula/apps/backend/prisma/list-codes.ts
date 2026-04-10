import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
(async () => {
  const rows = await p.financialLineItem.findMany({
    where: { statementType: { in: ['balance_sheet','pnl','cashflow'] as any } },
    select: { code: true, statementType: true },
    orderBy: [{ statementType: 'asc' }, { code: 'asc' }],
  });
  for (const r of rows) console.log(r.statementType.padEnd(14), r.code);
  console.log('TOTAL', rows.length);
  await p.$disconnect();
})();
