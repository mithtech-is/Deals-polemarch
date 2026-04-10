'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { gql } from '@/lib/api';
import { formatReadOnlyFinancialValue } from '@/lib/financial-number';
import {
  COMPANY_MULTI_PERIOD_FINANCIALS_QUERY,
  COMPANY_QUERY,
  LINE_ITEMS_QUERY,
  PERIODS_QUERY,
  TRENDS_QUERY
} from '@/lib/queries';
import { useAuth } from '@/components/auth-context';
import { RequireAuth } from '@/components/require-auth';
import { DashboardPage, DashboardSection } from '@/components/dashboard/template';
import { VisDashboardTabs } from '@/components/vis/vis-dashboard-tabs';

const VisMetricChart = dynamic(
  () => import('@/components/vis/vis-metric-chart').then((m) => ({ default: m.VisMetricChart })),
  { ssr: false, loading: () => <div style={{ height: 320 }} /> }
);
const VisTableShell = dynamic(
  () => import('@/components/vis/vis-table-shell').then((m) => ({ default: m.VisTableShell })),
  { ssr: false, loading: () => <div style={{ height: 420 }} /> }
);
import type { Company, FinancialLineItem, FinancialPeriod, FinancialValue } from '@/types/domain';

type StatementType = 'balance_sheet' | 'pnl' | 'cashflow' | 'ratios_valuations';
type DashboardTab = 'balance_sheet' | 'pnl' | 'cashflow' | 'valuation' | 'core25';

const CORE_25_CODES = [
  'current_ratio', 'quick_ratio', 'cash_ratio', 'working_capital_to_sales', 'debt_to_equity',
  'debt_to_assets', 'debt_to_capital', 'interest_coverage', 'net_debt_to_ebitda', 'gross_margin',
  'ebitda_margin', 'ebit_margin', 'net_margin', 'roa', 'roe', 'roce', 'roic',
  'asset_turnover', 'inventory_turnover', 'receivables_turnover', 'payables_turnover',
  'cash_conversion_cycle', 'operating_cashflow_to_sales', 'operating_cashflow_to_net_income', 'free_cashflow_margin'
] as const;

const VALUATION_CODES = [
  'market_price_per_share', 'shares_outstanding', 'enterprise_value_manual', 'market_cap',
  'enterprise_value_calc', 'pe_ratio', 'pb_ratio', 'ps_ratio', 'ev_to_ebitda', 'ev_to_sales',
  'ev_to_ebit', 'earnings_yield', 'fcf_yield', 'price_to_ocf'
] as const;

const CODE_LABELS: Record<string, string> = {
  current_ratio: 'Current Ratio', quick_ratio: 'Quick Ratio', cash_ratio: 'Cash Ratio',
  working_capital_to_sales: 'Working Capital / Sales', debt_to_equity: 'Debt / Equity',
  debt_to_assets: 'Debt / Assets', debt_to_capital: 'Debt / Capital',
  interest_coverage: 'Interest Coverage', net_debt_to_ebitda: 'Net Debt / EBITDA',
  gross_margin: 'Gross Margin', ebitda_margin: 'EBITDA Margin', ebit_margin: 'EBIT Margin',
  net_margin: 'Net Margin', roa: 'ROA', roe: 'ROE', roce: 'ROCE', roic: 'ROIC',
  asset_turnover: 'Asset Turnover', inventory_turnover: 'Inventory Turnover',
  receivables_turnover: 'Receivables Turnover', payables_turnover: 'Payables Turnover',
  cash_conversion_cycle: 'Cash Conversion Cycle',
  operating_cashflow_to_sales: 'Operating Cashflow / Sales',
  operating_cashflow_to_net_income: 'Operating Cashflow / Net Income',
  free_cashflow_margin: 'Free Cashflow Margin', market_price_per_share: 'Market Price Per Share',
  shares_outstanding: 'Shares Outstanding', enterprise_value_manual: 'Enterprise Value (Manual Override)',
  market_cap: 'Market Capitalization', enterprise_value_calc: 'Enterprise Value',
  pe_ratio: 'P/E', pb_ratio: 'P/B', ps_ratio: 'P/S', ev_to_ebitda: 'EV/EBITDA',
  ev_to_sales: 'EV/Sales', ev_to_ebit: 'EV/EBIT', earnings_yield: 'Earnings Yield',
  fcf_yield: 'FCF Yield', price_to_ocf: 'Price/OCF'
};

function sortPeriodsDesc(periods: FinancialPeriod[]) {
  return [...periods].sort((a, b) => {
    if (a.fiscalYear !== b.fiscalYear) return b.fiscalYear - a.fiscalYear;
    return (b.fiscalQuarter ?? 0) - (a.fiscalQuarter ?? 0);
  });
}

function periodLabel(period?: FinancialPeriod) {
  if (!period) return '-';
  return period.fiscalQuarter ? `Q${period.fiscalQuarter} ${period.fiscalYear}` : `${period.fiscalYear}`;
}

function titleFromTab(tab: DashboardTab) {
  if (tab === 'balance_sheet') return 'Balance Sheet';
  if (tab === 'pnl') return 'P&L';
  if (tab === 'cashflow') return 'Cashflow';
  if (tab === 'valuation') return 'Valuation Models';
  return 'Core 25 Ratios';
}

export default function CompanyPage() {
  const { token } = useAuth();
  const params = useParams<{ id: string }>();
  const companyId = params.id;

  const [company, setCompany] = useState<Company | null>(null);
  const [periods, setPeriods] = useState<FinancialPeriod[]>([]);
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<string[]>([]);
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('pnl');
  const [trends, setTrends] = useState<Array<{ periodLabel: string; revenue?: number | null; netProfit?: number | null; networth?: number | null }>>([]);
  const [financials, setFinancials] = useState<FinancialValue[]>([]);
  const [requiredByLineItemId, setRequiredByLineItemId] = useState<Map<string, boolean>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const activeStatementType: StatementType = useMemo(() => {
    if (dashboardTab === 'valuation' || dashboardTab === 'core25') return 'ratios_valuations';
    return dashboardTab;
  }, [dashboardTab]);

  useEffect(() => {
    const load = async () => {
      try {
        const c = await gql<{ company: Company }>(COMPANY_QUERY, { id: companyId }, token);
        setCompany(c.company);

        const p = await gql<{ companyPeriods: FinancialPeriod[] }>(PERIODS_QUERY, { companyId }, token);
        const nextPeriods = p.companyPeriods ?? [];
        setPeriods(nextPeriods);
        setSelectedPeriodIds(sortPeriodsDesc(nextPeriods).slice(0, 2).map((period) => period.id));

        const t = await gql<{ companyTrends: Array<{ periodLabel: string; revenue?: number; netProfit?: number; networth?: number }> }>(
          TRENDS_QUERY,
          { companyId },
          token
        );
        setTrends(t.companyTrends ?? []);
      } catch (e) {
        setError((e as Error).message);
      }
    };
    void load();
  }, [companyId, token]);

  useEffect(() => {
    if (!selectedPeriodIds.length) {
      setFinancials([]);
      return;
    }
    const load = async () => {
      try {
        const data = await gql<{ companyMultiPeriodFinancials: FinancialValue[] }>(
          COMPANY_MULTI_PERIOD_FINANCIALS_QUERY,
          { companyId, periodIds: selectedPeriodIds, statementType: activeStatementType },
          token
        );
        setFinancials(data.companyMultiPeriodFinancials ?? []);
      } catch (e) {
        setError((e as Error).message);
      }
    };
    void load();
  }, [companyId, selectedPeriodIds, activeStatementType, token]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await gql<{ financialLineItems: FinancialLineItem[] }>(
          LINE_ITEMS_QUERY,
          { statementType: activeStatementType },
          token
        );
        const next = new Map<string, boolean>();
        for (const li of res.financialLineItems ?? []) {
          next.set(li.id, li.isRequired);
        }
        setRequiredByLineItemId(next);
      } catch {
        setRequiredByLineItemId(new Map());
      }
    };
    void load();
  }, [activeStatementType, token]);

  const periodById = useMemo(() => new Map(periods.map((period) => [period.id, period])), [periods]);
  const sortedPeriods = useMemo(() => sortPeriodsDesc(periods), [periods]);
  const selectedPeriods = useMemo(
    () => selectedPeriodIds.map((id) => periodById.get(id)).filter((period): period is FinancialPeriod => Boolean(period)),
    [selectedPeriodIds, periodById]
  );

  const financialRows = useMemo(() => {
    const byLineItem = new Map<string, {
      lineItemId: string;
      lineItemCode: string;
      lineItemName: string;
      orderCode: string;
      valuesByPeriod: Map<string, FinancialValue>;
    }>();
    for (const row of financials) {
      const existing = byLineItem.get(row.lineItemId) ?? {
        lineItemId: row.lineItemId,
        lineItemCode: row.lineItemCode,
        lineItemName: row.lineItemName,
        orderCode: row.orderCode,
        valuesByPeriod: new Map<string, FinancialValue>()
      };
      existing.valuesByPeriod.set(row.periodId, row);
      byLineItem.set(row.lineItemId, existing);
    }
    return Array.from(byLineItem.values()).sort((a, b) => {
      if (a.orderCode !== b.orderCode) return a.orderCode.localeCompare(b.orderCode);
      return a.lineItemCode.localeCompare(b.lineItemCode);
    });
  }, [financials]);

  const rowByCode = useMemo(() => new Map(financialRows.map((row) => [row.lineItemCode, row])), [financialRows]);

  const togglePeriod = (periodId: string) => {
    setSelectedPeriodIds((prev) => {
      if (prev.includes(periodId)) return prev.filter((id) => id !== periodId);
      return [...prev, periodId].sort((a, b) => {
        const pA = periodById.get(a);
        const pB = periodById.get(b);
        if (!pA || !pB) return 0;
        if (pA.fiscalYear !== pB.fiscalYear) return b.localeCompare(a);
        return (pB.fiscalQuarter ?? 0) - (pA.fiscalQuarter ?? 0);
      });
    });
  };

  const statementTable = useMemo(() => {
    const columns = [
      { key: 'code', title: 'Code', width: 180 },
      { key: 'lineItem', title: 'Line Item', width: 320 },
      ...selectedPeriods.map((period) => ({ key: period.id, title: periodLabel(period), width: 160 }))
    ];
    const records = financialRows.map((row) => {
      const depth = Math.max(Math.floor(row.orderCode.length / 2) - 1, 0);
      const rec: Record<string, unknown> = {
        code: row.lineItemCode,
        lineItem: `${'-- '.repeat(depth)}${row.lineItemName}`,
        __isRequired: requiredByLineItemId.get(row.lineItemId) ?? false
      };
      for (const period of selectedPeriods) {
        rec[period.id] = formatReadOnlyFinancialValue(row.valuesByPeriod.get(period.id)?.value);
      }
      return rec;
    });
    return { columns, records };
  }, [financialRows, selectedPeriods, requiredByLineItemId]);

  const metricsTable = useMemo(() => {
    const codes = dashboardTab === 'valuation' ? VALUATION_CODES : CORE_25_CODES;
    const columns = [
      { key: 'metric', title: dashboardTab === 'valuation' ? 'Valuation Metric' : 'Core Ratio', width: 320 },
      ...selectedPeriods.map((period) => ({ key: period.id, title: periodLabel(period), width: 160 }))
    ];
    const records = codes.map((code) => {
      const depth = Math.max(Math.floor((rowByCode.get(code)?.orderCode.length ?? 2) / 2) - 1, 0);
      const rec: Record<string, string | number | null> = { metric: `${'-- '.repeat(depth)}${CODE_LABELS[code] ?? code}` };
      for (const period of selectedPeriods) {
        rec[period.id] = formatReadOnlyFinancialValue(rowByCode.get(code)?.valuesByPeriod.get(period.id)?.value);
      }
      return rec;
    });
    return { columns, records };
  }, [dashboardTab, rowByCode, selectedPeriods]);

  const trendLineSpec = useMemo(() => ({
    type: 'line',
    data: [
      {
        id: 'trend',
        values: trends.flatMap((trend) => ([
          { period: trend.periodLabel, metric: 'Revenue', value: trend.revenue ?? null },
          { period: trend.periodLabel, metric: 'Net Profit', value: trend.netProfit ?? null },
          { period: trend.periodLabel, metric: 'Networth', value: trend.networth ?? null }
        ])).filter((row) => row.value !== null)
      }
    ],
    xField: 'period',
    yField: 'value',
    seriesField: 'metric',
    legends: { visible: true }
  }), [trends]);

  const valuationTrendSpec = useMemo(() => ({
    type: 'line',
    data: [
      {
        id: 'valuation',
        values: selectedPeriods.flatMap((period) => {
          const label = periodLabel(period);
          return [
            { period: label, metric: 'P/E', value: rowByCode.get('pe_ratio')?.valuesByPeriod.get(period.id)?.value ?? null },
            { period: label, metric: 'P/B', value: rowByCode.get('pb_ratio')?.valuesByPeriod.get(period.id)?.value ?? null },
            { period: label, metric: 'EV/EBITDA', value: rowByCode.get('ev_to_ebitda')?.valuesByPeriod.get(period.id)?.value ?? null },
            { period: label, metric: 'EV/Sales', value: rowByCode.get('ev_to_sales')?.valuesByPeriod.get(period.id)?.value ?? null }
          ];
        }).filter((row) => row.value !== null)
      }
    ],
    xField: 'period',
    yField: 'value',
    seriesField: 'metric'
  }), [selectedPeriods, rowByCode]);

  const coreHeatmapSpec = useMemo(() => ({
    type: 'heatmap',
    data: [
      {
        id: 'heat',
        values: selectedPeriods.flatMap((period) => CORE_25_CODES.map((code) => ({
          period: periodLabel(period),
          ratio: CODE_LABELS[code] ?? code,
          value: Number(rowByCode.get(code)?.valuesByPeriod.get(period.id)?.value ?? 0)
        })))
      }
    ],
    xField: 'period',
    yField: 'ratio',
    valueField: 'value'
  }), [selectedPeriods, rowByCode]);

  const statementCompositionSpec = useMemo(() => ({
    type: 'bar',
    data: [
      {
        id: 'composition',
        values: selectedPeriods.flatMap((period) =>
          financialRows
            .filter((row) => row.orderCode.length === 4)
            .map((row) => ({
              period: periodLabel(period),
              section: row.lineItemName,
              value: Number(row.valuesByPeriod.get(period.id)?.value ?? 0)
            }))
        )
      }
    ],
    xField: 'period',
    yField: 'value',
    seriesField: 'section',
    stack: true
  }), [financialRows, selectedPeriods]);

  const cashflowWaterfallSpec = useMemo(() => {
    const target = selectedPeriods[0];
    if (!target) return { type: 'waterfall', data: [{ id: 'wf', values: [] }] };
    return {
      type: 'waterfall',
      data: [
        {
          id: 'wf',
          values: [
            { label: 'Operating', value: Number(rowByCode.get('net_cash_from_operating_activities')?.valuesByPeriod.get(target.id)?.value ?? 0) },
            { label: 'Investing', value: Number(rowByCode.get('net_cash_from_investing_activities')?.valuesByPeriod.get(target.id)?.value ?? 0) },
            { label: 'Financing', value: Number(rowByCode.get('net_cash_from_financing_activities')?.valuesByPeriod.get(target.id)?.value ?? 0) },
            { label: 'Net Change', value: Number(rowByCode.get('net_increase_in_cash')?.valuesByPeriod.get(target.id)?.value ?? 0) }
          ]
        }
      ],
      xField: 'label',
      yField: 'value'
    };
  }, [rowByCode, selectedPeriods]);

  return (
    <RequireAuth>
      <DashboardPage
        title={company?.name ?? 'Company'}
        subtitle={`ISIN: ${company?.isin ?? '-'} | Sector: ${company?.sector ?? '-'}`}
      >
        <DashboardSection>
          <div className="grid grid-2">
            <div className="col">
              <span>Periods</span>
              <div className="period-picker">
                {sortedPeriods.map((period) => (
                  <label key={period.id} className="row period-option">
                    <input type="checkbox" checked={selectedPeriodIds.includes(period.id)} onChange={() => togglePeriod(period.id)} />
                    {periodLabel(period)}
                  </label>
                ))}
              </div>
            </div>
            <div className="col">
              <span>Dashboard</span>
              <VisDashboardTabs
                active={dashboardTab}
                onChange={(value) => setDashboardTab(value as DashboardTab)}
                tabs={[
                  { key: 'balance_sheet', label: 'Balance Sheet' },
                  { key: 'pnl', label: 'P&L' },
                  { key: 'cashflow', label: 'Cashflow' },
                  { key: 'valuation', label: 'Valuation Models' },
                  { key: 'core25', label: 'Core 25 Ratios' }
                ]}
              />
            </div>
          </div>
        </DashboardSection>

        <DashboardSection title={titleFromTab(dashboardTab)}>
          {(dashboardTab === 'balance_sheet' || dashboardTab === 'pnl' || dashboardTab === 'cashflow') && (
            <>
              <VisTableShell
                columns={statementTable.columns}
                records={statementTable.records}
                height={520}
                cellStyle={({ field, record }) =>
                  field === 'lineItem' && record.__isRequired
                    ? { color: '#dc2626', fontWeight: 600 }
                    : undefined
                }
              />
              <div className="grid grid-2">
                <div className="card">
                  <h3 className="page-title">Trend Lines</h3>
                  <VisMetricChart spec={trendLineSpec} />
                </div>
                <div className="card">
                  <h3 className="page-title">Statement Composition</h3>
                  <VisMetricChart spec={statementCompositionSpec} />
                </div>
              </div>
              {dashboardTab === 'cashflow' && (
                <div className="card">
                  <h3 className="page-title">Cashflow Waterfall ({periodLabel(selectedPeriods[0])})</h3>
                  <VisMetricChart spec={cashflowWaterfallSpec} />
                </div>
              )}
            </>
          )}

          {(dashboardTab === 'valuation' || dashboardTab === 'core25') && (
            <>
              <VisTableShell columns={metricsTable.columns} records={metricsTable.records} height={520} />
              <div className="grid grid-2">
                <div className="card">
                  <h3 className="page-title">Valuation Multiples Trend</h3>
                  <VisMetricChart spec={valuationTrendSpec} />
                </div>
                <div className="card">
                  <h3 className="page-title">Core Ratio Heatmap</h3>
                  <VisMetricChart spec={coreHeatmapSpec} />
                </div>
              </div>
            </>
          )}

        </DashboardSection>
        {error && <p className="error">{error}</p>}
      </DashboardPage>
    </RequireAuth>
  );
}
