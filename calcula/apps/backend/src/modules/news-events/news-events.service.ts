import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookService } from '../../common/services/webhook.service';
import { SnapshotsService } from '../snapshots/snapshots.service';
import { PricesService } from '../prices/prices.service';
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
    private readonly snapshotsService: SnapshotsService,
    private readonly pricesService: PricesService
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

  /**
   * Bulk upsert — used by the admin CSV import. Groups all writes for the
   * target company in a single transaction, then bumps `newsVersion` + fires
   * one webhook at the end instead of N.
   */
  async upsertBulk(companyId: string, rows: UpsertNewsEventInput[]) {
    if (!rows.length) return [];
    const normalized = rows.map((r) => ({ ...r, companyId }));
    const created = await this.prisma.$transaction(
      normalized.map((r) => {
        const data = {
          companyId,
          occurredAt: new Date(r.occurredAt),
          category: r.category,
          title: r.title,
          body: r.body,
          sourceUrl: r.sourceUrl ?? null
        };
        if (r.id) {
          return this.prisma.newsEvent.update({ where: { id: r.id }, data });
        }
        return this.prisma.newsEvent.create({ data });
      })
    );
    await this.bumpNewsForCompany(companyId);
    return created.map(serialize);
  }

  /**
   * Push an event's metadata onto the nearest price-history row for the
   * same company. Writes `note` (title + body), `link` (sourceUrl) and
   * `category`. The price value is left untouched. If the company has no
   * price rows at all we throw a clear error so the admin knows to seed
   * price history first.
   */
  async pushToPriceHistory(eventId: string): Promise<{
    priceHistoryId: string;
    datetime: string;
    matchedExact: boolean;
  }> {
    const event = await this.prisma.newsEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('News event not found');
    const nearest = await this.pricesService.findNearestByDatetime(
      event.companyId,
      event.occurredAt
    );
    if (!nearest) {
      throw new BadRequestException(
        'NO_PRICE_HISTORY_FOR_COMPANY: seed at least one price row before pushing events.'
      );
    }
    const note = event.body ? `${event.title}\n\n${event.body}` : event.title;
    await this.pricesService.attachEventMetadata(BigInt(nearest.id), {
      note,
      link: event.sourceUrl ?? null,
      category: event.category
    });
    return {
      priceHistoryId: nearest.id.toString(),
      datetime: new Date(nearest.datetime).toISOString(),
      matchedExact: nearest.matchedExact
    };
  }

  /**
   * Bulk variant — used by "Push selected to Prices". Processes each event
   * sequentially so individual failures don't abort the whole batch.
   */
  async pushBulkToPriceHistory(eventIds: string[]): Promise<{
    pushed: number;
    skipped: Array<{ eventId: string; reason: string }>;
  }> {
    let pushed = 0;
    const skipped: Array<{ eventId: string; reason: string }> = [];
    for (const id of eventIds) {
      try {
        await this.pushToPriceHistory(id);
        pushed += 1;
      } catch (err) {
        skipped.push({
          eventId: id,
          reason: (err as Error).message ?? 'unknown error'
        });
      }
    }
    return { pushed, skipped };
  }

  async delete(id: string) {
    const existing = await this.prisma.newsEvent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('News event not found');
    await this.prisma.newsEvent.delete({ where: { id } });
    await this.bumpNewsForCompany(existing.companyId);
    return true;
  }
}
