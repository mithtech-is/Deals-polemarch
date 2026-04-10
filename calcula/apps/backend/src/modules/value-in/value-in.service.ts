import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ScaleUnit, StatementType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ALL_SCALES, COMMON_CURRENCIES, resolveValueIn } from '../../common/value-in/value-in';

@Injectable()
export class ValueInService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Defaults ─────────────────────────────────────────────────
  async setCompanyDefaults(companyId: string, currency: string, scale: ScaleUnit) {
    if (!COMMON_CURRENCIES.includes(currency) && currency.length !== 3) {
      throw new NotFoundException('Invalid currency');
    }
    if (!ALL_SCALES.includes(scale)) throw new NotFoundException('Invalid scale');
    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        defaultCurrency: currency,
        defaultScale: scale,
        statementsVersion: { increment: 1 },
        contentUpdatedAt: new Date(),
      },
    });
    return { ok: true };
  }

  // ── Period-level ValueIn ─────────────────────────────────────
  async setPeriodValueIn(periodId: string, currency: string | null, scale: ScaleUnit | null) {
    const period = await this.prisma.financialPeriod.update({
      where: { id: periodId },
      data: { currency, scale },
      include: { company: true },
    });
    await this.prisma.company.update({
      where: { id: period.companyId },
      data: { statementsVersion: { increment: 1 }, contentUpdatedAt: new Date() },
    });
    return { ok: true };
  }

  // ── Per (period, statement) override ────────────────────────
  async setStatementValueIn(
    periodId: string,
    statementType: StatementType,
    currency: string | null,
    scale: ScaleUnit | null,
  ) {
    if (currency === null && scale === null) {
      await this.prisma.periodStatementValueIn.deleteMany({ where: { periodId, statementType } });
    } else {
      await this.prisma.periodStatementValueIn.upsert({
        where: { periodId_statementType: { periodId, statementType } },
        create: { periodId, statementType, currency, scale },
        update: { currency, scale },
      });
    }
    const period = await this.prisma.financialPeriod.findUnique({
      where: { id: periodId },
      select: { companyId: true },
    });
    if (period) {
      await this.prisma.company.update({
        where: { id: period.companyId },
        data: { statementsVersion: { increment: 1 }, contentUpdatedAt: new Date() },
      });
    }
    return { ok: true };
  }

  // ── Resolution helper for resolver reads ────────────────────
  async resolveForPeriod(periodId: string, statementType: StatementType) {
    const period = await this.prisma.financialPeriod.findUnique({
      where: { id: periodId },
      include: {
        company: { select: { defaultCurrency: true, defaultScale: true } },
        statementValueIns: { where: { statementType } },
      },
    });
    if (!period) throw new NotFoundException('Period not found');
    const perStatement = period.statementValueIns[0];
    const resolved = resolveValueIn(
      perStatement ? { currency: perStatement.currency, scale: perStatement.scale } : null,
      { currency: period.currency, scale: period.scale },
      period.company,
    );
    return resolved;
  }

  // ── Currency rates ──────────────────────────────────────────
  listCurrencyRates() {
    return this.prisma.currencyRate.findMany({
      orderBy: [{ fromCcy: 'asc' }, { toCcy: 'asc' }, { asOf: 'desc' }],
    });
  }

  async upsertCurrencyRate(params: { fromCcy: string; toCcy: string; rate: number; asOf: string; source?: string | null }) {
    const asOfDate = new Date(params.asOf);
    return this.prisma.currencyRate.upsert({
      where: {
        fromCcy_toCcy_asOf: { fromCcy: params.fromCcy, toCcy: params.toCcy, asOf: asOfDate },
      },
      create: {
        fromCcy: params.fromCcy,
        toCcy: params.toCcy,
        rate: new Prisma.Decimal(params.rate),
        asOf: asOfDate,
        source: params.source ?? null,
      },
      update: {
        rate: new Prisma.Decimal(params.rate),
        source: params.source ?? null,
      },
    });
  }

  deleteCurrencyRate(id: string) {
    return this.prisma.currencyRate.delete({ where: { id } });
  }
}
