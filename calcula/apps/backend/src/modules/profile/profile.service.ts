import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookService } from '../../common/services/webhook.service';
import { SnapshotsService } from '../snapshots/snapshots.service';
import {
  UpsertCompanyDetailsInput,
  UpsertCompanyValuationsInput,
  CompanyDetailsModel,
  CompanyValuationsModel
} from './dto/profile.dto';
import {
  computeImpliedRange,
  ValuationMethodType
} from './valuation-models';

type ValuationModelEntry = {
  id: string;
  methodType: ValuationMethodType;
  label: string;
  weight: number;
  impliedValueLow: number | null;
  impliedValueBase: number | null;
  impliedValueHigh: number | null;
  notes: string | null;
  payload: Record<string, unknown>;
};

function decStr(v: unknown): string | null {
  return v == null ? null : (v as { toString(): string }).toString();
}

/**
 * Service backing the "profile" snapshot kind — CompanyDetails + CompanyValuations.
 * Each upsert bumps `profileVersion` + contentUpdatedAt and fires the Medusa
 * webhook via SnapshotsService/WebhookService. Mirrors EditorialService.
 */
@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookService: WebhookService,
    private readonly snapshotsService: SnapshotsService
  ) {}

  private async bumpProfileForCompany(companyId: string) {
    const company = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        profileVersion: { increment: 1 },
        contentUpdatedAt: new Date()
      },
      select: { isin: true }
    });
    this.snapshotsService.invalidate(company.isin);
    this.webhookService.syncToMedusa(companyId).catch(() => {});
  }

  // ── Details ─────────────────────────────────────────────────

  async getDetails(companyId: string): Promise<CompanyDetailsModel | null> {
    const row = await this.prisma.companyDetails.findUnique({ where: { companyId } });
    if (!row) return null;
    return {
      companyId: row.companyId,
      logoUrl: row.logoUrl,
      website: row.website,
      linkedinUrl: row.linkedinUrl,
      twitterUrl: row.twitterUrl,
      crunchbaseUrl: row.crunchbaseUrl,
      founded: row.founded,
      incorporationCountry: row.incorporationCountry,
      legalEntityType: row.legalEntityType,
      registeredOffice: row.registeredOffice,
      headquarters: row.headquarters,
      auditor: row.auditor,
      panNumber: row.panNumber,
      rta: row.rta,
      depository: row.depository,
      employeeCount: row.employeeCount,
      subsidiariesCount: row.subsidiariesCount,
      fiscalYearEnd: row.fiscalYearEnd,
      shareType: row.shareType,
      faceValue: decStr(row.faceValue),
      totalShares: row.totalShares,
      lotSize: row.lotSize,
      availabilityPercent: decStr(row.availabilityPercent),
      fiftyTwoWeekHigh: decStr(row.fiftyTwoWeekHigh),
      fiftyTwoWeekLow: decStr(row.fiftyTwoWeekLow),
      lastRoundType: row.lastRoundType,
      lastRoundDate: row.lastRoundDate,
      lastRoundRaised: row.lastRoundRaised,
      lastRoundLead: row.lastRoundLead,
      lastRoundValuation: row.lastRoundValuation,
      updatedAt: row.updatedAt.toISOString()
    };
  }

  async upsertDetails(input: UpsertCompanyDetailsInput): Promise<CompanyDetailsModel> {
    const toDec = (s?: string): Prisma.Decimal | null | undefined =>
      s === undefined ? undefined : s === null || s === '' ? null : new Prisma.Decimal(s);
    const data: Prisma.CompanyDetailsUncheckedCreateInput = {
      companyId: input.companyId,
      logoUrl: input.logoUrl ?? null,
      website: input.website ?? null,
      linkedinUrl: input.linkedinUrl ?? null,
      twitterUrl: input.twitterUrl ?? null,
      crunchbaseUrl: input.crunchbaseUrl ?? null,
      founded: input.founded ?? null,
      incorporationCountry: input.incorporationCountry ?? null,
      legalEntityType: input.legalEntityType ?? null,
      registeredOffice: input.registeredOffice ?? null,
      headquarters: input.headquarters ?? null,
      auditor: input.auditor ?? null,
      panNumber: input.panNumber ?? null,
      rta: input.rta ?? null,
      depository: input.depository ?? null,
      employeeCount: input.employeeCount ?? null,
      subsidiariesCount: input.subsidiariesCount ?? null,
      fiscalYearEnd: input.fiscalYearEnd ?? null,
      shareType: input.shareType ?? null,
      faceValue: toDec(input.faceValue) ?? null,
      totalShares: input.totalShares ?? null,
      lotSize: input.lotSize ?? null,
      availabilityPercent: toDec(input.availabilityPercent) ?? null,
      fiftyTwoWeekHigh: toDec(input.fiftyTwoWeekHigh) ?? null,
      fiftyTwoWeekLow: toDec(input.fiftyTwoWeekLow) ?? null,
      lastRoundType: input.lastRoundType ?? null,
      lastRoundDate: input.lastRoundDate ?? null,
      lastRoundRaised: input.lastRoundRaised ?? null,
      lastRoundLead: input.lastRoundLead ?? null,
      lastRoundValuation: input.lastRoundValuation ?? null
    };
    await this.prisma.companyDetails.upsert({
      where: { companyId: input.companyId },
      update: data,
      create: data
    });
    await this.bumpProfileForCompany(input.companyId);
    return (await this.getDetails(input.companyId)) as CompanyDetailsModel;
  }

  // ── Valuations ──────────────────────────────────────────────

  async getValuations(companyId: string): Promise<CompanyValuationsModel | null> {
    const row = await this.prisma.companyValuations.findUnique({ where: { companyId } });
    if (!row) return null;
    return {
      companyId: row.companyId,
      baseCurrency: row.baseCurrency,
      asOfDate: row.asOfDate ? row.asOfDate.toISOString() : null,
      summary: row.summary,
      modelsJson: JSON.stringify(row.models ?? []),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  async upsertValuations(input: UpsertCompanyValuationsInput): Promise<CompanyValuationsModel> {
    let parsed: unknown[] = [];
    try {
      const raw = JSON.parse(input.modelsJson);
      if (Array.isArray(raw)) parsed = raw;
    } catch {
      parsed = [];
    }
    // Recompute implied ranges on the server so the persisted value is
    // always consistent with the inputs.
    const normalized: ValuationModelEntry[] = parsed
      .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null)
      .map((e) => {
        const methodType = (e.methodType as ValuationMethodType) ?? 'dcf';
        const payload =
          typeof e.payload === 'object' && e.payload !== null
            ? (e.payload as Record<string, unknown>)
            : {};
        const range = computeImpliedRange(methodType, payload);
        return {
          id:
            typeof e.id === 'string' && e.id
              ? e.id
              : `vm_${Math.random().toString(36).slice(2, 10)}`,
          methodType,
          label: typeof e.label === 'string' ? e.label : '',
          weight: typeof e.weight === 'number' ? e.weight : 1,
          impliedValueLow: range.low,
          impliedValueBase: range.base,
          impliedValueHigh: range.high,
          notes: typeof e.notes === 'string' ? e.notes : null,
          payload
        };
      });

    const data: Prisma.CompanyValuationsUncheckedCreateInput = {
      companyId: input.companyId,
      baseCurrency: input.baseCurrency,
      asOfDate: input.asOfDate ? new Date(input.asOfDate) : null,
      summary: input.summary ?? null,
      models: normalized as unknown as Prisma.InputJsonValue
    };
    await this.prisma.companyValuations.upsert({
      where: { companyId: input.companyId },
      update: data,
      create: data
    });
    await this.bumpProfileForCompany(input.companyId);
    return (await this.getValuations(input.companyId)) as CompanyValuationsModel;
  }
}
