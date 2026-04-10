/**
 * Append the "Key Milestones on Our Journey So Far" image to the API
 * Holdings About summary. Non-destructive: preserves whatever the admin
 * has currently written and only adds the image block at the end if it
 * isn't already present.
 *
 * Run from apps/backend: npx tsx prisma/add-api-milestones-image.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TARGET_ISIN = 'INE0DJ201029';

// Hosted locally in the storefront's public/ directory so we don't rely
// on Wix CDN availability or referrer policy. The file lives at
// storefront/public/assets/companies/api-holdings/milestones.jpeg and is
// served by Next.js at the absolute path below.
const IMAGE_URL = '/assets/companies/api-holdings/milestones.jpeg';
const IMAGE_ALT =
  "Key milestones on API Holdings' journey so far — from Dialhealth (2012) to PharmEasy (2015), Ascent, Retailio, Docon, Rxdbook, Medlife, Aknamed and Thyrocare (2021)";
const IMAGE_BLOCK = `![${IMAGE_ALT}](${IMAGE_URL})`;

async function main() {
  const company = await prisma.company.findUnique({
    where: { isin: TARGET_ISIN },
    select: { id: true, name: true }
  });
  if (!company) throw new Error(`${TARGET_ISIN} not found`);

  const overview = await prisma.companyOverview.findUnique({
    where: { companyId: company.id }
  });
  if (!overview) throw new Error('No CompanyOverview row for API Holdings');

  // Skip if the same image URL is already somewhere in the summary.
  if (overview.summary.includes(IMAGE_URL)) {
    console.log('Image already present in summary — no change.');
    return;
  }

  const next = overview.summary.trimEnd() + '\n\n' + IMAGE_BLOCK + '\n';
  await prisma.companyOverview.update({
    where: { companyId: company.id },
    data: { summary: next }
  });
  await prisma.company.update({
    where: { id: company.id },
    data: {
      editorialVersion: { increment: 1 },
      contentUpdatedAt: new Date()
    }
  });
  console.log(`Appended milestones image to ${company.name} About summary`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
