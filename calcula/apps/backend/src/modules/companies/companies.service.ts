import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildDefaultFaqForCompany } from '../editorial/editorial.service';
import { CreateCompanyInput, UpdateCompanyInput } from './dto/company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  list(q?: string) {
    return this.prisma.company.findMany({
      where: q ? { name: { contains: q, mode: 'insensitive' } } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200
    });
  }

  async one(id: string) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  async byIsin(isin: string) {
    const company = await this.prisma.company.findUnique({ where: { isin } });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  async create(input: CreateCompanyInput) {
    const company = await this.prisma.company.create({
      data: {
        ...input,
        country: input.country ?? 'IN',
        listingStatus: input.listingStatus ?? 'unlisted'
      }
    });
    // Auto-seed Polemarch's standard investor FAQs so every new company
    // ships with a baseline deal page. Admins can edit, reorder, or remove
    // any of these afterwards via the Editorial section.
    try {
      await this.prisma.companyFaq.create({
        data: {
          companyId: company.id,
          items: buildDefaultFaqForCompany(company.name)
        }
      });
    } catch (err) {
      // Never block company creation on FAQ seeding. Log and move on;
      // admins can always click "Insert default questions" later.
      console.error('Failed to seed default FAQs for new company', company.id, err);
    }
    return company;
  }

  async update(id: string, input: UpdateCompanyInput) {
    await this.one(id);
    return this.prisma.company.update({ where: { id }, data: input });
  }

  async delete(id: string) {
    await this.one(id);
    return this.prisma.company.delete({ where: { id } });
  }

  /**
   * Dump every editorial + timeseries row for a single company into a
   * self-contained JSON blob that can be saved to disk and re-imported
   * onto another environment (or the same one after a reset). Line-item
   * references in FinancialMetric are serialised by `code` (which is
   * globally unique) so they survive an import on a DB that has its
   * own financial_line_items IDs.
   */
  async exportOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        overview: true,
        prosCons: true,
        faq: true,
        team: true,
        shareholders: true,
        competitors: true,
        details: true,
        valuations: true,
        newsEvents: { orderBy: { occurredAt: 'asc' } },
        prices: { orderBy: { datetime: 'asc' } },
        periods: {
          orderBy: [{ fiscalYear: 'asc' }, { fiscalQuarter: 'asc' }],
          include: {
            values: {
              include: { lineItem: { select: { code: true } } }
            }
          }
        }
      }
    });
    if (!company) throw new NotFoundException('Company not found');

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      company: {
        isin: company.isin,
        name: company.name,
        cin: company.cin,
        sector: company.sector,
        industry: company.industry,
        activity: company.activity,
        sectorId: company.sectorId,
        industryId: company.industryId,
        activityId: company.activityId,
        description: company.description,
        country: company.country,
        listingStatus: company.listingStatus,
        defaultCurrency: company.defaultCurrency,
        defaultScale: company.defaultScale
      },
      overview: company.overview
        ? {
            summary: company.overview.summary,
            businessModel: company.overview.businessModel,
            competitiveMoat: company.overview.competitiveMoat,
            risks: company.overview.risks,
            financialInsights: company.overview.financialInsights,
            industryAnalysis: company.overview.industryAnalysis,
            sectorAnalysis: company.overview.sectorAnalysis,
            activityAnalysis: company.overview.activityAnalysis
          }
        : null,
      prosCons: company.prosCons
        ? { pros: company.prosCons.pros, cons: company.prosCons.cons }
        : null,
      faq: company.faq?.items ?? [],
      team: company.team?.members ?? [],
      shareholders: company.shareholders?.entries ?? [],
      competitors: company.competitors?.entries ?? [],
      details: company.details
        ? {
            logoUrl: company.details.logoUrl,
            website: company.details.website,
            linkedinUrl: company.details.linkedinUrl,
            twitterUrl: company.details.twitterUrl,
            crunchbaseUrl: company.details.crunchbaseUrl,
            founded: company.details.founded,
            incorporationCountry: company.details.incorporationCountry,
            legalEntityType: company.details.legalEntityType,
            registeredOffice: company.details.registeredOffice,
            headquarters: company.details.headquarters,
            auditor: company.details.auditor,
            panNumber: company.details.panNumber,
            rta: company.details.rta,
            depository: company.details.depository,
            employeeCount: company.details.employeeCount,
            subsidiariesCount: company.details.subsidiariesCount,
            fiscalYearEnd: company.details.fiscalYearEnd,
            shareType: company.details.shareType,
            faceValue: company.details.faceValue ? Number(company.details.faceValue) : null,
            totalShares: company.details.totalShares,
            lotSize: company.details.lotSize,
            availabilityPercent: company.details.availabilityPercent ? Number(company.details.availabilityPercent) : null,
            fiftyTwoWeekHigh: company.details.fiftyTwoWeekHigh ? Number(company.details.fiftyTwoWeekHigh) : null,
            fiftyTwoWeekLow: company.details.fiftyTwoWeekLow ? Number(company.details.fiftyTwoWeekLow) : null,
            lastRoundType: company.details.lastRoundType,
            lastRoundDate: company.details.lastRoundDate,
            lastRoundRaised: company.details.lastRoundRaised,
            lastRoundLead: company.details.lastRoundLead,
            lastRoundValuation: company.details.lastRoundValuation
          }
        : null,
      valuations: company.valuations
        ? {
            baseCurrency: company.valuations.baseCurrency,
            asOfDate: company.valuations.asOfDate?.toISOString() ?? null,
            summary: company.valuations.summary,
            models: company.valuations.models
          }
        : null,
      newsEvents: company.newsEvents.map((e) => ({
        occurredAt: e.occurredAt.toISOString(),
        category: e.category,
        sentiment: e.sentiment,
        impactScore: e.impactScore,
        title: e.title,
        body: e.body,
        sourceUrl: e.sourceUrl
      })),
      priceHistory: company.prices.map((p) => ({
        datetime: p.datetime.toISOString(),
        price: Number(p.price),
        note: p.note,
        link: p.link,
        category: p.category
      })),
      financialPeriods: company.periods.map((period) => ({
        fiscalYear: period.fiscalYear,
        fiscalQuarter: period.fiscalQuarter,
        periodStart: period.periodStart.toISOString(),
        periodEnd: period.periodEnd.toISOString(),
        isAudited: period.isAudited,
        scale: period.scale,
        currency: period.currency,
        values: period.values.map((v) => ({
          lineItemCode: v.lineItem.code,
          value: v.value.toString(),
          currency: v.currency,
          valueSource: v.valueSource
        }))
      }))
    };
  }

  /**
   * Inverse of exportOne. Accepts the JSON blob, creates or updates the
   * company by ISIN, and upserts every child row. Non-destructive on
   * children: existing rows that don't appear in the payload are left
   * alone. Missing `financial_line_items` codes are skipped with a warning.
   */
  async importOne(payload: Record<string, unknown>) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid payload');
    }
    const c = payload.company as Record<string, unknown> | undefined;
    if (!c || typeof c.isin !== 'string' || typeof c.name !== 'string') {
      throw new Error('Payload missing company.isin or company.name');
    }
    const isin = c.isin as string;
    const companyData = {
      name: c.name as string,
      cin: (c.cin as string) ?? null,
      sector: (c.sector as string) ?? null,
      industry: (c.industry as string) ?? null,
      activity: (c.activity as string) ?? null,
      sectorId: (c.sectorId as string) ?? null,
      industryId: (c.industryId as string) ?? null,
      activityId: (c.activityId as string) ?? null,
      description: (c.description as string) ?? null,
      country: (c.country as string) ?? 'IN',
      listingStatus: (c.listingStatus as string) ?? 'unlisted',
      defaultCurrency: (c.defaultCurrency as string) ?? 'INR',
      defaultScale: (c.defaultScale as any) ?? 'crores'
    };
    const company = await this.prisma.company.upsert({
      where: { isin },
      update: companyData,
      create: { isin, ...companyData }
    });

    const report: Record<string, number> = {};

    // Editorial singletons
    if (payload.overview && typeof payload.overview === 'object') {
      const o = payload.overview as Record<string, unknown>;
      const overviewData = {
        summary: (o.summary as string) ?? '',
        businessModel: (o.businessModel as string) ?? null,
        competitiveMoat: (o.competitiveMoat as string) ?? null,
        risks: (o.risks as string) ?? null,
        financialInsights: (o.financialInsights as string) ?? null,
        industryAnalysis: (o.industryAnalysis as string) ?? null,
        sectorAnalysis: (o.sectorAnalysis as string) ?? null,
        activityAnalysis: (o.activityAnalysis as string) ?? null
      };
      await this.prisma.companyOverview.upsert({
        where: { companyId: company.id },
        update: overviewData,
        create: { companyId: company.id, ...overviewData }
      });
      report.overview = 1;
    }

    if (payload.prosCons && typeof payload.prosCons === 'object') {
      const pc = payload.prosCons as Record<string, unknown>;
      await this.prisma.prosCons.upsert({
        where: { companyId: company.id },
        update: { pros: (pc.pros as string) ?? '', cons: (pc.cons as string) ?? '' },
        create: {
          companyId: company.id,
          pros: (pc.pros as string) ?? '',
          cons: (pc.cons as string) ?? ''
        }
      });
      report.prosCons = 1;
    }

    if (Array.isArray(payload.faq)) {
      await this.prisma.companyFaq.upsert({
        where: { companyId: company.id },
        update: { items: payload.faq as unknown as object },
        create: { companyId: company.id, items: payload.faq as unknown as object }
      });
      report.faqItems = (payload.faq as unknown[]).length;
    }

    if (Array.isArray(payload.team)) {
      await this.prisma.companyTeam.upsert({
        where: { companyId: company.id },
        update: { members: payload.team as unknown as object },
        create: { companyId: company.id, members: payload.team as unknown as object }
      });
      report.teamMembers = (payload.team as unknown[]).length;
    }

    if (Array.isArray(payload.shareholders)) {
      await this.prisma.companyShareholders.upsert({
        where: { companyId: company.id },
        update: { entries: payload.shareholders as unknown as object },
        create: {
          companyId: company.id,
          entries: payload.shareholders as unknown as object
        }
      });
      report.shareholders = (payload.shareholders as unknown[]).length;
    }

    if (Array.isArray(payload.competitors)) {
      await this.prisma.companyCompetitors.upsert({
        where: { companyId: company.id },
        update: { entries: payload.competitors as unknown as object },
        create: {
          companyId: company.id,
          entries: payload.competitors as unknown as object
        }
      });
      report.competitors = (payload.competitors as unknown[]).length;
    }

    // Company details (profile)
    if (payload.details && typeof payload.details === 'object') {
      const d = payload.details as Record<string, unknown>;
      const toDec = (v: unknown) => (v != null && v !== '' ? String(v) : null);
      const detailsData = {
        logoUrl: (d.logoUrl as string) ?? null,
        website: (d.website as string) ?? null,
        linkedinUrl: (d.linkedinUrl as string) ?? null,
        twitterUrl: (d.twitterUrl as string) ?? null,
        crunchbaseUrl: (d.crunchbaseUrl as string) ?? null,
        founded: (d.founded as string) ?? null,
        incorporationCountry: (d.incorporationCountry as string) ?? null,
        legalEntityType: (d.legalEntityType as string) ?? null,
        registeredOffice: (d.registeredOffice as string) ?? null,
        headquarters: (d.headquarters as string) ?? null,
        auditor: (d.auditor as string) ?? null,
        panNumber: (d.panNumber as string) ?? null,
        rta: (d.rta as string) ?? null,
        depository: (d.depository as string) ?? null,
        employeeCount: typeof d.employeeCount === 'number' ? d.employeeCount : null,
        subsidiariesCount: typeof d.subsidiariesCount === 'number' ? d.subsidiariesCount : null,
        fiscalYearEnd: (d.fiscalYearEnd as string) ?? null,
        shareType: (d.shareType as string) ?? null,
        faceValue: toDec(d.faceValue),
        totalShares: (d.totalShares as string) ?? null,
        lotSize: typeof d.lotSize === 'number' ? d.lotSize : null,
        availabilityPercent: toDec(d.availabilityPercent),
        fiftyTwoWeekHigh: toDec(d.fiftyTwoWeekHigh),
        fiftyTwoWeekLow: toDec(d.fiftyTwoWeekLow),
        lastRoundType: (d.lastRoundType as string) ?? null,
        lastRoundDate: (d.lastRoundDate as string) ?? null,
        lastRoundRaised: (d.lastRoundRaised as string) ?? null,
        lastRoundLead: (d.lastRoundLead as string) ?? null,
        lastRoundValuation: (d.lastRoundValuation as string) ?? null
      };
      await this.prisma.companyDetails.upsert({
        where: { companyId: company.id },
        update: detailsData,
        create: { companyId: company.id, ...detailsData }
      });
      report.details = 1;
    }

    // Company valuations (profile)
    if (payload.valuations && typeof payload.valuations === 'object') {
      const v = payload.valuations as Record<string, unknown>;
      const valData = {
        baseCurrency: (v.baseCurrency as string) ?? 'INR',
        asOfDate: v.asOfDate ? new Date(v.asOfDate as string) : null,
        summary: (v.summary as string) ?? null,
        models: (v.models ?? []) as object
      };
      await this.prisma.companyValuations.upsert({
        where: { companyId: company.id },
        update: valData,
        create: { companyId: company.id, ...valData }
      });
      report.valuations = 1;
    }

    // News events — idempotent by title
    if (Array.isArray(payload.newsEvents)) {
      let n = 0;
      for (const raw of payload.newsEvents) {
        const e = raw as Record<string, unknown>;
        if (typeof e.title !== 'string' || !e.title.trim()) continue;
        const existing = await this.prisma.newsEvent.findFirst({
          where: {
            companyId: company.id,
            title: { equals: e.title as string, mode: 'insensitive' }
          },
          select: { id: true }
        });
        const data = {
          companyId: company.id,
          occurredAt: new Date((e.occurredAt as string) ?? Date.now()),
          category: (e.category as string) ?? 'N',
          sentiment: (e.sentiment as string) ?? null,
          impactScore: typeof e.impactScore === 'number' ? (e.impactScore as number) : null,
          title: e.title as string,
          body: (e.body as string) ?? '',
          sourceUrl: (e.sourceUrl as string) ?? null
        };
        if (existing) {
          await this.prisma.newsEvent.update({ where: { id: existing.id }, data });
        } else {
          await this.prisma.newsEvent.create({ data });
        }
        n += 1;
      }
      report.newsEvents = n;
    }

    // Price history — upsert by (companyId, datetime)
    if (Array.isArray(payload.priceHistory)) {
      let n = 0;
      for (const raw of payload.priceHistory) {
        const p = raw as Record<string, unknown>;
        if (p.datetime == null || p.price == null) continue;
        const datetime = new Date(p.datetime as string);
        const price = Number(p.price);
        if (!Number.isFinite(price)) continue;
        await this.prisma.companyPriceHistory.upsert({
          where: { companyId_datetime: { companyId: company.id, datetime } },
          update: {
            price,
            note: (p.note as string) ?? null,
            link: (p.link as string) ?? null,
            category: (p.category as string) ?? null
          },
          create: {
            companyId: company.id,
            datetime,
            price,
            note: (p.note as string) ?? null,
            link: (p.link as string) ?? null,
            category: (p.category as string) ?? null
          }
        });
        n += 1;
      }
      report.priceHistory = n;
    }

    // Financial periods + metrics (lookup line items by code)
    if (Array.isArray(payload.financialPeriods)) {
      let periodsCount = 0;
      let metricsCount = 0;
      let metricsSkipped = 0;
      // Build a code → id lookup once.
      const allLineItems = await this.prisma.financialLineItem.findMany({
        select: { id: true, code: true }
      });
      const codeToLineItemId = new Map(allLineItems.map((li) => [li.code, li.id]));
      for (const rawPeriod of payload.financialPeriods) {
        const period = rawPeriod as Record<string, unknown>;
        if (period.fiscalYear == null) continue;
        const fiscalYear = period.fiscalYear as number;
        const fiscalQuarter = (period.fiscalQuarter as number | null) ?? null;
        const periodData = {
          periodStart: new Date((period.periodStart as string) ?? Date.now()),
          periodEnd: new Date((period.periodEnd as string) ?? Date.now()),
          isAudited: Boolean(period.isAudited),
          scale: (period.scale as any) ?? null,
          currency: (period.currency as string) ?? null
        };

        // Prisma composite-unique where clauses don't accept null components,
        // so we fall back to findFirst + update/create for annual periods
        // (fiscalQuarter === null).
        let saved: { id: string };
        if (fiscalQuarter != null) {
          saved = await this.prisma.financialPeriod.upsert({
            where: {
              companyId_fiscalYear_fiscalQuarter: {
                companyId: company.id,
                fiscalYear,
                fiscalQuarter
              }
            },
            update: periodData,
            create: { companyId: company.id, fiscalYear, fiscalQuarter, ...periodData }
          });
        } else {
          const existing = await this.prisma.financialPeriod.findFirst({
            where: { companyId: company.id, fiscalYear, fiscalQuarter: null },
            select: { id: true }
          });
          if (existing) {
            saved = await this.prisma.financialPeriod.update({
              where: { id: existing.id },
              data: periodData
            });
          } else {
            saved = await this.prisma.financialPeriod.create({
              data: { companyId: company.id, fiscalYear, fiscalQuarter: null, ...periodData }
            });
          }
        }
        periodsCount += 1;
        if (Array.isArray(period.values)) {
          for (const rawValue of period.values) {
            const v = rawValue as Record<string, unknown>;
            const code = v.lineItemCode as string;
            const lineItemId = codeToLineItemId.get(code);
            if (!lineItemId) {
              metricsSkipped += 1;
              continue;
            }
            await this.prisma.financialMetric.upsert({
              where: {
                companyId_periodId_lineItemId: {
                  companyId: company.id,
                  periodId: saved.id,
                  lineItemId
                }
              },
              update: {
                value: v.value as string,
                currency: (v.currency as string) ?? null,
                valueSource: (v.valueSource as 'manual' | 'derived') ?? 'manual'
              },
              create: {
                companyId: company.id,
                periodId: saved.id,
                lineItemId,
                value: v.value as string,
                currency: (v.currency as string) ?? null,
                valueSource: (v.valueSource as 'manual' | 'derived') ?? 'manual'
              }
            });
            metricsCount += 1;
          }
        }
      }
      report.financialPeriods = periodsCount;
      report.financialMetrics = metricsCount;
      if (metricsSkipped) report.financialMetricsSkipped = metricsSkipped;
    }

    // Bump every version so Medusa re-fetches on next sync.
    await this.prisma.company.update({
      where: { id: company.id },
      data: {
        statementsVersion: { increment: 1 },
        priceVersion: { increment: 1 },
        newsVersion: { increment: 1 },
        editorialVersion: { increment: 1 },
        contentUpdatedAt: new Date()
      }
    });

    return { companyId: company.id, isin: company.isin, imported: report };
  }
}
