/**
 * Seed competitor analysis for API Holdings. Covers the e-pharmacy,
 * diagnostics, and B2B pharma distribution segments it operates in via
 * Pharmeasy, Thyrocare, Retailio, Aknamed, and Medlife.
 *
 * Run: npx tsx prisma/seed-api-competitors.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TARGET_ISIN = 'INE0DJ201029';

const competitors = [
  {
    name: 'Tata 1mg',
    isin: null,
    link: 'https://www.1mg.com',
    theirEdge:
      "Backed by the Tata group since 2021, giving it deep-pocketed capital runway and cross-sell into Tata Neu's super-app. Strong brand trust among urban Tier-1 consumers, integrated tele-consultation + diagnostics + pharmacy flow.",
    ourEdge:
      "API Holdings' Pharmeasy still has the broader pharmacy-partner network across Tier-2/3 cities, and Thyrocare gives it a diagnostics asset at national scale that 1mg cannot match on owned-lab footprint.",
    note:
      "Direct competitor across all three pillars: e-pharmacy, tele-consult, and at-home diagnostics. Strongest Tier-1 rival."
  },
  {
    name: 'Netmeds (Reliance Retail)',
    isin: null,
    link: 'https://www.netmeds.com',
    theirEdge:
      "Owned by Reliance Retail since 2020 — unmatched retail + logistics muscle, integration with JioMart, and deep discounting funded by the parent's cash flows. Can cross-subsidise aggressively.",
    ourEdge:
      "Pharmeasy has a longer-standing pharmacist partner network and stronger chronic-care customer base. Reliance's focus is shifting between JioMart Pharmacy and Netmeds brands, diluting channel clarity.",
    note:
      "Key threat on pricing power. Reliance's integration advantages are structural — API has to compete on service and chronic-care retention."
  },
  {
    name: 'Apollo 24|7 (Apollo Hospitals)',
    isin: 'INE437A01024',
    link: 'https://www.apollo247.com',
    theirEdge:
      "Apollo's 5,000+ owned pharmacy stores and captive hospital funnel give 24|7 a physical omnichannel presence and doctor referrals API can't replicate. Also benefits from Apollo Diagnostics.",
    ourEdge:
      "Pure-play digital focus means faster iteration. Pharmeasy's private-label SKU mix has higher margin than Apollo 24|7's drop-ship model, and Thyrocare's B2B lab business is larger in volume than Apollo Diagnostics.",
    note:
      "Listed peer (Apollo Hospitals ISIN). Apollo's omnichannel strength sets the benchmark — both companies converge on the same 'healthcare super-app' positioning."
  },
  {
    name: 'Dr. Lal PathLabs',
    isin: 'INE600L01024',
    link: 'https://www.lalpathlabs.com',
    theirEdge:
      "Pure-play diagnostics leader with 250+ labs and 6,000+ collection centres, trusted brand, and an efficient network built over 70 years. Higher test realisation per sample than Thyrocare.",
    ourEdge:
      "Thyrocare's Mumbai mega-lab has industry-leading unit economics for high-volume preventive panels, and bundling with Pharmeasy's e-pharmacy funnel generates cheaper customer acquisition than Lal PathLabs' standalone model.",
    note:
      "Direct listed competitor to the Thyrocare subsidiary. Trades at premium multiples that anchor API Holdings' sum-of-parts valuation."
  },
  {
    name: 'Metropolis Healthcare',
    isin: 'INE112L01020',
    link: 'https://www.metropolisindia.com',
    theirEdge:
      "Premium diagnostics brand with strong doctor channel relationships and B2B hospital lab management contracts. Gross margins meaningfully above Thyrocare due to specialised test mix.",
    ourEdge:
      "Thyrocare owns its lab automation IP and runs at ~3x Metropolis' sample volume, making it the cost leader on standard preventive panels. API's integrated e-pharmacy channel gives Thyrocare a direct-to-consumer moat Metropolis lacks.",
    note:
      "Public listed competitor. Complements Dr. Lal PathLabs in setting valuation benchmarks for Thyrocare."
  },
  {
    name: 'MedPlus Health Services',
    isin: 'INE804L01022',
    link: 'https://www.medplusmart.com',
    theirEdge:
      "~4,400 owned-and-operated pharmacy stores (second-largest pharmacy chain in India after Apollo). Profitable, cash-generative, listed, and trading on high-teens EBITDA margins. Recently launched its own online platform.",
    ourEdge:
      "Pharmeasy has ~5x the monthly active users of MedPlus' digital channel. MedPlus' online business is nascent; its economics are still driven by physical stores in southern India.",
    note:
      "Listed proxy for pharmacy retail. MedPlus' profitability highlights how much operating leverage API could unlock if it shuts the marketing spend taps."
  },
  {
    name: 'Wellness Forever',
    isin: null,
    link: 'https://www.wellnessforever.com',
    theirEdge:
      "Growing 24x7 physical pharmacy chain with ~450 stores across Maharashtra and neighbouring states. Strong private-label play, founder-led, capital-efficient growth.",
    ourEdge:
      "API Holdings operates nationally; Wellness Forever is regional. Pharmeasy's private-label SKUs already achieve higher gross margins and reach ~10x the customer base.",
    note:
      "Regional physical-pharmacy competitor. Relevant mostly in the Mumbai–Pune corridor."
  },
  {
    name: 'Flipkart Health+',
    isin: null,
    link: 'https://healthplus.flipkart.com',
    theirEdge:
      "Access to Flipkart's 500M+ user base, Walmart's logistics network, and cross-listing with Myntra/Flipkart Grocery. Launched via the SastaSundar acquisition in 2021 — full vertical integration with the e-commerce parent.",
    ourEdge:
      "Healthcare is a non-core priority for Flipkart vs. fashion + electronics, so execution has been slow. Pharmeasy's pharmacist authentication flow and chronic-care subscription retention are deeper.",
    note:
      "Emerging threat. Flipkart's traffic firepower is a latent risk if Health+ becomes a strategic priority."
  }
];

async function main() {
  const company = await prisma.company.findUnique({
    where: { isin: TARGET_ISIN },
    select: { id: true, name: true, isin: true }
  });
  if (!company) throw new Error(`Company ${TARGET_ISIN} not found`);
  console.log(`Target: ${company.name} (${company.isin})`);

  await prisma.companyCompetitors.upsert({
    where: { companyId: company.id },
    update: { entries: competitors },
    create: { companyId: company.id, entries: competitors }
  });

  await prisma.company.update({
    where: { id: company.id },
    data: {
      editorialVersion: { increment: 1 },
      contentUpdatedAt: new Date()
    }
  });

  console.log(`Seeded ${competitors.length} competitors.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
