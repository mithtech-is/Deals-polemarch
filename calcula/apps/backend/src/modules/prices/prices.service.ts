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
    const row = await this.prisma.companyPriceHistory.upsert({
      where: {
        companyId_datetime: { companyId, datetime }
      },
      update: {
        price: input.price,
        note: input.note ?? null,
        link: input.link ?? null,
        category: input.category ?? null
      },
      create: {
        companyId,
        datetime,
        price: input.price,
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
        return this.prisma.companyPriceHistory.upsert({
          where: { companyId_datetime: { companyId, datetime } },
          update: {
            price: entry.price,
            note: entry.note ?? null,
            link: entry.link ?? null,
            category: entry.category ?? null
          },
          create: {
            companyId,
            datetime,
            price: entry.price,
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
