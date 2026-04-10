import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
(async () => {
  const dup = await p.financialLineItem.findMany({
    where: { code: 'operating_cash_flow_section' },
    select: { code: true, statementType: true, parentId: true, orderCode: true, formula: true }
  });
  console.log('operating_cash_flow_section rows:', dup);

  // Is the derived_root or operating_cash_flow_section referenced by any FinancialMetric values?
  const metrics = await p.$queryRawUnsafe<any[]>(`
    SELECT li.code, COUNT(m.id)::int as n
    FROM financial_line_items li
    LEFT JOIN financial_metrics m ON m.line_item_id = li.id
    WHERE li.code IN ('derived_root','operating_cash_flow_section')
    GROUP BY li.code
  `);
  console.log('metric counts:', metrics);

  // Check children currently pointing at these
  const kids = await p.$queryRawUnsafe<any[]>(`
    SELECT c.code, p.code AS parent
    FROM financial_line_items c JOIN financial_line_items p ON c.parent_id = p.id
    WHERE p.code IN ('derived_root','operating_cash_flow_section')
  `);
  console.log('children of those:', kids);

  await p.$disconnect();
})();
