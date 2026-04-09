import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookService } from '../../common/services/webhook.service';
import { SnapshotsService } from '../snapshots/snapshots.service';
import { UpsertCompanyPriceInput } from './dto/price.dto';

type PriceRow = {
  id: bigint;
  companyId: string;
  datetime: Date;
  price: { toString(): string };
  note: string | null;
  link: string | null;
  category: string | null;
};

function serialize(row: PriceRow) {
  return {
    id: row.id.toString(),
    companyId: row.companyId,
    datetime: row.datetime.toISOString(),
    price: Number(row.price.toString()),
    note: row.note,
    link: row.link,
    category: row.category
  };
}

/**
 * Round any incoming price to 2 decimal places. The Decimal column can
 * physically store 4 dp, but product policy is 2 dp everywhere — we round
 * here at the service boundary so every code path (admin form, CSV import,
 * future API clients) gets the same treatment.
 */
function round2(value: number | string): number {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return n as number;
  return Math.round(n * 100) / 100;
}

@Injectable()
export class PricesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookService: WebhookService,
    private readonly snapshotsService: SnapshotsService
  ) {}

  async history(companyId: string) {
    const rows = await this.prisma.companyPriceHistory.findMany({
      where: { companyId },
      orderBy: { datetime: 'desc' }
    });
    return rows.map(serialize);
  }

  private async bumpPriceVersion(companyId: string) {
    // Bump the version and return the ISIN in one round-trip so we can
    // invalidate the snapshot cache before Medusa's webhook handler pulls.
    // Without this, Medusa would fetch a 5s-stale cached snapshot under the
    // new version number and "lock in" the pre-edit data until the next
    // write.
    const company = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        priceVersion: { increment: 1 },
        contentUpdatedAt: new Date()
      },
      select: { isin: true }
    });
    this.snapshotsService.invalidate(company.isin);
    // Fire-and-forget notification to Medusa with the new version envelope.
    this.webhookService.syncToMedusa(companyId).catch(() => {});
  }

  async upsertOne(companyId: string, input: UpsertCompanyPriceInput) {
    const datetime = new Date(input.datetime);
    const price = round2(input.price);
    const row = await this.prisma.companyPriceHistory.upsert({
      where: {
        companyId_datetime: { companyId, datetime }
      },
      update: {
        price,
        note: input.note ?? null,
        link: input.link ?? null,
        category: input.category ?? null
      },
      create: {
        companyId,
        datetime,
        price,
        note: input.note ?? null,
        link: input.link ?? null,
        category: input.category ?? null
      }
    });
    await this.bumpPriceVersion(companyId);
    return serialize(row);
  }

  async upsertBulk(companyId: string, entries: UpsertCompanyPriceInput[]) {
    if (!entries.length) return [];
    const results = await this.prisma.$transaction(
      entries.map((entry) => {
        const datetime = new Date(entry.datetime);
        const price = round2(entry.price);
        return this.prisma.companyPriceHistory.upsert({
          where: { companyId_datetime: { companyId, datetime } },
          update: {
            price,
            note: entry.note ?? null,
            link: entry.link ?? null,
            category: entry.category ?? null
          },
          create: {
            companyId,
            datetime,
            price,
            note: entry.note ?? null,
            link: entry.link ?? null,
            category: entry.category ?? null
          }
        });
      })
    );
    await this.bumpPriceVersion(companyId);
    return results.map(serialize);
  }

  /**
   * Returns the price row whose datetime is closest to `target` for the
   * given company, or null if the company has no price rows. If an exact
   * match exists it wins (ties prefer the earlier row). Used by the news
   * events → price-history "push" action to back-fill event metadata onto
   * the chart even when the event date does not line up with a scraped
   * trading day.
   */
  async findNearestByDatetime(
    companyId: string,
    target: Date
  ): Promise<(PriceRow & { matchedExact: boolean }) | null> {
    // Prisma doesn't give us `ORDER BY ABS(...)` directly so we run two
    // cheap point lookups (the first price at-or-before, the first
    // at-or-after) and pick the closer one. Each lookup is backed by the
    // (company_id, datetime DESC) index, so this is O(log N).
    const [before, after] = await Promise.all([
      this.prisma.companyPriceHistory.findFirst({
        where: { companyId, datetime: { lte: target } },
        orderBy: { datetime: 'desc' }
      }),
      this.prisma.companyPriceHistory.findFirst({
        where: { companyId, datetime: { gt: target } },
        orderBy: { datetime: 'asc' }
      })
    ]);
    if (!before && !after) return null;
    let winner = before ?? after!;
    if (before && after) {
      const db = Math.abs(before.datetime.getTime() - target.getTime());
      const da = Math.abs(after.datetime.getTime() - target.getTime());
      winner = db <= da ? before : after;
    }
    const matchedExact = winner.datetime.getTime() === target.getTime();
    return { ...(winner as unknown as PriceRow), matchedExact };
  }

  /**
   * Patch an existing price row with note/link/category values pushed from
   * a news event. Price is intentionally left untouched. Bumps version.
   */
  async attachEventMetadata(
    id: bigint,
    patch: { note?: string | null; link?: string | null; category?: string | null }
  ) {
    const existing = await this.prisma.companyPriceHistory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Price entry not found');
    const row = await this.prisma.companyPriceHistory.update({
      where: { id },
      data: {
        note: patch.note !== undefined ? patch.note : existing.note,
        link: patch.link !== undefined ? patch.link : existing.link,
        category: patch.category !== undefined ? patch.category : existing.category
      }
    });
    await this.bumpPriceVersion(existing.companyId);
    return serialize(row);
  }

  async deleteOne(id: string) {
    const bigId = BigInt(id);
    const existing = await this.prisma.companyPriceHistory.findUnique({ where: { id: bigId } });
    if (!existing) {
      throw new NotFoundException('Price entry not found');
    }
    await this.prisma.companyPriceHistory.delete({ where: { id: bigId } });
    await this.bumpPriceVersion(existing.companyId);
    return true;
  }

  /**
   * Delete many price rows for a single company in one DB round-trip, then
   * bump priceVersion ONCE for the whole batch (one webhook to Medusa, one
   * snapshot invalidation). Pass the companyId explicitly so we can scope
   * the deletion and prevent a crafted request from deleting rows that
   * belong to other companies even if it smuggles their ids in.
   */
  async deleteBulk(companyId: string, ids: string[]): Promise<{ deleted: number }> {
    if (!ids?.length) return { deleted: 0 };
    const bigIds = ids
      .map((id) => {
        try {
          return BigInt(id);
        } catch {
          return null;
        }
      })
      .filter((v): v is bigint => v !== null);
    if (!bigIds.length) return { deleted: 0 };
    const result = await this.prisma.companyPriceHistory.deleteMany({
      where: { id: { in: bigIds }, companyId }
    });
    if (result.count > 0) {
      await this.bumpPriceVersion(companyId);
    }
    return { deleted: result.count };
  }
}
