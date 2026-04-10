/**
 * Backfill: ensure every company in the DB has Polemarch's standard
 * investor FAQ list seeded onto its CompanyFaq row. Idempotent — already
 * present questions are skipped (matched case-insensitively), so this is
 * safe to re-run any time. Mirrors the resolver logic in
 * editorial.service.ts so the two stay in sync.
 *
 * Run from apps/backend: npm run seed:default-faqs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_FAQ_TEMPLATE: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: 'How to invest in {name}?',
    answer:
      '- Create an account, add your BO ID and complete KYC\n' +
      '- Add balance to your wallet\n' +
      '- Purchase shares — they will be transferred to your demat account'
  },
  {
    question: 'Will I be able to sell {name}? Is there a lock-in?',
    answer:
      "Yes. You can sell {name} shares back through Polemarch's secondary market or to other investors. Unlisted shares typically have no SEBI-mandated lock-in for retail buyers, but a 6-month lock-in applies if {name} subsequently lists on a stock exchange (post-IPO)."
  },
  {
    question: 'Are unlisted shares of {name} regulated by SEBI?',
    answer:
      'Share transfers are governed by the Companies Act 2013 and depository (NSDL/CDSL) rules. SEBI regulates the brokers, depositories and the listing process; transfers of unlisted shares between consenting demat-account holders are legal and audited.'
  },
  {
    question: 'What is the minimum investment in {name}?',
    answer:
      'Minimum is one lot of {name} as quoted on the deal page. You can buy in multiples of one share above the lot size.'
  },
  {
    question: 'How long does it take to receive {name} shares in my Demat account?',
    answer:
      "Typically T+1 to T+3 working days after payment confirmation, depending on the seller's depository."
  },
  {
    question: 'How is the price of {name} shares determined?',
    answer:
      'Prices are set by demand-supply on the unlisted secondary market. Polemarch updates the indicative price based on recent transfers and benchmark valuations.'
  },
  {
    question: 'What are the tax implications of investing in {name}?',
    answer:
      'Unlisted equity shares held >24 months attract LTCG (12.5% under the new regime); shorter holdings are taxed at slab rate as STCG. Consult a tax advisor for your specific situation.'
  },
  {
    question: 'Can NRIs invest in {name}?',
    answer:
      "Yes, subject to RBI's NRI investment guidelines and an NRO/NRE-linked demat account."
  },
  {
    question: 'When will {name} get listed (IPO)?',
    answer:
      "Listing depends on {name}'s board decisions and SEBI approvals. Track the Timeline section above for the latest updates."
  },
  {
    question: 'What documents do I need to invest in {name}?',
    answer:
      'PAN, Aadhaar (KYC), demat account details (BO ID + DP ID), bank account, and a recent cancelled cheque or bank statement.'
  },
  // Placeholder questions — admin fills later.
  { question: "What was {name}'s latest funding round and valuation?", answer: '' },
  { question: "What is {name}'s revenue growth and profitability trend?", answer: '' },
  { question: 'What are the key products or services offered by {name}?', answer: '' },
  { question: "Why should I invest in {name}'s unlisted shares right now?", answer: '' }
];

type FaqItem = { question: string; answer: string };

function buildDefaults(name: string): FaqItem[] {
  return DEFAULT_FAQ_TEMPLATE.map((i) => ({
    question: i.question.replaceAll('{name}', name),
    answer: i.answer.replaceAll('{name}', name)
  }));
}

function normalizeItems(raw: unknown): FaqItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => ({
      question: typeof r.question === 'string' ? r.question : '',
      answer: typeof r.answer === 'string' ? r.answer : ''
    }))
    .filter((r) => r.question.trim() && r.answer.trim());
}

function mergeDefaults(existing: FaqItem[], defaults: FaqItem[]): FaqItem[] {
  const present = new Set(existing.map((r) => r.question.trim().toLowerCase()));
  const newDefaults = defaults.filter((d) => !present.has(d.question.trim().toLowerCase()));
  return [...newDefaults, ...existing];
}

async function main() {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, isin: true }
  });
  console.log(`Scanning ${companies.length} companies…`);

  let seeded = 0;
  let unchanged = 0;

  for (const company of companies) {
    const existingRow = await prisma.companyFaq.findUnique({
      where: { companyId: company.id }
    });
    const existingItems = normalizeItems(existingRow?.items);
    const defaults = buildDefaults(company.name);
    const merged = mergeDefaults(existingItems, defaults);

    if (merged.length === existingItems.length) {
      unchanged += 1;
      continue;
    }

    await prisma.companyFaq.upsert({
      where: { companyId: company.id },
      update: { items: merged },
      create: { companyId: company.id, items: merged }
    });
    // Bump editorialVersion so Medusa re-pulls on its next sync.
    await prisma.company.update({
      where: { id: company.id },
      data: {
        editorialVersion: { increment: 1 },
        contentUpdatedAt: new Date()
      }
    });
    seeded += 1;
    console.log(
      `  ✓ ${company.name} (${company.isin}) → +${merged.length - existingItems.length} default questions`
    );
  }

  console.log(`\nDone. Seeded ${seeded} companies, ${unchanged} already had all defaults.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
