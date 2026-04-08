import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookService } from '../../common/services/webhook.service';
import { SnapshotsService } from '../snapshots/snapshots.service';
import {
  UpsertCompanyOverviewInput,
  UpsertProsConsInput
} from './dto/editorial.dto';

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
