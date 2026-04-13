/**
 * Seed non-financial editorial + company details for NSE and boAt.
 * Populates: overview, prosCons, team, shareholders, competitors, companyDetails.
 * Does NOT touch financials, FAQ (already exists), or valuations.
 *
 * Run: npx tsx prisma/seed-nse-boat-editorial.ts
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const data = JSON.parse(fs.readFileSync('/tmp/seed-nse-boat-editorial.json', 'utf8'));

  for (const [label, entry] of Object.entries(data) as [string, any][]) {
    const company = await prisma.company.findUnique({
      where: { isin: entry.isin },
      select: { id: true, name: true },
    });
    if (!company) {
      console.log(`SKIP: ${label} (${entry.isin}) — not found in companies table`);
      continue;
    }
    console.log(`\n=== ${company.name} (${entry.isin}) ===`);
    const companyId = company.id;

    // 1. Overview
    if (entry.overview) {
      await prisma.companyOverview.upsert({
        where: { companyId },
        create: {
          companyId,
          summary: entry.overview.summary ?? '',
          businessModel: entry.overview.businessModel ?? null,
          competitiveMoat: entry.overview.competitiveMoat ?? null,
          risks: entry.overview.risks ?? null,
        },
        update: {
          summary: entry.overview.summary ?? '',
          businessModel: entry.overview.businessModel ?? null,
          competitiveMoat: entry.overview.competitiveMoat ?? null,
          risks: entry.overview.risks ?? null,
        },
      });
      console.log('  overview: ok');
    }

    // 2. Pros / Cons
    if (entry.prosCons) {
      await prisma.prosCons.upsert({
        where: { companyId },
        create: { companyId, pros: entry.prosCons.pros ?? '', cons: entry.prosCons.cons ?? '' },
        update: { pros: entry.prosCons.pros ?? '', cons: entry.prosCons.cons ?? '' },
      });
      console.log('  prosCons: ok');
    }

    // 3. Team
    if (entry.team?.members?.length) {
      await prisma.companyTeam.upsert({
        where: { companyId },
        create: { companyId, members: entry.team.members },
        update: { members: entry.team.members },
      });
      console.log(`  team: ${entry.team.members.length} members`);
    }

    // 4. Shareholders
    if (entry.shareholders?.entries?.length) {
      await prisma.companyShareholders.upsert({
        where: { companyId },
        create: { companyId, entries: entry.shareholders.entries },
        update: { entries: entry.shareholders.entries },
      });
      console.log(`  shareholders: ${entry.shareholders.entries.length} entries`);
    }

    // 5. Competitors
    if (entry.competitors?.entries?.length) {
      await prisma.companyCompetitors.upsert({
        where: { companyId },
        create: { companyId, entries: entry.competitors.entries },
        update: { entries: entry.competitors.entries },
      });
      console.log(`  competitors: ${entry.competitors.entries.length} entries`);
    }

    // 6. Company Details
    if (entry.details) {
      const d = entry.details;
      await prisma.companyDetails.upsert({
        where: { companyId },
        create: {
          companyId,
          totalShares: d.totalShares ?? null,
          faceValue: d.faceValue ?? null,
          website: d.website ?? null,
          fiscalYearEnd: d.fiscalYearEnd ?? null,
          auditor: d.auditor ?? null,
          employeeCount: d.employeeCount ?? null,
          founded: d.founded ?? null,
          headquarters: d.headquarters ?? null,
          legalEntityType: d.legalEntityType ?? null,
          incorporationCountry: d.incorporationCountry ?? null,
          registeredOffice: d.registeredOffice ?? null,
          linkedinUrl: d.linkedinUrl ?? null,
          twitterUrl: d.twitterUrl ?? null,
          crunchbaseUrl: d.crunchbaseUrl ?? null,
          fiftyTwoWeekHigh: d.fiftyTwoWeekHigh ?? null,
          fiftyTwoWeekLow: d.fiftyTwoWeekLow ?? null,
        },
        update: {
          totalShares: d.totalShares ?? null,
          faceValue: d.faceValue ?? null,
          website: d.website ?? null,
          fiscalYearEnd: d.fiscalYearEnd ?? null,
          auditor: d.auditor ?? null,
          employeeCount: d.employeeCount ?? null,
          founded: d.founded ?? null,
          headquarters: d.headquarters ?? null,
          legalEntityType: d.legalEntityType ?? null,
          incorporationCountry: d.incorporationCountry ?? null,
          registeredOffice: d.registeredOffice ?? null,
          linkedinUrl: d.linkedinUrl ?? null,
          twitterUrl: d.twitterUrl ?? null,
          crunchbaseUrl: d.crunchbaseUrl ?? null,
          fiftyTwoWeekHigh: d.fiftyTwoWeekHigh ?? null,
          fiftyTwoWeekLow: d.fiftyTwoWeekLow ?? null,
        },
      });
      console.log('  details: ok');
    }

    // Bump versions
    await prisma.company.update({
      where: { id: companyId },
      data: {
        editorialVersion: { increment: 1 },
        profileVersion: { increment: 1 },
        contentUpdatedAt: new Date(),
      },
    });
    console.log('  versions bumped');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
