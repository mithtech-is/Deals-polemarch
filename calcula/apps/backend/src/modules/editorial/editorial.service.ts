import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookService } from '../../common/services/webhook.service';
import { SnapshotsService } from '../snapshots/snapshots.service';
import {
  UpsertCompanyCompetitorsInput,
  UpsertCompanyFaqInput,
  UpsertCompanyOverviewInput,
  UpsertCompanyShareholdersInput,
  UpsertCompanyTeamInput,
  UpsertProsConsInput
} from './dto/editorial.dto';

type FaqItem = { question: string; answer: string };

// An item with a question but empty answer is a "placeholder" — an admin
// prompt to fill in critical company-specific content later (e.g.
// founder background, latest funding round). We keep placeholders in the
// DB so they show up in the admin editor; the storefront filters them
// out at render time so users never see unanswered questions.
function normalizeFaqItems(raw: unknown): FaqItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => ({
      question: typeof r.question === 'string' ? r.question : '',
      answer: typeof r.answer === 'string' ? r.answer : ''
    }))
    .filter((r) => r.question.trim());
}

/**
 * Standard investor FAQ template seeded onto every company so deal pages
 * are never empty. `{name}` is replaced with the company name at seed
 * time. Admins can edit, reorder, or delete any of these afterwards via
 * the editorial admin section.
 */
export const DEFAULT_FAQ_TEMPLATE: ReadonlyArray<{ question: string; answer: string }> = [
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
  // ── Placeholder questions (admin fills later) ───────────────────────
  // These are high-SEO / GEO value questions whose answers are inherently
  // company-specific and cannot be templated. They're seeded with empty
  // answers so they appear in the admin editor as TODOs; the storefront
  // filters out any item whose answer is empty, so users never see an
  // unanswered question.
  {
    question: 'What was {name}\'s latest funding round and valuation?',
    answer: ''
  },
  {
    question: "What is {name}'s revenue growth and profitability trend?",
    answer: ''
  },
  {
    question: 'What are the key products or services offered by {name}?',
    answer: ''
  },
  {
    question: "Why should I invest in {name}'s unlisted shares right now?",
    answer: ''
  }
];

type TeamMember = {
  name: string;
  role: string;
  since?: string | null;
  bio?: string | null;
  linkedinUrl?: string | null;
  photoUrl?: string | null;
};

function normalizeTeamMembers(raw: unknown): TeamMember[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => ({
      name: typeof r.name === 'string' ? r.name : '',
      role: typeof r.role === 'string' ? r.role : '',
      since: typeof r.since === 'string' ? r.since : null,
      bio: typeof r.bio === 'string' ? r.bio : null,
      linkedinUrl: typeof r.linkedinUrl === 'string' ? r.linkedinUrl : null,
      photoUrl: typeof r.photoUrl === 'string' ? r.photoUrl : null
    }))
    .filter((r) => r.name.trim() && r.role.trim());
}

type Shareholder = {
  name: string;
  type: string;
  stakePercent?: string | null;
  since?: string | null;
  note?: string | null;
};

function normalizeShareholders(raw: unknown): Shareholder[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => ({
      name: typeof r.name === 'string' ? r.name : '',
      type: typeof r.type === 'string' ? r.type : '',
      stakePercent: typeof r.stakePercent === 'string' ? r.stakePercent : null,
      since: typeof r.since === 'string' ? r.since : null,
      note: typeof r.note === 'string' ? r.note : null
    }))
    .filter((r) => r.name.trim() && r.type.trim());
}

type Competitor = {
  name: string;
  isin?: string | null;
  link?: string | null;
  theirEdge?: string | null;
  ourEdge?: string | null;
  note?: string | null;
};

function normalizeCompetitors(raw: unknown): Competitor[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => ({
      name: typeof r.name === 'string' ? r.name : '',
      isin: typeof r.isin === 'string' ? r.isin : null,
      link: typeof r.link === 'string' ? r.link : null,
      theirEdge: typeof r.theirEdge === 'string' ? r.theirEdge : null,
      ourEdge: typeof r.ourEdge === 'string' ? r.ourEdge : null,
      note: typeof r.note === 'string' ? r.note : null
    }))
    .filter((r) => r.name.trim());
}

export { normalizeTeamMembers, normalizeShareholders, normalizeCompetitors };

/**
 * Build the default FAQ list for a specific company by interpolating its
 * name into every {name} placeholder.
 */
export function buildDefaultFaqForCompany(name: string): FaqItem[] {
  return DEFAULT_FAQ_TEMPLATE.map((item) => ({
    question: item.question.replaceAll('{name}', name),
    answer: item.answer.replaceAll('{name}', name)
  }));
}

/**
 * Idempotent merge of defaults into an existing FAQ list. Defaults appear
 * at the top in template order; any default whose question already exists
 * (case-insensitive trim) is dropped so re-running this is a no-op.
 */
export function mergeDefaultFaq(existing: FaqItem[], defaults: FaqItem[]): FaqItem[] {
  const present = new Set(existing.map((r) => r.question.trim().toLowerCase()));
  const newDefaults = defaults.filter((d) => !present.has(d.question.trim().toLowerCase()));
  return [...newDefaults, ...existing];
}

@Injectable()
export class EditorialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookService: WebhookService,
    private readonly snapshotsService: SnapshotsService
  ) {}

  /**
   * Bump editorialVersion + contentUpdatedAt for the touched company and
   * fire the webhook. Both CompanyOverview and ProsCons share this bump
   * because they're folded into a single `editorial` snapshot kind on
   * Medusa's cache layer.
   */
  private async bumpEditorialForCompany(companyId: string) {
    const company = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        editorialVersion: { increment: 1 },
        contentUpdatedAt: new Date()
      },
      select: { isin: true }
    });
    this.snapshotsService.invalidate(company.isin);
    this.webhookService.syncToMedusa(companyId).catch(() => {});
  }

  async getOverview(companyId: string) {
    const row = await this.prisma.companyOverview.findUnique({
      where: { companyId }
    });
    if (!row) return null;
    return {
      companyId: row.companyId,
      summary: row.summary,
      businessModel: row.businessModel,
      competitiveMoat: row.competitiveMoat,
      risks: row.risks,
      financialInsights: row.financialInsights,
      industryAnalysis: row.industryAnalysis,
      sectorAnalysis: row.sectorAnalysis,
      activityAnalysis: row.activityAnalysis,
      updatedAt: row.updatedAt.toISOString()
    };
  }

  async upsertOverview(input: UpsertCompanyOverviewInput) {
    const data = {
      summary: input.summary,
      businessModel: input.businessModel ?? null,
      competitiveMoat: input.competitiveMoat ?? null,
      risks: input.risks ?? null,
      financialInsights: input.financialInsights ?? null,
      industryAnalysis: input.industryAnalysis ?? null,
      sectorAnalysis: input.sectorAnalysis ?? null,
      activityAnalysis: input.activityAnalysis ?? null
    };
    const row = await this.prisma.companyOverview.upsert({
      where: { companyId: input.companyId },
      update: data,
      create: { companyId: input.companyId, ...data }
    });
    await this.bumpEditorialForCompany(input.companyId);
    return {
      companyId: row.companyId,
      summary: row.summary,
      businessModel: row.businessModel,
      competitiveMoat: row.competitiveMoat,
      risks: row.risks,
      financialInsights: row.financialInsights,
      industryAnalysis: row.industryAnalysis,
      sectorAnalysis: row.sectorAnalysis,
      activityAnalysis: row.activityAnalysis,
      updatedAt: row.updatedAt.toISOString()
    };
  }

  async getProsCons(companyId: string) {
    const row = await this.prisma.prosCons.findUnique({
      where: { companyId }
    });
    if (!row) return null;
    return {
      companyId: row.companyId,
      pros: row.pros,
      cons: row.cons,
      updatedAt: row.updatedAt.toISOString()
    };
  }

  async getFaq(companyId: string) {
    const row = await this.prisma.companyFaq.findUnique({ where: { companyId } });
    if (!row) return null;
    return {
      companyId: row.companyId,
      items: normalizeFaqItems(row.items),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  async upsertFaq(input: UpsertCompanyFaqInput) {
    const items = normalizeFaqItems(input.items);
    const row = await this.prisma.companyFaq.upsert({
      where: { companyId: input.companyId },
      update: { items },
      create: { companyId: input.companyId, items }
    });
    await this.bumpEditorialForCompany(input.companyId);
    return {
      companyId: row.companyId,
      items: normalizeFaqItems(row.items),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  async getTeam(companyId: string) {
    const row = await this.prisma.companyTeam.findUnique({ where: { companyId } });
    if (!row) return null;
    return {
      companyId: row.companyId,
      members: normalizeTeamMembers(row.members),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  async upsertTeam(input: UpsertCompanyTeamInput) {
    const members = normalizeTeamMembers(input.members);
    const row = await this.prisma.companyTeam.upsert({
      where: { companyId: input.companyId },
      update: { members },
      create: { companyId: input.companyId, members }
    });
    await this.bumpEditorialForCompany(input.companyId);
    return {
      companyId: row.companyId,
      members: normalizeTeamMembers(row.members),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  async getShareholders(companyId: string) {
    const row = await this.prisma.companyShareholders.findUnique({
      where: { companyId }
    });
    if (!row) return null;
    return {
      companyId: row.companyId,
      entries: normalizeShareholders(row.entries),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  async getCompetitors(companyId: string) {
    const row = await this.prisma.companyCompetitors.findUnique({
      where: { companyId }
    });
    if (!row) return null;
    return {
      companyId: row.companyId,
      entries: normalizeCompetitors(row.entries),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  async upsertCompetitors(input: UpsertCompanyCompetitorsInput) {
    const entries = normalizeCompetitors(input.entries);
    const row = await this.prisma.companyCompetitors.upsert({
      where: { companyId: input.companyId },
      update: { entries },
      create: { companyId: input.companyId, entries }
    });
    await this.bumpEditorialForCompany(input.companyId);
    return {
      companyId: row.companyId,
      entries: normalizeCompetitors(row.entries),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  async upsertShareholders(input: UpsertCompanyShareholdersInput) {
    const entries = normalizeShareholders(input.entries);
    const row = await this.prisma.companyShareholders.upsert({
      where: { companyId: input.companyId },
      update: { entries },
      create: { companyId: input.companyId, entries }
    });
    await this.bumpEditorialForCompany(input.companyId);
    return {
      companyId: row.companyId,
      entries: normalizeShareholders(row.entries),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  /**
   * Seed the standard investor FAQs onto a company. Idempotent — already
   * present questions (matched case-insensitively) are skipped, so admins
   * can click "Insert default questions" repeatedly without creating
   * duplicates. Returns the merged FAQ row.
   */
  async seedDefaultFaq(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true }
    });
    if (!company) {
      throw new Error('Company not found');
    }
    const existing = await this.prisma.companyFaq.findUnique({ where: { companyId } });
    const existingItems = normalizeFaqItems(existing?.items);
    const defaults = buildDefaultFaqForCompany(company.name);
    const merged = mergeDefaultFaq(existingItems, defaults);
    const row = await this.prisma.companyFaq.upsert({
      where: { companyId },
      update: { items: merged },
      create: { companyId, items: merged }
    });
    await this.bumpEditorialForCompany(companyId);
    return {
      companyId: row.companyId,
      items: normalizeFaqItems(row.items),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  async upsertProsCons(input: UpsertProsConsInput) {
    const row = await this.prisma.prosCons.upsert({
      where: { companyId: input.companyId },
      update: { pros: input.pros, cons: input.cons },
      create: {
        companyId: input.companyId,
        pros: input.pros,
        cons: input.cons
      }
    });
    await this.bumpEditorialForCompany(input.companyId);
    return {
      companyId: row.companyId,
      pros: row.pros,
      cons: row.cons,
      updatedAt: row.updatedAt.toISOString()
    };
  }
}
