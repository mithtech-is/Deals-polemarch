/**
 * PE/VC valuation model catalog. One entry per methodType — used for
 * admin UI rendering (form fields) and for server-side computation of
 * implied value ranges. Shared discriminated union between backend and
 * frontend (storefront + calcula-frontend).
 */

export type ValuationMethodType =
  | 'dcf'
  | 'trading_comparables'
  | 'precedent_transactions'
  | 'lbo'
  | 'vc_method'
  | 'first_chicago'
  | 'scorecard'
  | 'berkus'
  | 'risk_factor_summation'
  | 'sotp'
  | 'asset_based'
  | 'dividend_discount'
  | 'residual_income'
  | 'rule_of_forty'
  | 'arr_multiple'
  | 'last_round'
  | 'public_market_equivalent'
  | 'real_options';

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

// ── Payload shapes ──────────────────────────────────────────────

export type DcfPayload = {
  wacc: number;
  forecastYears: number;
  projectedFcf: number[];
  terminalMethod: 'gordon' | 'exit_multiple';
  terminalGrowth: number;
  exitMultiple: number;
  terminalEbitda: number;
  netDebt: number;
  sharesOutstanding: number;
};

export type TradingComparablesPayload = {
  peers: Array<{
    name: string;
    isin: string | null;
    evRevenue: number | null;
    evEbitda: number | null;
    evEbit: number | null;
    pe: number | null;
    pb: number | null;
    ps: number | null;
  }>;
  appliedMultiple: 'evRevenue' | 'evEbitda' | 'evEbit' | 'pe' | 'pb' | 'ps';
  subjectMetric: number;
  netDebt: number;
};

export type PrecedentTransactionsPayload = {
  transactions: Array<{
    target: string;
    acquirer: string;
    date: string;
    dealValue: number | null;
    evRevenue: number | null;
    evEbitda: number | null;
  }>;
  appliedMultiple: 'evRevenue' | 'evEbitda';
  subjectMetric: number;
  netDebt: number;
};

export type LboPayload = {
  entryMultiple: number;
  projectedEbitda: number;
  debtToEbitda: number;
  holdYears: number;
  exitMultiple: number;
  exitEbitda: number;
  targetIrr: number;
};

export type VcMethodPayload = {
  exitRevenue: number;
  exitMultiple: number;
  requiredIrr: number;
  yearsToExit: number;
  dilution: number; // fraction, e.g. 0.25
};

export type FirstChicagoPayload = {
  discountRate: number;
  yearsToExit: number;
  scenarios: Array<{
    name: string;
    probability: number;
    exitValue: number;
  }>;
};

export type ScorecardPayload = {
  regionStageAverage: number;
  factors: Array<{ label: string; weight: number; score: number }>;
};

export type BerkusPayload = {
  buckets: Array<{ label: string; valueUsd: number }>;
};

export type RiskFactorSummationPayload = {
  base: number;
  factors: Array<{ label: string; adjustment: number }>;
};

export type SotpPayload = {
  segments: Array<{
    name: string;
    metric: number;
    metricType: string;
    multiple: number;
  }>;
  netDebt: number;
};

export type AssetBasedPayload = {
  tangibleBook: number;
  adjustments: Array<{ label: string; amount: number }>;
};

export type DividendDiscountPayload = {
  dividendPerShare: number;
  growthRate: number;
  requiredReturn: number;
  sharesOutstanding: number;
};

export type ResidualIncomePayload = {
  bookEquity: number;
  costOfEquity: number;
  residualSeries: number[];
};

export type RuleOfFortyPayload = {
  revenueGrowthPct: number;
  ebitdaMarginPct: number;
  benchmarkMultiple: number;
  revenue: number;
};

export type ArrMultiplePayload = {
  arr: number;
  multiple: number;
  netDebt: number;
};

export type LastRoundPayload = {
  roundType: string;
  roundDate: string;
  amountRaised: number;
  preMoney: number;
  postMoney: number;
  leadInvestor: string;
  investors: string[];
};

export type PublicMarketEquivalentPayload = {
  benchmarkTicker: string;
  benchmarkReturn: number;
  privateIrr: number;
  initialInvestment: number;
};

export type RealOptionsPayload = {
  underlying: number;
  strike: number;
  volatility: number;
  riskFreeRate: number;
  timeYears: number;
};

export type ValuationPayload =
  | { methodType: 'dcf'; payload: DcfPayload }
  | { methodType: 'trading_comparables'; payload: TradingComparablesPayload }
  | { methodType: 'precedent_transactions'; payload: PrecedentTransactionsPayload }
  | { methodType: 'lbo'; payload: LboPayload }
  | { methodType: 'vc_method'; payload: VcMethodPayload }
  | { methodType: 'first_chicago'; payload: FirstChicagoPayload }
  | { methodType: 'scorecard'; payload: ScorecardPayload }
  | { methodType: 'berkus'; payload: BerkusPayload }
  | { methodType: 'risk_factor_summation'; payload: RiskFactorSummationPayload }
  | { methodType: 'sotp'; payload: SotpPayload }
  | { methodType: 'asset_based'; payload: AssetBasedPayload }
  | { methodType: 'dividend_discount'; payload: DividendDiscountPayload }
  | { methodType: 'residual_income'; payload: ResidualIncomePayload }
  | { methodType: 'rule_of_forty'; payload: RuleOfFortyPayload }
  | { methodType: 'arr_multiple'; payload: ArrMultiplePayload }
  | { methodType: 'last_round'; payload: LastRoundPayload }
  | { methodType: 'public_market_equivalent'; payload: PublicMarketEquivalentPayload }
  | { methodType: 'real_options'; payload: RealOptionsPayload };

// ── Pure compute functions ──────────────────────────────────────

export type ImpliedRange = {
  low: number | null;
  base: number | null;
  high: number | null;
};

const DEFAULT_BAND = 0.15; // ±15% for low/high when we have no sensitivity

function band(base: number | null, pct = DEFAULT_BAND): ImpliedRange {
  if (base == null || !Number.isFinite(base)) return { low: null, base: null, high: null };
  return { low: base * (1 - pct), base, high: base * (1 + pct) };
}

function safe(n: unknown): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

export function computeDcf(p: DcfPayload): ImpliedRange {
  const wacc = safe(p.wacc);
  if (wacc <= 0) return { low: null, base: null, high: null };
  const fcf = Array.isArray(p.projectedFcf) ? p.projectedFcf.map(safe) : [];
  let npv = 0;
  for (let i = 0; i < fcf.length; i++) {
    npv += fcf[i] / Math.pow(1 + wacc, i + 1);
  }
  let terminal = 0;
  const lastFcf = fcf[fcf.length - 1] ?? 0;
  if (p.terminalMethod === 'gordon') {
    const g = safe(p.terminalGrowth);
    if (wacc - g > 0) terminal = (lastFcf * (1 + g)) / (wacc - g);
  } else {
    terminal = safe(p.terminalEbitda) * safe(p.exitMultiple);
  }
  const terminalPv = terminal / Math.pow(1 + wacc, fcf.length || 1);
  const ev = npv + terminalPv;
  const equity = ev - safe(p.netDebt);
  // Sensitivity: ±1% WACC
  const lowWacc = wacc + 0.01;
  const highWacc = wacc - 0.01;
  const reprice = (w: number) => {
    if (w <= 0) return equity;
    let n = 0;
    for (let i = 0; i < fcf.length; i++) n += fcf[i] / Math.pow(1 + w, i + 1);
    let t = 0;
    if (p.terminalMethod === 'gordon') {
      const g = safe(p.terminalGrowth);
      if (w - g > 0) t = (lastFcf * (1 + g)) / (w - g);
    } else {
      t = safe(p.terminalEbitda) * safe(p.exitMultiple);
    }
    return n + t / Math.pow(1 + w, fcf.length || 1) - safe(p.netDebt);
  };
  return {
    low: reprice(lowWacc),
    base: equity,
    high: reprice(highWacc)
  };
}

export function computeTradingComparables(p: TradingComparablesPayload): ImpliedRange {
  const vals = (p.peers || [])
    .map((peer) => (peer as any)[p.appliedMultiple])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    .sort((a, b) => a - b);
  if (!vals.length) return { low: null, base: null, high: null };
  const median = vals[Math.floor(vals.length / 2)];
  const p25 = vals[Math.floor(vals.length * 0.25)];
  const p75 = vals[Math.floor(vals.length * 0.75)];
  const metric = safe(p.subjectMetric);
  const netDebt = safe(p.netDebt);
  const isEquityMultiple = p.appliedMultiple === 'pe' || p.appliedMultiple === 'pb' || p.appliedMultiple === 'ps';
  const toEquity = (m: number) => (isEquityMultiple ? m * metric : m * metric - netDebt);
  return { low: toEquity(p25), base: toEquity(median), high: toEquity(p75) };
}

export function computePrecedentTransactions(p: PrecedentTransactionsPayload): ImpliedRange {
  const vals = (p.transactions || [])
    .map((t) => (t as any)[p.appliedMultiple])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    .sort((a, b) => a - b);
  if (!vals.length) return { low: null, base: null, high: null };
  const median = vals[Math.floor(vals.length / 2)];
  const min = vals[0];
  const max = vals[vals.length - 1];
  const metric = safe(p.subjectMetric);
  const netDebt = safe(p.netDebt);
  return {
    low: min * metric - netDebt,
    base: median * metric - netDebt,
    high: max * metric - netDebt
  };
}

export function computeLbo(p: LboPayload): ImpliedRange {
  const entryEv = safe(p.entryMultiple) * safe(p.projectedEbitda);
  const exitEv = safe(p.exitMultiple) * safe(p.exitEbitda);
  const debt = safe(p.debtToEbitda) * safe(p.projectedEbitda);
  const entryEquity = Math.max(entryEv - debt, 0);
  const years = Math.max(1, safe(p.holdYears));
  const moic = entryEquity > 0 ? (exitEv - debt) / entryEquity : 0;
  const irr = moic > 0 ? Math.pow(moic, 1 / years) - 1 : 0;
  // Implied entry equity that hits target IRR
  const target = safe(p.targetIrr);
  const impliedFromTarget =
    target > 0 ? (exitEv - debt) / Math.pow(1 + target, years) : entryEquity;
  return band(impliedFromTarget);
}

export function computeVcMethod(p: VcMethodPayload): ImpliedRange {
  const exit = safe(p.exitRevenue) * safe(p.exitMultiple);
  const irr = safe(p.requiredIrr);
  const years = Math.max(1, safe(p.yearsToExit));
  if (1 + irr <= 0) return { low: null, base: null, high: null };
  const pvExit = exit / Math.pow(1 + irr, years);
  const dilution = Math.max(0, Math.min(1, safe(p.dilution)));
  const postToday = pvExit * (1 - dilution);
  return band(postToday);
}

export function computeFirstChicago(p: FirstChicagoPayload): ImpliedRange {
  const r = safe(p.discountRate);
  const years = Math.max(1, safe(p.yearsToExit));
  const rows = (p.scenarios || []).map((s) => ({
    probability: safe(s.probability),
    pv: safe(s.exitValue) / Math.pow(1 + r, years)
  }));
  const totalP = rows.reduce((a, b) => a + b.probability, 0) || 1;
  const weighted = rows.reduce((a, b) => a + (b.probability / totalP) * b.pv, 0);
  const pvs = rows.map((r) => r.pv).sort((a, b) => a - b);
  return {
    low: pvs[0] ?? weighted,
    base: weighted,
    high: pvs[pvs.length - 1] ?? weighted
  };
}

export function computeScorecard(p: ScorecardPayload): ImpliedRange {
  const base = safe(p.regionStageAverage);
  const factors = p.factors || [];
  const totalWeight = factors.reduce((a, b) => a + safe(b.weight), 0) || 1;
  const weighted = factors.reduce((a, b) => a + (safe(b.weight) / totalWeight) * safe(b.score), 0);
  return band(base * weighted);
}

export function computeBerkus(p: BerkusPayload): ImpliedRange {
  const total = (p.buckets || []).reduce((a, b) => a + safe(b.valueUsd), 0);
  return band(total, 0.1);
}

export function computeRiskFactorSummation(p: RiskFactorSummationPayload): ImpliedRange {
  const total = safe(p.base) + (p.factors || []).reduce((a, b) => a + safe(b.adjustment), 0);
  return band(total, 0.1);
}

export function computeSotp(p: SotpPayload): ImpliedRange {
  const ev = (p.segments || []).reduce((a, s) => a + safe(s.metric) * safe(s.multiple), 0);
  return band(ev - safe(p.netDebt));
}

export function computeAssetBased(p: AssetBasedPayload): ImpliedRange {
  const nav = safe(p.tangibleBook) + (p.adjustments || []).reduce((a, b) => a + safe(b.amount), 0);
  return band(nav, 0.1);
}

export function computeDividendDiscount(p: DividendDiscountPayload): ImpliedRange {
  const r = safe(p.requiredReturn);
  const g = safe(p.growthRate);
  if (r - g <= 0) return { low: null, base: null, high: null };
  const perShare = (safe(p.dividendPerShare) * (1 + g)) / (r - g);
  const equity = perShare * safe(p.sharesOutstanding);
  return band(equity);
}

export function computeResidualIncome(p: ResidualIncomePayload): ImpliedRange {
  const coe = safe(p.costOfEquity);
  if (coe <= 0) return { low: null, base: null, high: null };
  const pv = (p.residualSeries || [])
    .map(safe)
    .reduce((a, v, i) => a + v / Math.pow(1 + coe, i + 1), 0);
  return band(safe(p.bookEquity) + pv);
}

export function computeRuleOfForty(p: RuleOfFortyPayload): ImpliedRange {
  const score = safe(p.revenueGrowthPct) + safe(p.ebitdaMarginPct);
  const multiplier = score >= 40 ? safe(p.benchmarkMultiple) : safe(p.benchmarkMultiple) * (score / 40);
  return band(multiplier * safe(p.revenue));
}

export function computeArrMultiple(p: ArrMultiplePayload): ImpliedRange {
  return band(safe(p.arr) * safe(p.multiple) - safe(p.netDebt));
}

export function computeLastRound(p: LastRoundPayload): ImpliedRange {
  return band(safe(p.postMoney));
}

export function computePublicMarketEquivalent(p: PublicMarketEquivalentPayload): ImpliedRange {
  const bench = safe(p.benchmarkReturn);
  const priv = safe(p.privateIrr);
  const alpha = priv - bench;
  const ref = safe(p.initialInvestment) * (1 + priv);
  return {
    low: ref * (1 - Math.abs(alpha)),
    base: ref,
    high: ref * (1 + Math.abs(alpha))
  };
}

function normalCdf(x: number): number {
  // Abramowitz-Stegun approximation
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804 * Math.exp(-x * x * 0.5);
  const p =
    d *
    t *
    (0.31938153 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}

export function computeRealOptions(p: RealOptionsPayload): ImpliedRange {
  const s = safe(p.underlying);
  const k = safe(p.strike);
  const v = safe(p.volatility);
  const r = safe(p.riskFreeRate);
  const t = safe(p.timeYears);
  if (s <= 0 || k <= 0 || v <= 0 || t <= 0) return { low: null, base: null, high: null };
  const d1 = (Math.log(s / k) + (r + (v * v) / 2) * t) / (v * Math.sqrt(t));
  const d2 = d1 - v * Math.sqrt(t);
  const call = s * normalCdf(d1) - k * Math.exp(-r * t) * normalCdf(d2);
  return band(call);
}

export function computeImpliedRange(
  methodType: ValuationMethodType,
  payload: Record<string, unknown>
): ImpliedRange {
  try {
    switch (methodType) {
      case 'dcf':
        return computeDcf(payload as unknown as DcfPayload);
      case 'trading_comparables':
        return computeTradingComparables(payload as unknown as TradingComparablesPayload);
      case 'precedent_transactions':
        return computePrecedentTransactions(payload as unknown as PrecedentTransactionsPayload);
      case 'lbo':
        return computeLbo(payload as unknown as LboPayload);
      case 'vc_method':
        return computeVcMethod(payload as unknown as VcMethodPayload);
      case 'first_chicago':
        return computeFirstChicago(payload as unknown as FirstChicagoPayload);
      case 'scorecard':
        return computeScorecard(payload as unknown as ScorecardPayload);
      case 'berkus':
        return computeBerkus(payload as unknown as BerkusPayload);
      case 'risk_factor_summation':
        return computeRiskFactorSummation(payload as unknown as RiskFactorSummationPayload);
      case 'sotp':
        return computeSotp(payload as unknown as SotpPayload);
      case 'asset_based':
        return computeAssetBased(payload as unknown as AssetBasedPayload);
      case 'dividend_discount':
        return computeDividendDiscount(payload as unknown as DividendDiscountPayload);
      case 'residual_income':
        return computeResidualIncome(payload as unknown as ResidualIncomePayload);
      case 'rule_of_forty':
        return computeRuleOfForty(payload as unknown as RuleOfFortyPayload);
      case 'arr_multiple':
        return computeArrMultiple(payload as unknown as ArrMultiplePayload);
      case 'last_round':
        return computeLastRound(payload as unknown as LastRoundPayload);
      case 'public_market_equivalent':
        return computePublicMarketEquivalent(payload as unknown as PublicMarketEquivalentPayload);
      case 'real_options':
        return computeRealOptions(payload as unknown as RealOptionsPayload);
      default:
        return { low: null, base: null, high: null };
    }
  } catch {
    return { low: null, base: null, high: null };
  }
}

// ── Default payloads (used when admin adds a new model) ────────

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
      } satisfies DcfPayload;
    case 'trading_comparables':
      return {
        peers: [
          { name: 'Peer A', isin: null, evRevenue: 5, evEbitda: 18, evEbit: null, pe: null, pb: null, ps: null }
        ],
        appliedMultiple: 'evEbitda',
        subjectMetric: 100,
        netDebt: 0
      } satisfies TradingComparablesPayload;
    case 'precedent_transactions':
      return {
        transactions: [
          { target: '', acquirer: '', date: '', dealValue: null, evRevenue: null, evEbitda: null }
        ],
        appliedMultiple: 'evEbitda',
        subjectMetric: 100,
        netDebt: 0
      } satisfies PrecedentTransactionsPayload;
    case 'lbo':
      return {
        entryMultiple: 10,
        projectedEbitda: 100,
        debtToEbitda: 5,
        holdYears: 5,
        exitMultiple: 12,
        exitEbitda: 160,
        targetIrr: 0.2
      } satisfies LboPayload;
    case 'vc_method':
      return {
        exitRevenue: 500,
        exitMultiple: 5,
        requiredIrr: 0.3,
        yearsToExit: 5,
        dilution: 0.25
      } satisfies VcMethodPayload;
    case 'first_chicago':
      return {
        discountRate: 0.25,
        yearsToExit: 5,
        scenarios: [
          { name: 'Base', probability: 0.6, exitValue: 1000 },
          { name: 'Bull', probability: 0.25, exitValue: 2000 },
          { name: 'Bear', probability: 0.15, exitValue: 300 }
        ]
      } satisfies FirstChicagoPayload;
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
      } satisfies ScorecardPayload;
    case 'berkus':
      return {
        buckets: [
          { label: 'Sound idea', valueUsd: 0 },
          { label: 'Prototype', valueUsd: 0 },
          { label: 'Quality management', valueUsd: 0 },
          { label: 'Strategic relationships', valueUsd: 0 },
          { label: 'Product rollout / sales', valueUsd: 0 }
        ]
      } satisfies BerkusPayload;
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
      } satisfies RiskFactorSummationPayload;
    case 'sotp':
      return {
        segments: [{ name: 'Segment A', metric: 100, metricType: 'EBITDA', multiple: 10 }],
        netDebt: 0
      } satisfies SotpPayload;
    case 'asset_based':
      return {
        tangibleBook: 1000,
        adjustments: [{ label: 'Land revaluation', amount: 0 }]
      } satisfies AssetBasedPayload;
    case 'dividend_discount':
      return {
        dividendPerShare: 10,
        growthRate: 0.05,
        requiredReturn: 0.12,
        sharesOutstanding: 100
      } satisfies DividendDiscountPayload;
    case 'residual_income':
      return {
        bookEquity: 1000,
        costOfEquity: 0.12,
        residualSeries: [50, 55, 60, 65, 70]
      } satisfies ResidualIncomePayload;
    case 'rule_of_forty':
      return {
        revenueGrowthPct: 30,
        ebitdaMarginPct: 15,
        benchmarkMultiple: 8,
        revenue: 100
      } satisfies RuleOfFortyPayload;
    case 'arr_multiple':
      return { arr: 100, multiple: 6, netDebt: 0 } satisfies ArrMultiplePayload;
    case 'last_round':
      return {
        roundType: 'Series C',
        roundDate: '',
        amountRaised: 0,
        preMoney: 0,
        postMoney: 0,
        leadInvestor: '',
        investors: []
      } satisfies LastRoundPayload;
    case 'public_market_equivalent':
      return {
        benchmarkTicker: '',
        benchmarkReturn: 0.1,
        privateIrr: 0.2,
        initialInvestment: 100
      } satisfies PublicMarketEquivalentPayload;
    case 'real_options':
      return {
        underlying: 100,
        strike: 100,
        volatility: 0.4,
        riskFreeRate: 0.05,
        timeYears: 3
      } satisfies RealOptionsPayload;
    default:
      return {};
  }
}
