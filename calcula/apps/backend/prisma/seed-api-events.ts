/**
 * API Holdings (Pharmeasy) timeline events. Idempotent and **non-
 * destructive**: rows whose title already exists in the DB are SKIPPED
 * entirely, not updated. Run this to back-fill any events that got
 * deleted while leaving existing rows (including manual edits) alone.
 *
 * Category taxonomy:
 *   C = Corporate action — directly affects shares/shareholders
 *       (DRHP filing, rights issue, IPO withdrawal, dividends, splits)
 *   E = business Event   — affects company value but not shares
 *       (M&A, funding rounds, launches, management changes, reorgs)
 *   N = News             — media, analyst commentary, markdowns/markups
 *   R = Regulatory       — SEBI/RBI actions outside shareholder corporate
 *                          actions above
 *
 * Impact score (1–5):
 *   5 = Foundational (founding, first profitable year, company-defining)
 *   4 = Major (IPO filing/withdrawal, Thyrocare-scale M&A, unicorn)
 *   3 = Notable (funding rounds, key management changes, reorgs)
 *   2 = Routine (minor acquisitions, secondary commentary)
 *   1 = Minor (rumours, status updates)
 *
 * Run from apps/backend: npm run seed:api-events
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_ISIN = 'INE0DJ201029';

type SeedEvent = {
  occurredAt: string;
  category: 'C' | 'E' | 'N' | 'R';
  sentiment: 'G' | 'R' | 'B';
  impactScore: number;
  title: string;
  body: string;
};

const events: SeedEvent[] = [
  {
    occurredAt: '2015-04-15T12:00:00.000Z',
    category: 'E',
    sentiment: 'G',
    impactScore: 5,
    title: 'Pharmeasy founded in Mumbai',
    body:
      "Dharmil Sheth and Dhaval Shah launch Pharmeasy in Mumbai as an online pharmacy delivery service connecting neighbourhood chemists with consumers."
  },
  {
    occurredAt: '2015-11-15T12:00:00.000Z',
    category: 'E',
    sentiment: 'G',
    impactScore: 2,
    title: 'Seed round led by Orios Venture Partners',
    body:
      '~$1M seed round led by Orios Venture Partners to build out logistics, pharmacy partnerships, and early technology stack.'
  },
  {
    occurredAt: '2016-06-15T12:00:00.000Z',
    category: 'E',
    sentiment: 'G',
    impactScore: 2,
    title: 'Series A — Bessemer Venture Partners',
    body:
      '~$5M Series A led by Bessemer Venture Partners. Funds used to expand the catalogue and increase city-level coverage.'
  },
  {
    occurredAt: '2017-03-15T12:00:00.000Z',
    category: 'E',
    sentiment: 'G',
    impactScore: 2,
    title: 'Series B — Bessemer + Orios',
    body:
      '~$16M Series B co-led by existing investors Bessemer and Orios. Accelerates expansion into Tier-2 cities.'
  },
  {
    occurredAt: '2017-11-15T12:00:00.000Z',
    category: 'E',
    sentiment: 'G',
    impactScore: 3,
    title: 'Series C led by Temasek',
    body:
      "~$22M Series C led by Singapore's Temasek. The round signals institutional confidence and starts the path toward unicorn valuation."
  },
  {
    occurredAt: '2018-08-15T12:00:00.000Z',
    category: 'E',
    sentiment: 'G',
    impactScore: 3,
    title: 'Series D — Temasek, CDPQ, Bessemer participate',
    body:
      'Series D drawing in Temasek, Canadian pension fund CDPQ, and existing backer Bessemer. Funds earmarked for technology and Tier-2/3 city expansion ahead of the Ascent Health merger.'
  },
  {
    occurredAt: '2019-01-15T12:00:00.000Z',
    category: 'E',
    sentiment: 'G',
    impactScore: 4,
    title: 'Merger with Ascent Health forms API Holdings',
    body:
      'Pharmeasy merges with wholesale distributor Ascent Health. API Holdings becomes the unified parent entity, giving the group vertical integration across distribution and retail.'
  },
  {
    occurredAt: '2020-04-15T12:00:00.000Z',
    category: 'E',
    sentiment: 'G',
    impactScore: 2,
    title: 'Launches teleconsultation during COVID-19 lockdown',
    body:
      'Pharmeasy launches on-app doctor teleconsultation as India enters lockdown. The feature becomes a growth vector as consumers shift healthcare interactions online.'
  },
  {
    occurredAt: '2020-06-15T12:00:00.000Z',
    category: 'E',
    sentiment: 'G',
    impactScore: 4,
    title: 'Acquires Medlife in all-stock deal',
    body:
      "API Holdings acquires India's second-largest e-pharmacy Medlife in an all-stock transaction, consolidating the category and adding scale during the COVID-driven demand surge."
  },
  {
    occurredAt: '2020-09-15T12:00:00.000Z',
    category: 'E',
    sentiment: 'G',
    impactScore: 2,
    title: 'Launches home-collection diagnostics service',
    body:
      'Pharmeasy rolls out at-home sample collection for diagnostic tests across major metros, laying groundwork for the Thyrocare integration that comes the following year.'
  },
  {
    occurredAt: '2020-11-15T12:00:00.000Z',
    category: 'E',
    sentiment: 'G',
    impactScore: 3,
    title: 'Series E — TPG and Prosus join cap table',
    body:
      'COVID tailwind drives a ~$220M round at over $1B valuation. TPG and Prosus join the cap table alongside existing backers.'
  },
  {
    occurredAt: '2021-03-15T12:00:00.000Z',
    category: 'E',
    sentiment: 'G',
    impactScore: 3,
    title: 'Acquires Aknamed for ~₹1,500 Cr',
    body:
      'API Holdings acquires B2B hospital supply-chain company Aknamed for roughly ₹1,500 Cr, entering the institutional pharmacy-distribution market serving Indian hospitals.'
  },
  {
    occurredAt: '2021-04-15T12:00:00.000Z',
    category: 'E',
    sentiment: 'G',
    impactScore: 4,
    title: 'Becomes unicorn at ~$1.5B valuation',
    body:
      '$350M round led by Prosus officially marks API Holdings as a unicorn at ~$1.5B valuation. The company is now the largest online pharmacy in India by a significant margin.'
  },
  {
    occurredAt: '2021-08-15T12:00:00.000Z',
    category: 'E',
    sentiment: 'G',
    impactScore: 5,
    title: 'Acquires Thyrocare for ~₹4,546 Cr',
    body:
      'API Holdings completes the ~₹4,546 Cr acquisition of listed diagnostics chain Thyrocare — the largest-ever acquisition of a listed Indian company by a startup at the time. Adds diagnostics to the healthcare stack.'
  },
  {
    occurredAt: '2021-11-15T12:00:00.000Z',
    category: 'C',
    sentiment: 'G',
    impactScore: 5,
    title: 'Files DRHP with SEBI for ₹6,250 Cr IPO',
    body:
      'API Holdings files its Draft Red Herring Prospectus with SEBI targeting a primary issue of ₹6,250 Cr. Positions the company for one of the most anticipated new-economy IPOs of 2022.'
  },
  {
    occurredAt: '2022-02-15T12:00:00.000Z',
    category: 'R',
    sentiment: 'G',
    impactScore: 3,
    title: 'SEBI approves the IPO',
    body:
      'SEBI clears the DRHP. The approval opens the launch window and API Holdings begins preparing for a public listing later in 2022.'
  },
  {
    occurredAt: '2022-08-15T12:00:00.000Z',
    category: 'C',
    sentiment: 'R',
    impactScore: 5,
    title: 'Withdraws IPO filing',
    body:
      "API Holdings withdraws its DRHP citing unfavourable market conditions and a broader startup funding winter. Marks a turning point for the company's capital-raising strategy."
  },
  {
    occurredAt: '2022-09-15T12:00:00.000Z',
    category: 'E',
    sentiment: 'R',
    impactScore: 3,
    title: 'Raises $300M bridge loan from Goldman Sachs',
    body:
      'With the IPO shelved, API Holdings raises a ~$300M bridge loan from Goldman Sachs secured against its Thyrocare shareholding. Buys runway while the company reworks its path to profitability.'
  },
  {
    occurredAt: '2022-11-15T12:00:00.000Z',
    category: 'E',
    sentiment: 'R',
    impactScore: 2,
    title: 'First wave of layoffs begins',
    body:
      'The company begins a first wave of layoffs as part of a broader cost-reset following the withdrawn IPO. Marketing spend and discounting are cut; non-core experiments wound down.'
  },
  {
    occurredAt: '2022-12-15T12:00:00.000Z',
    category: 'N',
    sentiment: 'R',
    impactScore: 2,
    title: 'Janus Henderson and Neuberger Berman mark down valuation ~50%',
    body:
      'US public-market funds cut their holding values, signalling a broader repricing of Indian new-economy unicorns amid weaker secondary markets.'
  },
  {
    occurredAt: '2023-02-15T12:00:00.000Z',
    category: 'N',
    sentiment: 'R',
    impactScore: 2,
    title: 'Prosus writes down stake sharply',
    body:
      'Dutch tech investor Prosus marks its API Holdings position down sharply in its internal valuation, citing slower-than-expected path to profitability and the broader Indian new-economy correction.'
  },
  {
    occurredAt: '2023-04-15T12:00:00.000Z',
    category: 'C',
    sentiment: 'R',
    impactScore: 4,
    title: 'Raises ~₹3,500 Cr rights issue at sharply reduced valuation',
    body:
      'Rights issue closes at a post-money valuation roughly half the 2021 peak. Existing investors participate to shore up the balance sheet and fund the turnaround.'
  },
  {
    occurredAt: '2023-05-15T12:00:00.000Z',
    category: 'C',
    sentiment: 'G',
    impactScore: 4,
    title: "Ranjan Pai's Manipal Group anchors rights issue",
    body:
      "Ranjan Pai's Manipal Education and Medical Group (MEMG) anchors the rights issue with a significant commitment and emerges as API Holdings' single largest shareholder."
  },
  {
    occurredAt: '2023-06-15T12:00:00.000Z',
    category: 'E',
    sentiment: 'G',
    impactScore: 4,
    title: 'Rahul Guha joins Pharmeasy as CEO',
    body:
      'Former BCG Managing Director Rahul Guha takes over as Pharmeasy CEO with a clear mandate: drive the turnaround toward sustainable profitability and tighten operating discipline.'
  },
  {
    occurredAt: '2023-07-15T12:00:00.000Z',
    category: 'E',
    sentiment: 'G',
    impactScore: 3,
    title: 'Siddharth Shah transitions to Executive Chairman',
    body:
      'Co-founder Siddharth Shah moves from group CEO to Executive Chairman, making room for a professionalised management team focused on operating discipline.'
  },
  {
    occurredAt: '2023-08-15T12:00:00.000Z',
    category: 'E',
    sentiment: 'B',
    impactScore: 3,
    title: 'Business reorganisation — non-core units shut down',
    body:
      'New leadership shuts down experimental verticals and refocuses the company on core e-pharmacy + Thyrocare diagnostics. Layoffs follow as part of a deliberate cost-reset.'
  },
  {
    occurredAt: '2024-01-15T12:00:00.000Z',
    category: 'N',
    sentiment: 'G',
    impactScore: 3,
    title: 'Losses narrow sharply under new leadership',
    body:
      'FY24 results show material cost discipline: contribution margin turns positive at the Pharmeasy unit level; group losses shrink YoY for the first time since 2021.'
  },
  {
    occurredAt: '2024-02-15T12:00:00.000Z',
    category: 'E',
    sentiment: 'B',
    impactScore: 2,
    title: 'Dharmil Sheth transitions to advisory role',
    body:
      "Co-founder Dharmil Sheth steps back from day-to-day operations into an advisory capacity, completing the founder-to-professional-management handover."
  },
  {
    occurredAt: '2024-03-15T12:00:00.000Z',
    category: 'N',
    sentiment: 'R',
    impactScore: 2,
    title: 'US investors mark down valuation further (~$2B)',
    body:
      'Secondary valuation estimates near $2B versus the $5.6B 2021 peak, even as operating metrics visibly improve. Sentiment lag from the public markets persists.'
  },
  {
    occurredAt: '2024-08-15T12:00:00.000Z',
    category: 'N',
    sentiment: 'G',
    impactScore: 4,
    title: 'First EBITDA-positive quarter (Q1 FY25)',
    body:
      "Pharmeasy posts its first EBITDA-positive quarter since inception, driven by private-label mix, Thyrocare profit contribution, and the cost base Rahul Guha's team has built over the past 12 months."
  },
  {
    occurredAt: '2024-11-15T12:00:00.000Z',
    category: 'N',
    sentiment: 'G',
    impactScore: 3,
    title: 'Second consecutive profitable quarter',
    body:
      'Q2 FY25 prints another EBITDA-positive quarter with improved gross margin. Management publicly credits the new operating model — rationalised SKUs, higher-margin private label, and tighter working capital.'
  },
  {
    occurredAt: '2024-12-15T12:00:00.000Z',
    category: 'N',
    sentiment: 'G',
    impactScore: 2,
    title: 'Prosus marks up API Holdings stake',
    body:
      'Prosus partially reverses its 2023 writedown, marking its API Holdings position up in its quarterly reporting on the back of two profitable quarters and improving unit economics.'
  },
  {
    occurredAt: '2025-03-15T12:00:00.000Z',
    category: 'N',
    sentiment: 'G',
    impactScore: 2,
    title: 'Market rumours of DRHP refile on turnaround momentum',
    body:
      'Press reports Pharmeasy is considering a fresh IPO filing on the back of two consecutive profitable quarters and the Thyrocare-led diagnostics growth story.'
  },
  {
    occurredAt: '2025-06-15T12:00:00.000Z',
    category: 'N',
    sentiment: 'G',
    impactScore: 3,
    title: 'FY25 closes near break-even at group level',
    body:
      'API Holdings reports FY25 results showing the group is near break-even at EBITDA — a dramatic swing from the FY22 and FY23 loss levels.'
  },
  {
    occurredAt: '2025-08-15T12:00:00.000Z',
    category: 'C',
    sentiment: 'G',
    impactScore: 5,
    title: 'Files refreshed DRHP with SEBI',
    body:
      'API Holdings refiles its Draft Red Herring Prospectus with SEBI at a smaller issue size and tighter structure than the 2021 filing. The refreshed document leads with the FY25 turnaround narrative.'
  },
  {
    occurredAt: '2025-10-15T12:00:00.000Z',
    category: 'N',
    sentiment: 'G',
    impactScore: 2,
    title: 'Q2 FY26 revenue growth reaccelerates',
    body:
      'Second quarter of FY26 shows revenue growth reaccelerating into double digits year-on-year, driven by private-label mix and Thyrocare volumes.'
  },
  {
    occurredAt: '2025-12-15T12:00:00.000Z',
    category: 'N',
    sentiment: 'G',
    impactScore: 2,
    title: 'Secondary market valuation recovers toward $3B',
    body:
      'Unlisted-share quotes for API Holdings tick up toward a ~$3B valuation as turnaround evidence accumulates. Still well below the 2021 peak of $5.6B.'
  },
  {
    occurredAt: '2026-02-15T12:00:00.000Z',
    category: 'N',
    sentiment: 'G',
    impactScore: 5,
    title: 'Reports first full profitable year in company history',
    body:
      'API Holdings reports FY26 as its first fully profitable year since inception — EBITDA positive, free cash flow positive, with both Pharmeasy and Thyrocare contributing.'
  },
  {
    occurredAt: '2026-04-01T12:00:00.000Z',
    category: 'R',
    sentiment: 'B',
    impactScore: 1,
    title: 'SEBI approval pending on refiled DRHP',
    body:
      'Current status: the refiled DRHP is with SEBI awaiting final clearance. Market expects launch timing to depend on approval and a favourable market window.'
  }
];

async function main() {
  const company = await prisma.company.findUnique({
    where: { isin: TARGET_ISIN },
    select: { id: true, name: true, isin: true }
  });
  if (!company) throw new Error(`Company ${TARGET_ISIN} not found`);
  console.log(`Target: ${company.name} (${company.isin})`);

  // Pre-load existing titles once so the skip check is O(1).
  const existingRows = await prisma.newsEvent.findMany({
    where: { companyId: company.id },
    select: { id: true, title: true, impactScore: true }
  });
  const existingByTitle = new Map(
    existingRows.map((r) => [r.title.trim().toLowerCase(), r])
  );

  let created = 0;
  let skipped = 0;
  let impactBackfilled = 0;

  for (const ev of events) {
    const key = ev.title.trim().toLowerCase();
    const existing = existingByTitle.get(key);
    if (existing) {
      // Existing row — leave body/category/date alone (may have been
      // edited manually). ONLY backfill impactScore if the row doesn't
      // already have one, so this seed adds impact to legacy rows without
      // clobbering any admin adjustments.
      if (existing.impactScore == null) {
        await prisma.newsEvent.update({
          where: { id: existing.id },
          data: { impactScore: ev.impactScore }
        });
        impactBackfilled += 1;
      } else {
        skipped += 1;
      }
      continue;
    }
    await prisma.newsEvent.create({
      data: {
        companyId: company.id,
        occurredAt: new Date(ev.occurredAt),
        category: ev.category,
        sentiment: ev.sentiment,
        impactScore: ev.impactScore,
        title: ev.title,
        body: ev.body,
        sourceUrl: null
      }
    });
    created += 1;
  }

  await prisma.company.update({
    where: { id: company.id },
    data: {
      newsVersion: { increment: 1 },
      contentUpdatedAt: new Date()
    }
  });

  console.log(
    `Created ${created}, impact back-filled on ${impactBackfilled}, skipped ${skipped} (already had impact).`
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
