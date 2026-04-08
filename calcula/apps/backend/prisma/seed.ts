import { PrismaClient, PlatformRole, StatementType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.platformUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: 'admin123',
      role: PlatformRole.ADMIN
    }
  });

  type SeedLineItem = {
    code: string;
    name: string;
    statementType: StatementType;
    displayOrder: number;
    isRequired?: boolean;
    parentCode?: string;
  };

  const lineItems: SeedLineItem[] = [
    { code: 'bs_root', name: 'Balance Sheet', statementType: StatementType.balance_sheet, displayOrder: 1, isRequired: true },
    { code: 'pnl_root', name: 'Profit and Loss', statementType: StatementType.pnl, displayOrder: 1, isRequired: true },
    { code: 'cf_root', name: 'Cash Flow', statementType: StatementType.cashflow, displayOrder: 1, isRequired: true },
    { code: 'assets', name: 'Assets', statementType: StatementType.balance_sheet, displayOrder: 10, parentCode: 'bs_root' },
    { code: 'equity_liabilities', name: 'Equity and Liabilities', statementType: StatementType.balance_sheet, displayOrder: 20, parentCode: 'bs_root' },
    { code: 'revenue_section', name: 'Revenue', statementType: StatementType.pnl, displayOrder: 10, parentCode: 'pnl_root' },
    { code: 'expense_section', name: 'Expenses', statementType: StatementType.pnl, displayOrder: 20, parentCode: 'pnl_root' },
    { code: 'operating_activities', name: 'Operating Activities', statementType: StatementType.cashflow, displayOrder: 10, parentCode: 'cf_root' },
    { code: 'investing_activities', name: 'Investing Activities', statementType: StatementType.cashflow, displayOrder: 20, parentCode: 'cf_root' },
    { code: 'financing_activities', name: 'Financing Activities', statementType: StatementType.cashflow, displayOrder: 30, parentCode: 'cf_root' },
    { code: 'revenue', name: 'Revenue from Operations', statementType: StatementType.pnl, displayOrder: 11, parentCode: 'revenue_section' },
    { code: 'net_profit', name: 'Net Profit', statementType: StatementType.pnl, displayOrder: 99, parentCode: 'pnl_root' },
    { code: 'cash_and_cash_equivalents', name: 'Cash and Cash Equivalents', statementType: StatementType.balance_sheet, displayOrder: 40, parentCode: 'assets' }
  ];

  const map = new Map<string, string>();
  for (const item of lineItems) {
    const parentId = item.parentCode ? map.get(item.parentCode) : null;
    const row = await prisma.financialLineItem.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        statementType: item.statementType,
        displayOrder: item.displayOrder,
        isRequired: item.isRequired ?? false,
        parentId: parentId ?? null
      },
      create: {
        code: item.code,
        name: item.name,
        statementType: item.statementType,
        displayOrder: item.displayOrder,
        isRequired: item.isRequired ?? false,
        parentId: parentId ?? null
      }
    });
    map.set(item.code, row.id);
  }

  await prisma.$executeRawUnsafe(`
    INSERT INTO financial_remainder_mappings (parent_line_item_id, remainder_line_item_id, created_at, updated_at)
    SELECT p.id, c.id, now(), now()
    FROM financial_line_items p
    JOIN financial_line_items c ON c.code = 'other_income'
    WHERE p.code = 'revenue_section'
    ON CONFLICT (parent_line_item_id) DO UPDATE
    SET remainder_line_item_id = EXCLUDED.remainder_line_item_id,
        updated_at = now()
  `);

  console.log(`Seed complete. Admin user: ${admin.username}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
