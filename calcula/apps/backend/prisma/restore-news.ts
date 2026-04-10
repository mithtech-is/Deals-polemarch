import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
const prisma = new PrismaClient();
(async () => {
  const dump = JSON.parse(fs.readFileSync('/tmp/medusa-INE0DJ201029-news.json', 'utf8'));
  const company = await prisma.company.findUnique({ where: { isin: dump.isin }, select: { id: true } });
  if (!company) throw new Error('Company not found: ' + dump.isin);

  const del = await prisma.newsEvent.deleteMany({ where: { companyId: company.id } });

  let inserted = 0;
  for (const e of dump.events) {
    await prisma.newsEvent.create({
      data: {
        companyId: company.id,
        occurredAt: new Date(e.occurredAt),
        category: e.category,
        sentiment: e.sentiment ?? null,
        impactScore: e.impactScore ?? null,
        title: e.title,
        body: e.body,
        sourceUrl: e.sourceUrl ?? null,
      },
    });
    inserted++;
  }

  await prisma.company.update({
    where: { id: company.id },
    data: { newsVersion: { increment: 1 }, contentUpdatedAt: new Date() },
  });

  console.log(`deleted: ${del.count}, inserted: ${inserted}`);
  await prisma.$disconnect();
})();
