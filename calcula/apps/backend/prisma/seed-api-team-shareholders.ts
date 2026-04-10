/**
 * Seed API Holdings key management team + major shareholders. Only
 * publicly-verified entries — stake percentages are left blank where I
 * don't have a high-confidence source. Admin can refine via the editor.
 *
 * Run from apps/backend: npm run seed:api-team-shareholders
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TARGET_ISIN = 'INE0DJ201029';

/**
 * Auto-generate a deterministic avatar URL from a person's name using
 * ui-avatars.com. Free, CORS-friendly, and guaranteed to never be the
 * "wrong person" — it's just the initials rendered on an emerald
 * background. Used as a placeholder until real photos are uploaded.
 */
function avatarUrl(name: string): string {
  const encoded = encodeURIComponent(name);
  return `https://ui-avatars.com/api/?name=${encoded}&background=065f46&color=fff&size=256&bold=true`;
}

/**
 * Team is listed in decreasing order of importance. The storefront also
 * applies a role-priority sort as a safety net, but keeping the seed
 * ordered makes it obvious for anyone reading the source / admin UI.
 *
 * Order: Executive Chairman → CEO → Board representatives → Co-founders
 * → advisory co-founders.
 */
const team = [
  {
    name: 'Siddharth Shah',
    role: 'Co-founder & Executive Chairman',
    since: '2015',
    bio:
      "Co-founder of Pharmeasy and long-time Group CEO of API Holdings (2015–2023). Led the company through Series A–E, the Ascent Health merger that created API Holdings, the Medlife acquisition, and the Thyrocare deal — the largest-ever acquisition of a listed Indian company by a startup. Oversaw the DRHP filing and subsequent withdrawal, then moved to Executive Chairman in 2023 to bring in professional management while retaining long-term strategic oversight. Ex-McKinsey.",
    linkedinUrl: null,
    photoUrl: avatarUrl('Siddharth Shah')
  },
  {
    name: 'Rahul Guha',
    role: 'CEO, Pharmeasy',
    since: 'June 2023',
    bio:
      "Former Managing Director at Boston Consulting Group (BCG). Took over as CEO of Pharmeasy in June 2023 with a clear mandate to drive the turnaround toward sustainable profitability. Major contributions: (1) led the cost-reset and reorganisation that shut non-core verticals and refocused the group on e-pharmacy + Thyrocare diagnostics; (2) shifted the product mix toward higher-margin private label; (3) delivered the first EBITDA-positive quarters in the company's history (Q1 and Q2 FY25); (4) rebuilt institutional investor confidence, reflected in the Prosus mark-up and renewed IPO-refile discussions.",
    linkedinUrl: null,
    photoUrl: avatarUrl('Rahul Guha')
  },
  {
    name: 'Ranjan Pai',
    role: 'Non-Executive Director (Manipal / MEMG Nominee)',
    since: '2023',
    bio:
      "Chairman of Manipal Education and Medical Group (MEMG). Anchored the ~₹3,500 Cr rights issue in 2023 that recapitalised API Holdings, emerging as its single largest shareholder, and joined the board as MEMG's nominee. Brings deep healthcare operating experience from running one of India's largest private hospital networks, and is widely seen as the strategic anchor guiding API Holdings' path back to profitability and an eventual public listing.",
    linkedinUrl: null,
    photoUrl: avatarUrl('Ranjan Pai')
  },
  {
    name: 'Ashutosh Sharma',
    role: 'Non-Executive Director (Prosus Nominee)',
    since: '2020',
    bio:
      "Head of India Investments for Prosus Ventures (Naspers). Led Prosus' participation in API Holdings' Series E in 2020 and the follow-on 2021 round that pushed valuation past $5.6B. Represents Prosus — one of the largest shareholders — on the API Holdings board and has guided the group on capital strategy, governance, and IPO readiness. Prior career at Norwest Venture Partners.",
    linkedinUrl: null,
    photoUrl: avatarUrl('Ashutosh Sharma')
  },
  {
    name: 'Sanjeev Aggarwal',
    role: 'Non-Executive Director',
    since: '2016',
    bio:
      "Co-founder and Senior Managing Director at Fundamentum Partnership and earlier co-founder of Helion Venture Partners. Long-standing board member from API Holdings' early institutional rounds — has been a sounding board on scaling, operating discipline, and long-cycle capital. Previously founded Daksh eServices (acquired by IBM).",
    linkedinUrl: null,
    photoUrl: avatarUrl('Sanjeev Aggarwal')
  },
  {
    name: 'Bansi S. Mehta',
    role: 'Independent Director',
    since: '2021',
    bio:
      "One of India's most senior chartered accountants and a respected authority on taxation and corporate governance. Joined the API Holdings board as an Independent Director ahead of the 2021 DRHP filing to strengthen audit, finance, and compliance oversight. Founder of Bansi S. Mehta & Co., has chaired or served on the audit committees of several large listed Indian corporates.",
    linkedinUrl: null,
    photoUrl: avatarUrl('Bansi S Mehta')
  },
  {
    name: 'Indrajit Banerjee',
    role: 'Independent Director',
    since: '2021',
    bio:
      "Veteran finance executive with CFO and board experience across large Indian corporates including Ranbaxy Laboratories. Joined API Holdings as an Independent Director during the IPO preparation phase, bringing deep experience in pharmaceutical industry finance, investor relations, and listed-company governance.",
    linkedinUrl: null,
    photoUrl: avatarUrl('Indrajit Banerjee')
  },
  {
    name: 'Dharmil Sheth',
    role: 'Co-founder',
    since: '2015',
    bio:
      "Co-founded Pharmeasy in 2015 with Dhaval Shah. Built the consumer growth and pharmacy-partnership playbook that made Pharmeasy the largest online pharmacy in India by user base. Led early geographic expansion into Tier-2 and Tier-3 cities. Transitioned to an advisory role in 2024 after the professional management team took full operational control.",
    linkedinUrl: null,
    photoUrl: avatarUrl('Dharmil Sheth')
  },
  {
    name: 'Dhaval Shah',
    role: 'Co-founder',
    since: '2015',
    bio:
      "Co-founder of Pharmeasy, physician by training. Brought the clinical and healthcare-domain expertise that shaped Pharmeasy's early product design, drug authenticity controls, and later the teleconsultation + diagnostics verticals launched during the COVID-19 pandemic.",
    linkedinUrl: null,
    photoUrl: avatarUrl('Dhaval Shah')
  },
  {
    name: 'Hardik Dedhia',
    role: 'Co-founder',
    since: '2015',
    bio:
      "Co-founder of Pharmeasy. Part of the original founding team that built the platform and operations from inception in Mumbai in 2015.",
    linkedinUrl: null,
    photoUrl: avatarUrl('Hardik Dedhia')
  },
  {
    name: 'Harsh Parekh',
    role: 'Co-founder',
    since: '2015',
    bio:
      "Co-founder of Pharmeasy. Part of the original founding team alongside Dharmil, Dhaval, Siddharth, and Hardik.",
    linkedinUrl: null,
    photoUrl: avatarUrl('Harsh Parekh')
  }
];

const shareholders = [
  {
    name: 'Manipal Education and Medical Group (Ranjan Pai)',
    type: 'Strategic',
    stakePercent: null,
    since: '2023',
    note:
      "Anchored the ~₹3,500 Cr rights issue in 2023 and emerged as API Holdings' single largest shareholder. Brings strategic healthcare expertise alongside the capital commitment."
  },
  {
    name: 'Prosus',
    type: 'Institutional',
    stakePercent: null,
    since: '2020',
    note:
      'Led the 2020 Series E that first pushed API Holdings past a $1B valuation, and subsequently led the 2021 round that cemented unicorn status.'
  },
  {
    name: 'Temasek',
    type: 'Institutional',
    stakePercent: null,
    since: '2017',
    note:
      "Singapore sovereign fund Temasek led the Series C in 2017 and has continued to participate in follow-on rounds."
  },
  {
    name: 'TPG',
    type: 'Institutional',
    stakePercent: null,
    since: '2020',
    note: 'US private-equity major TPG joined the cap table during the 2020 Series E.'
  },
  {
    name: 'Bessemer Venture Partners',
    type: 'Institutional',
    stakePercent: null,
    since: '2016',
    note:
      "Early-stage investor: led Series A in 2016 and participated in multiple follow-on rounds."
  },
  {
    name: 'Orios Venture Partners',
    type: 'Institutional',
    stakePercent: null,
    since: '2015',
    note: 'Seed investor; first institutional backer of Pharmeasy in 2015.'
  },
  {
    name: 'CDPQ',
    type: 'Institutional',
    stakePercent: null,
    since: '2018',
    note: 'Canadian pension fund CDPQ participated in the Series D round.'
  },
  {
    name: 'Founders & Employee ESOP pool',
    type: 'Founder',
    stakePercent: null,
    since: '2015',
    note:
      'Founders Siddharth Shah, Dharmil Sheth, Dhaval Shah and the employee stock option pool.'
  }
];

async function main() {
  const company = await prisma.company.findUnique({
    where: { isin: TARGET_ISIN },
    select: { id: true, name: true, isin: true }
  });
  if (!company) throw new Error(`Company ${TARGET_ISIN} not found`);
  console.log(`Target: ${company.name} (${company.isin})`);

  await prisma.companyTeam.upsert({
    where: { companyId: company.id },
    update: { members: team },
    create: { companyId: company.id, members: team }
  });

  await prisma.companyShareholders.upsert({
    where: { companyId: company.id },
    update: { entries: shareholders },
    create: { companyId: company.id, entries: shareholders }
  });

  await prisma.company.update({
    where: { id: company.id },
    data: {
      editorialVersion: { increment: 1 },
      contentUpdatedAt: new Date()
    }
  });

  console.log(`Seeded ${team.length} team members and ${shareholders.length} shareholders.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
