import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookService } from '../../common/services/webhook.service';
import { SnapshotsService } from '../snapshots/snapshots.service';
import { UpsertPeriodInput } from './dto/period.dto';

@Injectable()
export class PeriodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookService: WebhookService,
    private readonly snapshotsService: SnapshotsService
  ) {}

  /**
   * Bump statementsVersion + contentUpdatedAt for the touched company,
   * invalidate the in-memory snapshot cache so the next Medusa pull sees
   * fresh data, then fire the version webhook to Medusa. Called from every
   * period write (upsert + delete) because new/deleted periods change the
   * shape of the statements snapshot (columns get added or removed) even
   * when no metric values have changed.
   */
  private async bumpStatementsForCompany(companyId: string) {
    const company = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        statementsVersion: { increment: 1 },
        contentUpdatedAt: new Date()
      },
      select: { isin: true }
    });
    this.snapshotsService.invalidate(company.isin);
    this.webhookService.syncToMedusa(companyId).catch(() => {});
  }

  companyPeriods(companyId: string) {
    return this.prisma.financialPeriod.findMany({
      where: { companyId },
      orderBy: [{ fiscalYear: 'desc' }, { fiscalQuarter: 'desc' }]
    });
  }

  async upsert(input: UpsertPeriodInput) {
    const fiscalQuarter = input.fiscalQuarter ?? null;
    const periodStart = new Date(input.periodStart);
    const periodEnd = new Date(input.periodEnd);

    if (periodStart > periodEnd) {
      throw new BadRequestException('Period start must be earlier than or equal to period end');
    }

    const matchWhere = {
      companyId: input.companyId,
      fiscalYear: input.fiscalYear,
      fiscalQuarter
    };

    const upsertData = {
      periodStart,
      periodEnd,
      isAudited: input.isAudited
    };

    let result: Awaited<ReturnType<typeof this.prisma.financialPeriod.update>>;
    try {
      const existing = await this.prisma.financialPeriod.findFirst({ where: matchWhere });
      if (existing) {
        result = await this.prisma.financialPeriod.update({
          where: { id: existing.id },
          data: upsertData
        });
      } else {
        result = await this.prisma.financialPeriod.create({
          data: {
            companyId: input.companyId,
            fiscalYear: input.fiscalYear,
            fiscalQuarter,
            ...upsertData
          }
        });
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.financialPeriod.findFirst({ where: matchWhere });
        if (existing) {
          result = await this.prisma.financialPeriod.update({
            where: { id: existing.id },
            data: upsertData
          });
        } else {
          throw new ConflictException('A period with this fiscal year and quarter already exists for this company');
        }
      } else {
        throw error;
      }
    }

    // New/updated periods change the shape of the statements snapshot
    // (columns added or shifted) so Medusa must re-pull even though no
    // metric values changed.
    await this.bumpStatementsForCompany(input.companyId);
    return result;
  }

  async delete(id: string) {
    const period = await this.prisma.financialPeriod.delete({ where: { id } });
    // Deleting a period also changes the snapshot shape — one fewer column.
    await this.bumpStatementsForCompany(period.companyId);
    return period;
  }
}
