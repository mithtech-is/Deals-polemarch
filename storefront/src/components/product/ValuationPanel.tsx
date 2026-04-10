"use client";

import { useEffect, useMemo, useState } from "react";
import { getSnapshot, type ValuationModelEntry } from "@/lib/snapshot";
import { Markdown } from "./Markdown";
import { VALUATION_METHOD_LABELS } from "@/lib/valuation-method-labels";
import { useCurrency } from "@/components/CurrencyContext";

type Props = {
  isin: string;
};

function formatNumber(n: number | null, currency: string): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  let scaled = n;
  let suffix = "";
  if (abs >= 1e12) {
    scaled = n / 1e12;
    suffix = "T";
  } else if (abs >= 1e9) {
    scaled = n / 1e9;
    suffix = "B";
  } else if (abs >= 1e7) {
    scaled = n / 1e7;
    suffix = "Cr";
  } else if (abs >= 1e5) {
    scaled = n / 1e5;
    suffix = "L";
  } else if (abs >= 1e3) {
    scaled = n / 1e3;
    suffix = "K";
  }
  const formatted = scaled.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const sym = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency + " ";
  return `${sym}${formatted}${suffix}`;
}

function titleCase(s: string): string {
  return s
    .split(/[_\s]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function renderPayloadValue(v: unknown, currency: string): string {
  if (v == null) return "—";
  if (typeof v === "number") {
    if (Math.abs(v) < 10 && !Number.isInteger(v)) {
      // Likely a rate
      return `${(v * 100).toFixed(2)}%`;
    }
    return v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) {
    if (v.length === 0) return "—";
    if (v.every((x) => typeof x === "number")) {
      return v.map((x) => (x as number).toLocaleString("en-IN")).join(", ");
    }
    return JSON.stringify(v);
  }
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function PayloadTable({
  payload,
  currency,
}: {
  payload: Record<string, unknown>;
  currency: string;
}) {
  const entries = Object.entries(payload).filter(([k]) => !k.startsWith("_"));
  if (!entries.length) {
    return <p className="text-xs text-slate-500 italic">No inputs captured.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-xs">
        <tbody>
          {entries.map(([k, v]) => {
            // Render nested arrays of objects as sub-tables
            if (
              Array.isArray(v) &&
              v.length > 0 &&
              typeof v[0] === "object" &&
              v[0] !== null
            ) {
              const cols = Object.keys(v[0] as Record<string, unknown>);
              return (
                <tr key={k} className="align-top border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2 font-semibold text-slate-600 bg-slate-50 whitespace-nowrap w-40">
                    {titleCase(k)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="overflow-x-auto rounded border border-slate-100">
                      <table className="w-full text-[11px]">
                        <thead className="bg-slate-50">
                          <tr>
                            {cols.map((c) => (
                              <th
                                key={c}
                                className="px-2 py-1 text-left font-semibold text-slate-700"
                              >
                                {titleCase(c)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(v as Array<Record<string, unknown>>).map((row, i) => (
                            <tr key={i} className="border-t border-slate-100">
                              {cols.map((c) => (
                                <td
                                  key={c}
                                  className="px-2 py-1 text-slate-700"
                                >
                                  {renderPayloadValue(row[c], currency)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              );
            }
            return (
              <tr
                key={k}
                className="border-b border-slate-100 last:border-0"
              >
                <td className="px-3 py-2 font-semibold text-slate-600 bg-slate-50 whitespace-nowrap w-40">
                  {titleCase(k)}
                </td>
                <td className="px-3 py-2 text-slate-800">
                  {renderPayloadValue(v, currency)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type ProfileValuations = NonNullable<
  NonNullable<Awaited<ReturnType<typeof getSnapshot>>["profile"]>["valuations"]
>;
type ProfileDetails = NonNullable<
  NonNullable<Awaited<ReturnType<typeof getSnapshot>>["profile"]>["details"]
>;

/**
 * Normalise a string like "6,51,66,70,000" or "651.67 Cr" or "6.52e9" into a
 * raw share count. Returns null if the value is unparseable.
 */
function parseShareCount(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[,\s₹]/g, "");
  let multiplier = 1;
  let numeric = cleaned;
  const crMatch = /^([\d.]+)\s*cr/.exec(cleaned);
  const lakhMatch = /^([\d.]+)\s*l(akh)?/.exec(cleaned);
  if (crMatch) {
    numeric = crMatch[1];
    multiplier = 1e7;
  } else if (lakhMatch) {
    numeric = lakhMatch[1];
    multiplier = 1e5;
  }
  const n = Number(numeric);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n * multiplier;
}

function parsePrice(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const n = Number(String(raw).replace(/[,\s₹]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Scale a consensus equity value (expressed in the valuation panel's base
 * currency, in rupees at absolute units) to match a market cap computed from
 * (price × shares). Valuation models on this company are stored in crores, so
 * we compare on a common crore basis.
 */
function toCrores(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  // Heuristic: if the number is absurdly large (> 1e9) assume it's already in
  // rupees; otherwise assume it's already in crores (our Calcula convention).
  if (Math.abs(n) > 1e9) return n / 1e7;
  return n;
}

function FairValueMeter({
  consensusCr,
  lowCr,
  highCr,
  details,
  currency,
}: {
  consensusCr: number;
  lowCr: number | null;
  highCr: number | null;
  details: ProfileDetails | null;
  currency: string;
}) {
  const shares = parseShareCount(details?.totalShares ?? null);
  const high52 = parsePrice(details?.fiftyTwoWeekHigh ?? null);
  const low52 = parsePrice(details?.fiftyTwoWeekLow ?? null);
  if (!shares || (!high52 && !low52)) return null;

  const midPrice =
    high52 != null && low52 != null
      ? (high52 + low52) / 2
      : (high52 ?? low52 ?? 0);
  if (midPrice <= 0) return null;

  // Market cap in crores (shares × price / 1e7).
  const marketCapCr = (shares * midPrice) / 1e7;
  const fairCr = consensusCr;
  if (!Number.isFinite(marketCapCr) || !Number.isFinite(fairCr) || fairCr <= 0)
    return null;

  const deviation = (marketCapCr - fairCr) / fairCr; // -1..+1ish
  const clamped = Math.max(-0.5, Math.min(0.5, deviation));
  // Map -0.5..+0.5 → 0..100 percent along the meter.
  const pointerPct = ((clamped + 0.5) / 1.0) * 100;

  let verdict: string;
  let verdictTone: string;
  if (deviation <= -0.2) {
    verdict = "Undervalued";
    verdictTone = "text-emerald-700 bg-emerald-50 border-emerald-200";
  } else if (deviation <= -0.05) {
    verdict = "Slightly undervalued";
    verdictTone = "text-emerald-700 bg-emerald-50 border-emerald-200";
  } else if (deviation < 0.05) {
    verdict = "Fairly valued";
    verdictTone = "text-slate-700 bg-slate-50 border-slate-200";
  } else if (deviation < 0.2) {
    verdict = "Slightly overvalued";
    verdictTone = "text-amber-700 bg-amber-50 border-amber-200";
  } else {
    verdict = "Overvalued";
    verdictTone = "text-rose-700 bg-rose-50 border-rose-200";
  }

  const formatCr = (cr: number) => formatNumber(cr, currency);
  const pctLabel = `${deviation >= 0 ? "+" : ""}${(deviation * 100).toFixed(
    1
  )}%`;

  return (
    <div className="mb-5 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Fair-value meter
          </div>
          <div className="text-sm text-slate-600 mt-0.5">
            Market cap vs. weighted-consensus fair value
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full border text-xs font-bold ${verdictTone}`}
        >
          {verdict} • {pctLabel}
        </span>
      </div>

      {/* Gauge bar */}
      <div className="relative h-3 rounded-full overflow-hidden bg-gradient-to-r from-emerald-400 via-slate-200 to-rose-400">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-slate-900 shadow"
          style={{ left: `${pointerPct}%`, transform: "translate(-50%,-50%)" }}
          title={`${pctLabel} vs. fair value`}
        />
      </div>
      <div className="flex justify-between text-[10px] font-semibold text-slate-500 mt-1">
        <span>Undervalued −50%</span>
        <span>Fair</span>
        <span>Overvalued +50%</span>
      </div>

      {/* Numbers */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
            Implied market cap
          </div>
          <div className="text-sm font-bold text-slate-900 mt-0.5">
            {formatCr(marketCapCr)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {parseShareCount(details?.totalShares ?? null) != null
              ? `${(shares / 1e7).toFixed(2)} Cr shares × ₹${midPrice.toFixed(
                  2
                )} midpoint`
              : null}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
            Fair value (consensus)
          </div>
          <div className="text-sm font-bold text-slate-900 mt-0.5">
            {formatCr(fairCr)}
          </div>
          {lowCr != null && highCr != null && (
            <div className="text-[10px] text-slate-500 mt-0.5">
              Range {formatCr(lowCr)} – {formatCr(highCr)}
            </div>
          )}
        </div>
        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
            Premium / (Discount)
          </div>
          <div
            className={`text-sm font-bold mt-0.5 ${
              deviation >= 0 ? "text-rose-700" : "text-emerald-700"
            }`}
          >
            {formatCr(marketCapCr - fairCr)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{pctLabel}</div>
        </div>
      </div>
    </div>
  );
}

function ValuationRangeBar({
  entry,
  minLow,
  maxHigh,
  currency,
}: {
  entry: ValuationModelEntry;
  minLow: number;
  maxHigh: number;
  currency: string;
}) {
  const span = maxHigh - minLow || 1;
  const low = entry.impliedValueLow ?? entry.impliedValueBase ?? 0;
  const high = entry.impliedValueHigh ?? entry.impliedValueBase ?? 0;
  const base = entry.impliedValueBase ?? low;
  const left = ((low - minLow) / span) * 100;
  const width = Math.max(((high - low) / span) * 100, 1);
  const basePct = ((base - minLow) / span) * 100;
  return (
    <div className="relative h-6 bg-slate-100 rounded-md">
      <div
        className="absolute top-1 bottom-1 rounded bg-emerald-200"
        style={{ left: `${left}%`, width: `${width}%` }}
      />
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-emerald-700"
        style={{ left: `${basePct}%` }}
        title={formatNumber(base, currency)}
      />
    </div>
  );
}

export function ValuationPanel({ isin }: Props) {
  const { currency: userCurrency } = useCurrency();
  const [valuations, setValuations] = useState<ProfileValuations | null>(null);
  const [details, setDetails] = useState<ProfileDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isin) return;
    let cancelled = false;
    setLoading(true);
    getSnapshot(isin, "profile")
      .then((bundle) => {
        if (cancelled) return;
        setValuations(bundle.profile?.valuations ?? null);
        setDetails(bundle.profile?.details ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setValuations(null);
          setDetails(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isin]);

  const stats = useMemo(() => {
    if (!valuations || !valuations.models.length) return null;
    const models = valuations.models;
    const withBase = models.filter(
      (m) => m.impliedValueBase != null && Number.isFinite(m.impliedValueBase)
    );
    if (!withBase.length) return null;
    let totalWeight = 0;
    let weightedBase = 0;
    let low = Number.POSITIVE_INFINITY;
    let high = Number.NEGATIVE_INFINITY;
    for (const m of withBase) {
      const w = m.weight || 1;
      totalWeight += w;
      weightedBase += w * (m.impliedValueBase as number);
      const l = m.impliedValueLow ?? (m.impliedValueBase as number);
      const h = m.impliedValueHigh ?? (m.impliedValueBase as number);
      if (l < low) low = l;
      if (h > high) high = h;
    }
    const consensus = totalWeight ? weightedBase / totalWeight : null;
    return {
      consensus,
      low: Number.isFinite(low) ? low : null,
      high: Number.isFinite(high) ? high : null,
      count: models.length,
      withBaseCount: withBase.length,
    };
  }, [valuations]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="h-6 w-40 bg-slate-100 rounded mb-3 animate-pulse" />
        <div className="h-32 bg-slate-50 rounded animate-pulse" />
      </div>
    );
  }

  if (!valuations || valuations.models.length === 0) return null;

  // Precedence: valuation-set baseCurrency → live user selection → INR.
  const currency = valuations.baseCurrency || userCurrency || "INR";
  const minLow = stats?.low ?? 0;
  const maxHigh = stats?.high ?? 1;

  // Fair value per share = equity value (in rupees) / shares outstanding.
  // Valuation amounts on the panel are typically stored in crores (1e7). The
  // `toCrores` heuristic normalises both conventions; we invert it here to get
  // absolute rupees before dividing by the share count.
  const shares = parseShareCount(details?.totalShares ?? null);
  const sym = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency + " ";
  const perShare = (valueInCrores: number | null | undefined): string => {
    if (valueInCrores == null || !Number.isFinite(valueInCrores) || !shares) return "—";
    const rupees = valueInCrores * 1e7;
    const ps = rupees / shares;
    if (!Number.isFinite(ps) || ps <= 0) return "—";
    return `${sym}${ps.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  };
  const consensusCrAll = toCrores(stats?.consensus ?? null);
  const lowCrAll = toCrores(stats?.low ?? null);
  const highCrAll = toCrores(stats?.high ?? null);

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <article
      id="valuations"
      className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm"
    >
      <header className="mb-4 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Valuation Models</h2>
          <p className="text-xs text-slate-500 mt-1">
            {valuations.models.length} method
            {valuations.models.length === 1 ? "" : "s"} curated by Polemarch
            analysts
            {valuations.asOfDate
              ? ` • as of ${new Date(valuations.asOfDate).toLocaleDateString()}`
              : ""}
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
          {currency}
        </span>
      </header>

      {valuations.summary && (
        <div className="mb-5 rounded-xl bg-slate-50 border border-slate-100 p-4">
          <Markdown>{valuations.summary}</Markdown>
        </div>
      )}

      {stats && stats.consensus != null && (
        <div className="mb-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
              Fair value / share
            </div>
            <div className="text-lg font-bold text-emerald-900 mt-1">
              {perShare(consensusCrAll)}
            </div>
            {shares != null && lowCrAll != null && highCrAll != null && (
              <div className="text-[10px] text-emerald-700/80 mt-0.5">
                {perShare(lowCrAll)} – {perShare(highCrAll)}
              </div>
            )}
          </div>
          <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-4">
            <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
              Weighted consensus
            </div>
            <div className="text-lg font-bold text-emerald-900 mt-1">
              {formatNumber(stats.consensus, currency)}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
              Range low
            </div>
            <div className="text-lg font-bold text-slate-900 mt-1">
              {formatNumber(stats.low, currency)}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
              Range high
            </div>
            <div className="text-lg font-bold text-slate-900 mt-1">
              {formatNumber(stats.high, currency)}
            </div>
          </div>
        </div>
      )}

      {stats && stats.consensus != null && (
        <FairValueMeter
          consensusCr={toCrores(stats.consensus) ?? stats.consensus}
          lowCr={toCrores(stats.low)}
          highCr={toCrores(stats.high)}
          details={details}
          currency={currency}
        />
      )}

      {stats && stats.low != null && stats.high != null && stats.low !== stats.high && (
        <div className="mb-5 rounded-xl border border-slate-100 p-4">
          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-3">
            Implied valuation range by method
          </div>
          <div className="space-y-2">
            {valuations.models
              .filter((m) => m.impliedValueBase != null)
              .map((m) => (
                <div key={m.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4 text-xs text-slate-700 truncate">
                    {m.label || VALUATION_METHOD_LABELS[m.methodType] || m.methodType}
                  </div>
                  <div className="col-span-6">
                    <ValuationRangeBar
                      entry={m}
                      minLow={stats.low as number}
                      maxHigh={stats.high as number}
                      currency={currency}
                    />
                  </div>
                  <div className="col-span-2 text-right text-[11px] font-semibold text-slate-800">
                    {formatNumber(m.impliedValueBase, currency)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {valuations.models.map((m) => {
          const isOpen = expandedIds.has(m.id);
          return (
            <div
              key={m.id}
              className="rounded-xl border border-slate-100 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggle(m.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">
                      {m.label ||
                        VALUATION_METHOD_LABELS[m.methodType] ||
                        m.methodType}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-semibold text-slate-600">
                      {VALUATION_METHOD_LABELS[m.methodType] || m.methodType}
                    </span>
                    {m.weight && m.weight !== 1 && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-700">
                        weight {m.weight}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {m.impliedValueBase != null
                      ? `Implied ${formatNumber(
                          m.impliedValueBase,
                          currency
                        )} (${formatNumber(
                          m.impliedValueLow,
                          currency
                        )} – ${formatNumber(m.impliedValueHigh, currency)})`
                      : "Implied value pending"}
                  </div>
                  {m.impliedValueBase != null && shares != null && (
                    <div className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                      Fair value / share:{" "}
                      {perShare(toCrores(m.impliedValueBase))}
                      {m.impliedValueLow != null && m.impliedValueHigh != null && (
                        <span className="text-slate-500 font-normal">
                          {" "}
                          ({perShare(toCrores(m.impliedValueLow))} –{" "}
                          {perShare(toCrores(m.impliedValueHigh))})
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 text-slate-500 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {isOpen && (
                <div className="p-4 bg-white">
                  <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-2">
                    Inputs & assumptions
                  </h3>
                  <PayloadTable payload={m.payload} currency={currency} />
                  {m.notes && (
                    <div className="mt-4">
                      <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-2">
                        Notes
                      </h3>
                      <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                        <Markdown>{m.notes}</Markdown>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
