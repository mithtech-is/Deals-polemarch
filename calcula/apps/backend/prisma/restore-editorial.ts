import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const path = process.argv[2] || '/tmp/medusa-INE0DJ201029-editorial.json';
  const dump = JSON.parse(fs.readFileSync(path, 'utf8'));
  const company = await prisma.company.findUnique({
    where: { isin: dump.isin },
    select: { id: true },
  });
  if (!company) throw new Error('Company not found: ' + dump.isin);
  const companyId = company.id;

  const result: Record<string, string> = {};

  if (dump.overview) {
    await prisma.companyOverview.upsert({
      where: { companyId },
      create: {
        companyId,
        summary: dump.overview.summary ?? '',
        businessModel: dump.overview.businessModel ?? null,
        competitiveMoat: dump.overview.competitiveMoat ?? null,
        risks: dump.overview.risks ?? null,
      },
      update: {
        summary: dump.overview.summary ?? '',
        businessModel: dump.overview.businessModel ?? null,
        competitiveMoat: dump.overview.competitiveMoat ?? null,
        risks: dump.overview.risks ?? null,
      },
    });
    result.overview = 'ok';
  }

  if (dump.prosCons) {
    await prisma.prosCons.upsert({
      where: { companyId },
      create: { companyId, pros: dump.prosCons.pros ?? '', cons: dump.prosCons.cons ?? '' },
      update: { pros: dump.prosCons.pros ?? '', cons: dump.prosCons.cons ?? '' },
    });
    result.prosCons = 'ok';
  }

  if (dump.faq?.items) {
    await prisma.companyFaq.upsert({
      where: { companyId },
      create: { companyId, items: dump.faq.items },
      update: { items: dump.faq.items },
    });
    result.faq = `${dump.faq.items.length} items`;
  }

  if (dump.team?.members) {
    await prisma.companyTeam.upsert({
      where: { companyId },
      create: { companyId, members: dump.team.members },
      update: { members: dump.team.members },
    });
    result.team = `${dump.team.members.length} members`;
  }

  if (dump.shareholders?.entries) {
    await prisma.companyShareholders.upsert({
      where: { companyId },
      create: { companyId, entries: dump.shareholders.entries },
      update: { entries: dump.shareholders.entries },
    });
    result.shareholders = `${dump.shareholders.entries.length} entries`;
  }

  if (dump.competitors?.entries) {
    await prisma.companyCompetitors.upsert({
      where: { companyId },
      create: { companyId, entries: dump.competitors.entries },
      update: { entries: dump.competitors.entries },
    });
    result.competitors = `${dump.competitors.entries.length} entries`;
  } else {
    result.competitors = 'null in dump, skipped';
  }

  await prisma.company.update({
    where: { id: companyId },
    data: { editorialVersion: { increment: 1 }, contentUpdatedAt: new Date() },
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
