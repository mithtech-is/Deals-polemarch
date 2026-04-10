import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
(async () => {
  const rows = await p.financialLineItem.findMany({
    where: { statementType: 'ratios_valuations' as any },
    orderBy: [{ orderCode: 'asc' }, { code: 'asc' }],
    select: { id: true, code: true, name: true, parentId: true, orderCode: true, isCalculated: true, formula: true },
  });
  const byId = new Map(rows.map(r => [r.id, r]));
  const withParentCode = rows.map(r => ({
    code: r.code,
    name: r.name,
    parent: r.parentId ? byId.get(r.parentId)?.code ?? null : null,
    orderCode: r.orderCode,
    isCalculated: r.isCalculated,
    formula: r.formula,
  }));
  console.log(JSON.stringify(withParentCode, null, 2));
  console.log(`TOTAL: ${rows.length}`);
  await p.$disconnect();
})();
