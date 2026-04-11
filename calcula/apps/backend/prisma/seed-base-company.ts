import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const isin = 'INE0DJ201029';
  const name = 'API Holdings';

  await prisma.company.upsert({
    where: { isin },
    update: { name },
    create: {
      name,
      isin,
      listingStatus: 'unlisted',
      country: 'IN',
      defaultCurrency: 'INR',
      defaultScale: 'crores'
    }
  });

  console.log(`Created base company: ${name} (${isin})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
