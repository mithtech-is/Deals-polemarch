/**
 * Client-side mirror of calcula/apps/backend/src/modules/profile/valuation-models.ts.
 * Pure functions + default payloads for the 18 PE/VC methodologies so the
 * admin can compute implied values live without a round-trip. Keep this in
 * sync with the backend file — the server ALWAYS recomputes on save so a
 * drift here is cosmetic only.
 */

import type { ValuationMethodType } from '@/types/domain';

export const VALUATION_METHOD_LABELS: Record<ValuationMethodType, string> = {
  dcf: 'Discounted Cash Flow (DCF)',
  trading_comparables: 'Trading Comparables',
  precedent_transactions: 'Precedent Transactions',
  lbo: 'Leveraged Buyout (LBO)',
  vc_method: 'Venture Capital Method',
  first_chicago: 'First Chicago Method',
  scorecard: 'Scorecard Method',
  berkus: 'Berkus Method',
  risk_factor_summation: 'Risk Factor Summation',
  sotp: 'Sum-of-the-Parts (SOTP)',
  asset_based: 'Asset-Based / NAV',
  dividend_discount: 'Dividend Discount Model',
  residual_income: 'Residual Income',
  rule_of_forty: 'Rule of 40',
  arr_multiple: 'ARR / Revenue Multiple',
  last_round: 'Last Funding Round',
  public_market_equivalent: 'Public Market Equivalent',
  real_options: 'Real Options (Black-Scholes)'
};

export const VALUATION_METHOD_ORDER: ValuationMethodType[] = [
  'dcf',
  'trading_comparables',
  'precedent_transactions',
  'lbo',
  'vc_method',
  'first_chicago',
  'scorecard',
  'berkus',
  'risk_factor_summation',
  'sotp',
  'asset_based',
  'dividend_discount',
  'residual_income',
  'rule_of_forty',
  'arr_multiple',
  'last_round',
  'public_market_equivalent',
  'real_options'
];

type ImpliedRange = { low: number | null; base: number | null; high: number | null };

const DEFAULT_BAND = 0.15;

function band(base: number | null, pct = DEFAULT_BAND): ImpliedRange {
  if (base == null || !Number.isFinite(base)) return { low: null, base: null, high: null };
  return { low: base * (1 - pct), base, high: base * (1 + pct) };
}

function safe(n: unknown): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804 * Math.exp(-x * x * 0.5);
  const p =
    d *
    t *
    (0.31938153 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}

export function computeImpliedRange(
  methodType: ValuationMethodType,
  p: Record<string, unknown>
): ImpliedRange {
  try {
    const n = (k: string) => safe((p as any)[k]);
    const arr = (k: string): unknown[] => ((p as any)[k] as unknown[]) ?? [];
    switch (methodType) {
      case 'dcf': {
        const wacc = n('wacc');
        if (wacc <= 0) return { low: null, base: null, high: null };
        const fcf = (arr('projectedFcf') as number[]).map(safe);
        let npv = 0;
        for (let i = 0; i < fcf.length; i++) npv += fcf[i] / Math.pow(1 + wacc, i + 1);
        let terminal = 0;
        const lastFcf = fcf[fcf.length - 1] ?? 0;
        if ((p as any).terminalMethod === 'gordon') {
          const g = n('terminalGrowth');
          if (wacc - g > 0) terminal = (lastFcf * (1 + g)) / (wacc - g);
        } else {
          terminal = n('terminalEbitda') * n('exitMultiple');
        }
        const terminalPv = terminal / Math.pow(1 + wacc, fcf.length || 1);
        const ev = npv + terminalPv;
        const equity = ev - n('netDebt');
        const reprice = (w: number) => {
          if (w <= 0) return equity;
          let x = 0;
          for (let i = 0; i < fcf.length; i++) x += fcf[i] / Math.pow(1 + w, i + 1);
          let t = 0;
          if ((p as any).terminalMethod === 'gordon') {
            const g = n('terminalGrowth');
            if (w - g > 0) t = (lastFcf * (1 + g)) / (w - g);
          } else {
            t = n('terminalEbitda') * n('exitMultiple');
          }
          return x + t / Math.pow(1 + w, fcf.length || 1) - n('netDebt');
        };
        return { low: reprice(wacc + 0.01), base: equity, high: reprice(wacc - 0.01) };
      }
      case 'trading_comparables': {
        const peers = arr('peers') as Array<Record<string, number | null>>;
        const key = (p as any).appliedMultiple as string;
        const vals = peers
          .map((peer) => peer[key])
          .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
          .sort((a, b) => a - b);
        if (!vals.length) return { low: null, base: null, high: null };
        const median = vals[Math.floor(vals.length / 2)];
        const p25 = vals[Math.floor(vals.length * 0.25)];
        const p75 = vals[Math.floor(vals.length * 0.75)];
        const metric = n('subjectMetric');
        const netDebt = n('netDebt');
        const isEquity = key === 'pe' || key === 'pb' || key === 'ps';
        const toEquity = (m: number) => (isEquity ? m * metric : m * metric - netDebt);
        return { low: toEquity(p25), base: toEquity(median), high: toEquity(p75) };
      }
      case 'precedent_transactions': {
        const txs = arr('transactions') as Array<Record<string, number | null>>;
        const key = (p as any).appliedMultiple as string;
        const vals = txs
          .map((t) => t[key])
          .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
          .sort((a, b) => a - b);
        if (!vals.length) return { low: null, base: null, high: null };
        const median = vals[Math.floor(vals.length / 2)];
        const metric = n('subjectMetric');
        const netDebt = n('netDebt');
        return {
          low: vals[0] * metric - netDebt,
          base: median * metric - netDebt,
          high: vals[vals.length - 1] * metric - netDebt
        };
      }
      case 'lbo': {
        const entryEv = n('entryMultiple') * n('projectedEbitda');
        const exitEv = n('exitMultiple') * n('exitEbitda');
        const debt = n('debtToEbitda') * n('projectedEbitda');
        const years = Math.max(1, n('holdYears'));
        const target = n('targetIrr');
        const implied =
          target > 0 ? (exitEv - debt) / Math.pow(1 + target, years) : Math.max(entryEv - debt, 0);
        return band(implied);
      }
      case 'vc_method': {
        const exit = n('exitRevenue') * n('exitMultiple');
        const irr = n('requiredIrr');
        const years = Math.max(1, n('yearsToExit'));
        if (1 + irr <= 0) return { low: null, base: null, high: null };
        const pvExit = exit / Math.pow(1 + irr, years);
        const dilution = Math.max(0, Math.min(1, n('dilution')));
        return band(pvExit * (1 - dilution));
      }
      case 'first_chicago': {
        const r = n('discountRate');
        const years = Math.max(1, n('yearsToExit'));
        const scenarios = arr('scenarios') as Array<{ probability: number; exitValue: number }>;
        const rows = scenarios.map((s) => ({
          probability: safe(s.probability),
          pv: safe(s.exitValue) / Math.pow(1 + r, years)
        }));
        const totalP = rows.reduce((a, b) => a + b.probability, 0) || 1;
        const weighted = rows.reduce((a, b) => a + (b.probability / totalP) * b.pv, 0);
        const pvs = rows.map((x) => x.pv).sort((a, b) => a - b);
        return {
          low: pvs[0] ?? weighted,
          base: weighted,
          high: pvs[pvs.length - 1] ?? weighted
        };
      }
      case 'scorecard': {
        const base = n('regionStageAverage');
        const factors = arr('factors') as Array<{ weight: number; score: number }>;
        const totalW = factors.reduce((a, b) => a + safe(b.weight), 0) || 1;
        const weighted = factors.reduce((a, b) => a + (safe(b.weight) / totalW) * safe(b.score), 0);
        return band(base * weighted);
      }
      case 'berkus': {
        const buckets = arr('buckets') as Array<{ valueUsd: number }>;
        const total = buckets.reduce((a, b) => a + safe(b.valueUsd), 0);
        return band(total, 0.1);
      }
      case 'risk_factor_summation': {
        const base = n('base');
        const factors = arr('factors') as Array<{ adjustment: number }>;
        const total = base + factors.reduce((a, b) => a + safe(b.adjustment), 0);
        return band(total, 0.1);
      }
      case 'sotp': {
        const segments = arr('segments') as Array<{ metric: number; multiple: number }>;
        const ev = segments.reduce((a, s) => a + safe(s.metric) * safe(s.multiple), 0);
        return band(ev - n('netDebt'));
      }
      case 'asset_based': {
        const adjustments = arr('adjustments') as Array<{ amount: number }>;
        const nav = n('tangibleBook') + adjustments.reduce((a, b) => a + safe(b.amount), 0);
        return band(nav, 0.1);
      }
      case 'dividend_discount': {
        const r = n('requiredReturn');
        const g = n('growthRate');
        if (r - g <= 0) return { low: null, base: null, high: null };
        const perShare = (n('dividendPerShare') * (1 + g)) / (r - g);
        return band(perShare * n('sharesOutstanding'));
      }
      case 'residual_income': {
        const coe = n('costOfEquity');
        if (coe <= 0) return { low: null, base: null, high: null };
        const series = arr('residualSeries') as number[];
        const pv = series.reduce((a, v, i) => a + safe(v) / Math.pow(1 + coe, i + 1), 0);
        return band(n('bookEquity') + pv);
      }
      case 'rule_of_forty': {
        const score = n('revenueGrowthPct') + n('ebitdaMarginPct');
        const mult = score >= 40 ? n('benchmarkMultiple') : n('benchmarkMultiple') * (score / 40);
        return band(mult * n('revenue'));
      }
      case 'arr_multiple':
        return band(n('arr') * n('multiple') - n('netDebt'));
      case 'last_round':
        return band(n('postMoney'));
      case 'public_market_equivalent': {
        const bench = n('benchmarkReturn');
        const priv = n('privateIrr');
        const alpha = priv - bench;
        const ref = n('initialInvestment') * (1 + priv);
        return {
          low: ref * (1 - Math.abs(alpha)),
          base: ref,
          high: ref * (1 + Math.abs(alpha))
        };
      }
      case 'real_options': {
        const s = n('underlying');
        const k = n('strike');
        const v = n('volatility');
        const r = n('riskFreeRate');
        const t = n('timeYears');
        if (s <= 0 || k <= 0 || v <= 0 || t <= 0)
          return { low: null, base: null, high: null };
        const d1 = (Math.log(s / k) + (r + (v * v) / 2) * t) / (v * Math.sqrt(t));
        const d2 = d1 - v * Math.sqrt(t);
        const call = s * normalCdf(d1) - k * Math.exp(-r * t) * normalCdf(d2);
        return band(call);
      }
      default:
        return { low: null, base: null, high: null };
    }
  } catch {
    return { low: null, base: null, high: null };
  }
}

export function defaultPayloadFor(methodType: ValuationMethodType): Record<string, unknown> {
  switch (methodType) {
    case 'dcf':
      return {
        wacc: 0.12,
        forecastYears: 5,
        projectedFcf: [100, 120, 140, 160, 180],
        terminalMethod: 'gordon',
        terminalGrowth: 0.03,
        exitMultiple: 10,
        terminalEbitda: 200,
        netDebt: 0,
        sharesOutstanding: 100
      };
    case 'trading_comparables':
      return {
        peers: [
          {
            name: 'Peer A',
            isin: '',
            evRevenue: 5,
            evEbitda: 18,
            evEbit: null,
            pe: null,
            pb: null,
            ps: null
          }
        ],
        appliedMultiple: 'evEbitda',
        subjectMetric: 100,
        netDebt: 0
      };
    case 'precedent_transactions':
      return {
        transactions: [
          { target: '', acquirer: '', date: '', dealValue: null, evRevenue: null, evEbitda: null }
        ],
        appliedMultiple: 'evEbitda',
        subjectMetric: 100,
        netDebt: 0
      };
    case 'lbo':
      return {
        entryMultiple: 10,
        projectedEbitda: 100,
        debtToEbitda: 5,
        holdYears: 5,
        exitMultiple: 12,
        exitEbitda: 160,
        targetIrr: 0.2
      };
    case 'vc_method':
      return {
        exitRevenue: 500,
        exitMultiple: 5,
        requiredIrr: 0.3,
        yearsToExit: 5,
        dilution: 0.25
      };
    case 'first_chicago':
      return {
        discountRate: 0.25,
        yearsToExit: 5,
        scenarios: [
          { name: 'Base', probability: 0.6, exitValue: 1000 },
          { name: 'Bull', probability: 0.25, exitValue: 2000 },
          { name: 'Bear', probability: 0.15, exitValue: 300 }
        ]
      };
    case 'scorecard':
      return {
        regionStageAverage: 2000000,
        factors: [
          { label: 'Strength of team', weight: 0.3, score: 1 },
          { label: 'Size of opportunity', weight: 0.25, score: 1 },
          { label: 'Product / tech', weight: 0.15, score: 1 },
          { label: 'Competitive env.', weight: 0.1, score: 1 },
          { label: 'Marketing / sales', weight: 0.1, score: 1 },
          { label: 'Need for more funding', weight: 0.05, score: 1 },
          { label: 'Other', weight: 0.05, score: 1 }
        ]
      };
    case 'berkus':
      return {
        buckets: [
          { label: 'Sound idea', valueUsd: 0 },
          { label: 'Prototype', valueUsd: 0 },
          { label: 'Quality management', valueUsd: 0 },
          { label: 'Strategic relationships', valueUsd: 0 },
          { label: 'Product rollout / sales', valueUsd: 0 }
        ]
      };
    case 'risk_factor_summation':
      return {
        base: 2000000,
        factors: [
          { label: 'Management', adjustment: 0 },
          { label: 'Stage', adjustment: 0 },
          { label: 'Legislation / political', adjustment: 0 },
          { label: 'Manufacturing', adjustment: 0 },
          { label: 'Sales & marketing', adjustment: 0 },
          { label: 'Funding / capital', adjustment: 0 },
          { label: 'Competition', adjustment: 0 },
          { label: 'Technology', adjustment: 0 },
          { label: 'Litigation', adjustment: 0 },
          { label: 'International', adjustment: 0 },
          { label: 'Reputation', adjustment: 0 },
          { label: 'Exit value', adjustment: 0 }
        ]
      };
    case 'sotp':
      return {
        segments: [{ name: 'Segment A', metric: 100, metricType: 'EBITDA', multiple: 10 }],
        netDebt: 0
      };
    case 'asset_based':
      return {
        tangibleBook: 1000,
        adjustments: [{ label: 'Land revaluation', amount: 0 }]
      };
    case 'dividend_discount':
      return {
        dividendPerShare: 10,
        growthRate: 0.05,
        requiredReturn: 0.12,
        sharesOutstanding: 100
      };
    case 'residual_income':
      return {
        bookEquity: 1000,
        costOfEquity: 0.12,
        residualSeries: [50, 55, 60, 65, 70]
      };
    case 'rule_of_forty':
      return {
        revenueGrowthPct: 30,
        ebitdaMarginPct: 15,
        benchmarkMultiple: 8,
        revenue: 100
      };
    case 'arr_multiple':
      return { arr: 100, multiple: 6, netDebt: 0 };
    case 'last_round':
      return {
        roundType: 'Series C',
        roundDate: '',
        amountRaised: 0,
        preMoney: 0,
        postMoney: 0,
        leadInvestor: '',
        investors: [] as string[]
      };
    case 'public_market_equivalent':
      return {
        benchmarkTicker: '',
        benchmarkReturn: 0.1,
        privateIrr: 0.2,
        initialInvestment: 100
      };
    case 'real_options':
      return {
        underlying: 100,
        strike: 100,
        volatility: 0.4,
        riskFreeRate: 0.05,
        timeYears: 3
      };
    default:
      return {};
  }
}
