import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private async latestPeriodId(companyId: string) {
    const period = await this.prisma.financialPeriod.findFirst({
      where: { companyId },
      orderBy: [{ fiscalYear: 'desc' }, { fiscalQuarter: 'desc' }]
    });
    return period?.id ?? null;
  }

  async companyOverview(companyId: string, periodId?: string) {
    const resolvedPeriodId = periodId ?? (await this.latestPeriodId(companyId));

    // Fetch the latest market price from the price history in parallel with the
    // financial metric lookup — this makes market_price available as an overview
    // card even when no FinancialPeriod exists yet.
    const [values, latestPrice] = await Promise.all([
      resolvedPeriodId
        ? this.prisma.financialMetric.findMany({
            where: { companyId, periodId: resolvedPeriodId },
            select: { value: true, lineItem: { select: { code: true } } }
          })
        : Promise.resolve([] as { value: { toString(): string }; lineItem: { code: string } }[]),
      this.prisma.companyPriceHistory.findFirst({
        where: { companyId },
        orderBy: { datetime: 'desc' },
        select: { price: true }
      })
    ]);

    const map = new Map(values.map((v) => [v.lineItem.code, Number(v.value)]));

    return {
      companyId,
      periodId: resolvedPeriodId,
      cards: [
        { code: 'market_price', value: latestPrice ? Number(latestPrice.price.toString()) : null },
        { code: 'revenue', value: map.get('revenue') ?? map.get('revenue_from_operations') ?? null },
        { code: 'net_profit', value: map.get('net_profit') ?? map.get('profit_after_tax') ?? null },
        { code: 'cash_and_cash_equivalents', value: map.get('cash_and_cash_equivalents') ?? null },
        { code: 'assets', value: map.get('total_assets') ?? map.get('assets') ?? null }
      ]
    };
  }

  async companyRatios(companyId: string, periodId?: string) {
    const resolvedPeriodId = periodId ?? (await this.latestPeriodId(companyId));
    if (!resolvedPeriodId) {
      return [];
    }

    const values = await this.prisma.financialMetric.findMany({
      where: { companyId, periodId: resolvedPeriodId },
      select: { value: true, lineItem: { select: { code: true } } }
    });

    const map = new Map(values.map((v) => [v.lineItem.code, Number(v.value)]));

    const equity = map.get('equity') ?? 0;
    const liabilities = map.get('total_liabilities') ?? map.get('current_liabilities') ?? 0;
    const netProfit = map.get('net_profit') ?? map.get('profit_after_tax') ?? 0;
    const currentAssets = map.get('current_assets') ?? 0;
    const currentLiabilities = map.get('current_liabilities') ?? 0;

    return [
      { code: 'debt_to_equity', value: equity ? liabilities / equity : null },
      { code: 'roe', value: equity ? netProfit / equity : null },
      { code: 'current_ratio', value: currentLiabilities ? currentAssets / currentLiabilities : null }
    ];
  }

  async companyTrends(companyId: string) {
    const periods = await this.prisma.financialPeriod.findMany({
      where: { companyId },
      orderBy: [{ fiscalYear: 'asc' }, { fiscalQuarter: 'asc' }]
    });
    if (!periods.length) return [];

    const allValues = await this.prisma.financialMetric.findMany({
      where: { companyId, periodId: { in: periods.map((p) => p.id) } },
      select: { periodId: true, value: true, lineItem: { select: { code: true } } }
    });

    const byPeriod = new Map<string, Map<string, number>>();
    for (const v of allValues) {
      let m = byPeriod.get(v.periodId);
      if (!m) {
        m = new Map();
        byPeriod.set(v.periodId, m);
      }
      m.set(v.lineItem.code, Number(v.value));
    }

    return periods.map((period) => {
      const map = byPeriod.get(period.id) ?? new Map();
      const periodLabel = period.fiscalQuarter ? `Q${period.fiscalQuarter} ${period.fiscalYear}` : `${period.fiscalYear}`;
      return {
        periodLabel,
        revenue: map.get('revenue') ?? map.get('revenue_from_operations') ?? null,
        netProfit: map.get('net_profit') ?? map.get('profit_after_tax') ?? null,
        networth: map.get('equity') ?? null
      };
    });
  }
}
