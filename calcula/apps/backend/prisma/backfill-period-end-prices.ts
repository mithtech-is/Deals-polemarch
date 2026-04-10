/**
 * Backfill `historical_share_price` (auxiliary_data leaf) for every
 * company period from CompanyPriceHistory. For each period, we find the
 * most recent price row with `datetime <= period.periodEnd`. If none
 * exists (e.g. a pre-listing period), we fall back to the oldest
 * available price so ratios at least have a non-null anchor — with a
 * warning logged.
 *
 * Idempotent — upserts via the (companyId, periodId, lineItemId) unique
 * key on FinancialMetric.
 *
 * Run: npx tsx prisma/backfill-period-end-prices.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const lineItem = await prisma.financialLineItem.findUnique({
    where: { code: 'historical_share_price' },
    select: { id: true }
  });
  if (!lineItem) {
    throw new Error("Missing `historical_share_price` line item — run `seed-auxiliary-data.ts` first.");
  }

  const companies = await prisma.company.findMany({
    select: { id: true, isin: true, name: true }
  });

  let totalWritten = 0;
  let totalMissing = 0;
  const affectedCompanyIds = new Set<string>();

  for (const company of companies) {
    const periods = await prisma.financialPeriod.findMany({
      where: { companyId: company.id, fiscalQuarter: null },
      orderBy: [{ fiscalYear: 'asc' }],
      select: { id: true, fiscalYear: true, periodEnd: true }
    });
    if (periods.length === 0) continue;

    for (const period of periods) {
      // Most recent price on or before the period-end date.
      let priceRow = await prisma.companyPriceHistory.findFirst({
        where: {
          companyId: company.id,
          datetime: { lte: period.periodEnd }
        },
        orderBy: { datetime: 'desc' },
        select: { price: true, datetime: true }
      });

      // Fallback: if no price on-or-before (e.g. only forward-dated
      // data), take the earliest available price. Better than null for
      // analytics UI.
      if (!priceRow) {
        priceRow = await prisma.companyPriceHistory.findFirst({
          where: { companyId: company.id },
          orderBy: { datetime: 'asc' },
          select: { price: true, datetime: true }
        });
      }

      if (!priceRow) {
        totalMissing++;
        continue;
      }

      const value = priceRow.price.toString();
      await prisma.financialMetric.upsert({
        where: {
          companyId_periodId_lineItemId: {
            companyId: company.id,
            periodId: period.id,
            lineItemId: lineItem.id
          }
        },
        update: { value, currency: 'INR', valueSource: 'derived' },
        create: {
          companyId: company.id,
          periodId: period.id,
          lineItemId: lineItem.id,
          value,
          currency: 'INR',
          valueSource: 'derived'
        }
      });
      totalWritten++;
      affectedCompanyIds.add(company.id);
    }
  }

  if (affectedCompanyIds.size > 0) {
    await prisma.company.updateMany({
      where: { id: { in: Array.from(affectedCompanyIds) } },
      data: { statementsVersion: { increment: 1 }, contentUpdatedAt: new Date() }
    });
  }

  console.log(
    `Backfilled ${totalWritten} period-end prices across ${affectedCompanyIds.size} companies. ` +
      `${totalMissing} periods had no price history available.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
