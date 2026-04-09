/**
 * One-off script: upload 90 days of synthetic price data for API Holdings
 * into calcula. Prices sampled uniformly in [5.5, 6.2]. Idempotent — uses
 * the same composite upsert key (companyId, datetime) as the regular admin
 * bulk mutation, so re-running replaces the values for existing dates.
 *
 * Run from apps/backend: npm run seed:api-prices
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_ISIN = 'INE0DJ201029'; // API Holdings
const NAME_LIKE = 'API';
const DAYS = 90;
const PRICE_MIN = 5.5;
const PRICE_MAX = 6.2;

function randomPrice() {
  const v = PRICE_MIN + Math.random() * (PRICE_MAX - PRICE_MIN);
  return Math.round(v * 10000) / 10000; // 4 dp to match Decimal(18,4)
}

async function main() {
  // Match by ISIN first, fall back to name ILIKE.
  let company = await prisma.company.findUnique({
    where: { isin: TARGET_ISIN },
    select: { id: true, isin: true, name: true }
  });
  if (!company) {
    company = await prisma.company.findFirst({
      where: { name: { contains: NAME_LIKE, mode: 'insensitive' } },
      select: { id: true, isin: true, name: true }
    });
  }
  if (!company) {
    throw new Error(`No company found for ISIN ${TARGET_ISIN} or name LIKE %${NAME_LIKE}%`);
  }
  console.log(`Target: ${company.name} (${company.isin}) id=${company.id}`);

  // Build 90 daily rows ending today (00:00:00 local-but-stored-as-UTC so
  // the composite unique (companyId, datetime) doesn't collide across runs
  // on the same day — same datetime means upsert, not duplicate row).
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const rows: Array<{ datetime: Date; price: number }> = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    rows.push({ datetime: d, price: randomPrice() });
  }

  // Upsert in one transaction so priceVersion bumps once.
  await prisma.$transaction(
    rows.map((r) =>
      prisma.companyPriceHistory.upsert({
        where: { companyId_datetime: { companyId: company!.id, datetime: r.datetime } },
        update: { price: r.price },
        create: { companyId: company!.id, datetime: r.datetime, price: r.price }
      })
    )
  );

  // Bump version + touch contentUpdatedAt so Medusa pulls the new data on
  // its next sync tick.
  await prisma.company.update({
    where: { id: company.id },
    data: {
      priceVersion: { increment: 1 },
      contentUpdatedAt: new Date()
    }
  });

  const count = await prisma.companyPriceHistory.count({
    where: { companyId: company.id }
  });
  console.log(
    `Upserted ${rows.length} rows for ${company.name}. Total price rows now: ${count}.`
  );
  console.log(
    `Price range seeded: ${rows.reduce((m, r) => Math.min(m, r.price), Infinity).toFixed(4)} – ${rows
      .reduce((m, r) => Math.max(m, r.price), -Infinity)
      .toFixed(4)}`
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
