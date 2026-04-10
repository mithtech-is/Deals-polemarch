/**
 * Merge-update API Holdings team JSON:
 *  - Preserves every existing field from the DB (including any manual
 *    edits to Siddharth Shah's photoUrl / linkedinUrl / bio).
 *  - Adds verified LinkedIn URLs for the 5 founders + Rahul Guha.
 *  - Fixes factually wrong data I had seeded earlier:
 *    - Rahul Guha: joined Thyrocare 2022, CEO of PharmEasy from Aug 2025
 *      (was incorrectly "since June 2023" in the previous seed).
 *    - 4/5 co-founders exited API Holdings in January 2025 to launch
 *      All Home (was "transitioned to advisory" in the previous seed).
 *
 * Run from apps/backend: npx tsx prisma/update-api-team.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TARGET_ISIN = 'INE0DJ201029';

type Member = {
  name: string;
  role: string;
  since?: string | null;
  bio?: string | null;
  linkedinUrl?: string | null;
  photoUrl?: string | null;
};

// Updates indexed by exact name. Only the fields listed here are
// touched — every other field on the existing row is preserved.
const updates: Record<string, Partial<Member>> = {
  'Dharmil Sheth': {
    role: 'Co-founder (exited Jan 2025)',
    since: '2015 – 2025',
    bio:
      "Co-founded Pharmeasy in 2015 with Dhaval Shah. Built the consumer growth and pharmacy-partnership playbook that made Pharmeasy the largest online pharmacy in India by user base. Exited API Holdings in January 2025 alongside Dhaval Shah, Hardik Dedhia and Harsh Parekh to launch All Home, a new interior-design venture backed by Bessemer at a ~$120M valuation.",
    linkedinUrl: 'https://in.linkedin.com/in/dharmilsheth'
  },
  'Dhaval Shah': {
    role: 'Co-founder (exited Jan 2025)',
    since: '2015 – 2025',
    bio:
      "Co-founder of Pharmeasy, physician by training. Brought the clinical and healthcare-domain expertise that shaped Pharmeasy's early product design, drug authenticity controls, and the teleconsultation + diagnostics verticals launched during COVID-19. Exited API Holdings in January 2025 to launch All Home with Dharmil and Hardik.",
    linkedinUrl: 'https://in.linkedin.com/in/dr-dhaval-shah-68783947'
  },
  'Hardik Dedhia': {
    role: 'Co-founder (exited Jan 2025)',
    since: '2015 – 2025',
    bio:
      "Co-founder of Pharmeasy and Ascent Health & Wellness Solutions. Carnegie Mellon University alumnus. Part of the original founding team from 2015. Exited API Holdings in January 2025 alongside Dharmil, Dhaval and Harsh to launch All Home.",
    linkedinUrl: 'https://in.linkedin.com/in/hardik-dedhia-0263271b'
  },
  'Harsh Parekh': {
    role: 'Co-founder (exited Jan 2025)',
    since: '2019 – 2025',
    bio:
      "Joined API Holdings as co-founder in 2019 through the Ascent Health merger, where he was COO. NMIMS MBA, formerly at Bharti Airtel. Exited API Holdings in January 2025 to join the co-founders launching All Home.",
    linkedinUrl: 'https://in.linkedin.com/in/harsh-parekh-08a98b56'
  },
  'Rahul Guha': {
    role: 'MD & CEO, API Holdings (CEO, PharmEasy)',
    since: 'August 2025',
    bio:
      "Joined Thyrocare Technologies as MD & CEO in 2022 after nearly 17 years at Boston Consulting Group, where he led the Healthcare & Life Sciences practice. IIM Bangalore graduate. Took over as CEO of PharmEasy on 27 August 2025, succeeding Siddharth Shah, and now serves as MD & CEO of API Holdings overall. Major contributions: (1) led the Thyrocare operational turnaround from 2022 onward; (2) drove API Holdings' cost-reset and refocus on core e-pharmacy + diagnostics; (3) shifted the product mix toward higher-margin private label; (4) delivered the first EBITDA-positive quarters in PharmEasy's history; (5) rebuilt institutional investor confidence.",
    linkedinUrl: 'https://www.linkedin.com/in/rahul-guha-6a299819/'
  }
};

async function main() {
  const company = await prisma.company.findUnique({
    where: { isin: TARGET_ISIN },
    select: { id: true, name: true }
  });
  if (!company) throw new Error(`${TARGET_ISIN} not found`);

  const row = await prisma.companyTeam.findUnique({
    where: { companyId: company.id }
  });
  if (!row) throw new Error('No CompanyTeam row for API Holdings');

  const existing = (row.members as unknown as Member[]) ?? [];
  let updatedCount = 0;
  const merged = existing.map((m) => {
    const patch = updates[m.name];
    if (!patch) return m;
    updatedCount += 1;
    return {
      ...m,
      ...patch,
      // Explicitly preserve photoUrl — user may have uploaded their own.
      photoUrl: m.photoUrl ?? null
    };
  });

  await prisma.companyTeam.update({
    where: { companyId: company.id },
    data: { members: merged }
  });
  await prisma.company.update({
    where: { id: company.id },
    data: {
      editorialVersion: { increment: 1 },
      contentUpdatedAt: new Date()
    }
  });

  console.log(`Updated ${updatedCount} of ${existing.length} team members on ${company.name}`);
  for (const m of merged) {
    console.log(`  ${m.name} — ${m.linkedinUrl ?? '(no linkedin)'}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
