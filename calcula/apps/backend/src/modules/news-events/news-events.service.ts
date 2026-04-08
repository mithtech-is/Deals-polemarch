import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookService } from '../../common/services/webhook.service';
import { SnapshotsService } from '../snapshots/snapshots.service';
import { UpsertNewsEventInput } from './dto/news-event.dto';

type NewsEventRow = {
  id: string;
  companyId: string;
  occurredAt: Date;
  category: string;
  title: string;
  body: string;
  sourceUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function serialize(row: NewsEventRow) {
  return {
    id: row.id,
    companyId: row.companyId,
    occurredAt: row.occurredAt.toISOString(),
    category: row.category,
    title: row.title,
    body: row.body,
    sourceUrl: row.sourceUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

@Injectable()
export class NewsEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookService: WebhookService,
    private readonly snapshotsService: SnapshotsService
  ) {}

  /**
   * Bump newsVersion + contentUpdatedAt for the touched company, invalidate
   * the snapshot cache, then fire the webhook. Mirrors the pattern used by
   * PricesService.bumpPriceVersion and FinancialsService so the sync
   * pipeline invariants in integrations.md §6 still hold.
   */
  private async bumpNewsForCompany(companyId: string) {
    const company = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        newsVersion: { increment: 1 },
        contentUpdatedAt: new Date()
      },
      select: { isin: true }
    });
    this.snapshotsService.invalidate(company.isin);
    this.webhookService.syncToMedusa(companyId).catch(() => {});
  }

  async listByCompany(companyId: string) {
    const rows = await this.prisma.newsEvent.findMany({
      where: { companyId },
      orderBy: { occurredAt: 'desc' }
    });
    return rows.map(serialize);
  }

  async upsert(input: UpsertNewsEventInput) {
    const occurredAt = new Date(input.occurredAt);
    const data = {
      companyId: input.companyId,
      occurredAt,
      category: input.category,
      title: input.title,
      body: input.body,
      sourceUrl: input.sourceUrl ?? null
    };
    let row: NewsEventRow;
    if (input.id) {
      row = await this.prisma.newsEvent.update({
        where: { id: input.id },
        data
      });
    } else {
      row = await this.prisma.newsEvent.create({ data });
    }
    await this.bumpNewsForCompany(input.companyId);
    return serialize(row);
  }

  async delete(id: string) {
    const existing = await this.prisma.newsEvent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('News event not found');
    await this.prisma.newsEvent.delete({ where: { id } });
    await this.bumpNewsForCompany(existing.companyId);
    return true;
  }
}
