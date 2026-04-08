'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-context';
import { DashboardKpiGrid, DashboardPage, DashboardSection } from '@/components/dashboard/template';

const VisMetricChart = dynamic(
  () => import('@/components/vis/vis-metric-chart').then((m) => ({ default: m.VisMetricChart })),
  { ssr: false, loading: () => <div style={{ height: 320 }} /> }
);
import { gql } from '@/lib/api';
import { COMPANIES_QUERY, PERIODS_QUERY, TRENDS_QUERY } from '@/lib/queries';
import type { Company, FinancialPeriod } from '@/types/domain';

type CompanyTrend = {
  company: string;
  periodLabel: string;
  revenue: number;
};

function sortPeriodsDesc(periods: FinancialPeriod[]) {
  return [...periods].sort((a, b) => {
    if (a.fiscalYear !== b.fiscalYear) return b.fiscalYear - a.fiscalYear;
    return (b.fiscalQuarter ?? 0) - (a.fiscalQuarter ?? 0);
  });
}

// Target VisActor theme colors
const THEME_COLORS = ['#165dff', '#14c9c9', '#f7ba1e', '#f53f3f', '#722ed1', '#00b42a'];

export default function HomePage() {
  const { token, role } = useAuth();
  const [companyCount, setCompanyCount] = useState(0);
  const [periodCount, setPeriodCount] = useState(0);
  const [latestPeriods, setLatestPeriods] = useState<FinancialPeriod[]>([]);
  const [trendRows, setTrendRows] = useState<CompanyTrend[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = String(role ?? '').toUpperCase() === 'ADMIN';

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        setError(null);
        const res = await gql<{ companies: Company[] }>(COMPANIES_QUERY, {}, token);
        const companies = res.companies ?? [];
        setCompanyCount(companies.length);

        const top = companies.slice(0, 4);
        const periodResponses = await Promise.all(
          top.map(async (company) => {
            const p = await gql<{ companyPeriods: FinancialPeriod[] }>(PERIODS_QUERY, { companyId: company.id }, token);
            return { company, periods: p.companyPeriods ?? [] };
          })
        );

        const allPeriods = periodResponses.flatMap((x) => x.periods);
        setPeriodCount(allPeriods.length);
        setLatestPeriods(sortPeriodsDesc(allPeriods).slice(0, 5));

        const trendData = await Promise.all(
          top.map(async (company) => {
            const t = await gql<{ companyTrends: Array<{ periodLabel: string; revenue?: number | null }> }>(
              TRENDS_QUERY,
              { companyId: company.id },
              token
            );
            return (t.companyTrends ?? [])
              .filter((row) => row.revenue !== null && row.revenue !== undefined)
              .map((row) => ({ company: company.name, periodLabel: row.periodLabel, revenue: Number(row.revenue) }));
          })
        );

        setTrendRows(trendData.flat());
      } catch (e) {
        if ((e as { code?: string }).code === 'UNAUTHORIZED') return;
        setError((e as Error).message);
      }
    };
    void load();
  }, [token]);

  const revenueTrendSpec = useMemo(
    () => ({
      type: 'line',
      data: [{ id: 'rev', values: trendRows }],
      xField: 'periodLabel',
      yField: 'revenue',
      seriesField: 'company',
      color: THEME_COLORS,
      point: {
        style: {
          size: 6,
          stroke: '#fff',
          lineWidth: 2
        }
      },
      line: {
        style: {
          lineWidth: 3,
        }
      },
      legends: { 
        visible: true,
        orient: 'top',
        position: 'end'
      },
      crosshair: {
        xField: { visible: true, line: { type: 'line', style: { stroke: '#165DFF', lineDash: [0] } } } // Smooth modern crosshair
      }
    }),
    [trendRows]
  );

  const periodCoverageSpec = useMemo(
    () => ({
      type: 'bar',
      data: [
        {
          id: 'coverage',
          values: latestPeriods.map((period) => ({
            label: period.fiscalQuarter ? `Q${period.fiscalQuarter} ${period.fiscalYear}` : `${period.fiscalYear}`,
            value: 1
          }))
        }
      ],
      xField: 'label',
      yField: 'value',
      color: THEME_COLORS[1], // Soft cyan from the VisActor theme
      bar: {
        style: {
          cornerRadius: [4, 4, 0, 0] // Rounded tops for modern look
        }
      }
    }),
    [latestPeriods]
  );

  return (
    <DashboardPage
      title="Operational Overview"
      actions={
        <>
          {!token && <Link className="button-link" href="/login">Login</Link>}
          {isAdmin && (
            <>
              <Link className="button-link secondary" href="/admin/taxonomy">Open Taxonomy</Link>
              <Link className="button-link secondary" href="/admin/companies">Open Companies</Link>
            </>
          )}
        </>
      }
    >
      <DashboardKpiGrid>
        <article className="kpi-card">
          <p className="muted page-subtitle">Tracked Companies</p>
          <div className="kpi-row">
            <p className="kpi-value">{token ? companyCount.toLocaleString() : '-'}</p>
            {token && <span className="trend-badge up">+2% ↗</span>}
          </div>
          <p className="trend-compare">Compare to last month</p>
        </article>
        <article className="kpi-card">
          <p className="muted page-subtitle">Tracked Periods</p>
          <div className="kpi-row">
            <p className="kpi-value">{token ? periodCount.toLocaleString() : '-'}</p>
            {token && <span className="trend-badge down">-1% ↘</span>}
          </div>
          <p className="trend-compare">Compare to last month</p>
        </article>
        <article className="kpi-card">
          <p className="muted page-subtitle">Latest Snapshots</p>
          <div className="kpi-row">
            <p className="kpi-value">{token ? latestPeriods.length.toLocaleString() : '-'}</p>
            {token && <span className="trend-badge neutral">0% →</span>}
          </div>
          <p className="trend-compare">Compare to last month</p>
        </article>
      </DashboardKpiGrid>

      <section className="grid grid-2">
        <DashboardSection 
          title="Revenue Trend (Top Companies)"
          actions={
            <div className="period-picker" style={{ padding: '6px 12px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: '#f2f3f5', borderRadius: 6, border: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Time range
            </div>
          }
        >
          <VisMetricChart spec={revenueTrendSpec} height={340} />
        </DashboardSection>
        <DashboardSection title="Recent Period Coverage">
          <VisMetricChart spec={periodCoverageSpec} height={340} />
        </DashboardSection>
      </section>

      {error && <p className="error">{error}</p>}
    </DashboardPage>
  );
}

