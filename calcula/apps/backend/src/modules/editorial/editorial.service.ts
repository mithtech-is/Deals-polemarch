import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookService } from '../../common/services/webhook.service';
import { SnapshotsService } from '../snapshots/snapshots.service';
import {
  UpsertCompanyFaqInput,
  UpsertCompanyOverviewInput,
  UpsertProsConsInput
} from './dto/editorial.dto';

type FaqItem = { question: string; answer: string };

function normalizeFaqItems(raw: unknown): FaqItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => ({
      question: typeof r.question === 'string' ? r.question : '',
      answer: typeof r.answer === 'string' ? r.answer : ''
    }))
    .filter((r) => r.question.trim() && r.answer.trim());
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
  }
];

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
      updatedAt: row.updatedAt.toISOString()
    };
  }

  async upsertOverview(input: UpsertCompanyOverviewInput) {
    const data = {
      summary: input.summary,
      businessModel: input.businessModel ?? null,
      competitiveMoat: input.competitiveMoat ?? null,
      risks: input.risks ?? null
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
