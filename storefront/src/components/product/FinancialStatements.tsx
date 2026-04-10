"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import {
  getSnapshot,
  type StatementsSnapshot,
  type StatementKey,
  type StatementRow,
} from "@/lib/snapshot";
import { DEFAULT_HINT, formatValueWithHint, labelFor } from "@/lib/valueInFormat";
import { useCurrency } from "@/components/CurrencyContext";

type Mode = "yearly" | "quarterly";

const STATEMENT_LABELS: Record<StatementKey, string> = {
  pnl: "Profit & Loss",
  balance_sheet: "Balance Sheet",
  cashflow: "Cash Flow",
  change_in_equity: "SOCIE",
  ratios_valuations: "Financial Ratios",
  auxiliary_data: "Auxiliary Data",
  derived: "Ratios",
};

const STATEMENT_ORDER: StatementKey[] = ["pnl", "balance_sheet", "cashflow", "change_in_equity", "ratios_valuations"];

// Top 25 standard financial ratios to display in the Financial Ratios tab,
// selected across liquidity, leverage, profitability, efficiency, valuation,
// and per-share categories.
const TOP_25_RATIO_CODES = new Set([
  // Liquidity (4)
  "current_ratio", "quick_ratio", "cash_ratio", "interest_coverage",
  // Leverage (4)
  "debt_to_equity", "debt_to_assets", "debt_to_ebitda", "net_debt_to_equity",
  // Profitability (7)
  "gross_margin", "ebitda_margin", "net_margin", "roa", "roe", "roce", "roic",
  // Efficiency (4)
  "asset_turnover", "inventory_turnover", "receivables_turnover", "cash_conversion_cycle",
  // Valuation (5)
  "pe_ratio", "pb_ratio", "ev_to_ebitda", "ev_to_sales", "fcf_yield",
  // Per-share (1)
  "eps_basic",
]);

function filterTop25Ratios(rows: StatementRow[]): StatementRow[] {
  const result: StatementRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.depth === 0) {
      // Include section header only if it has at least one child in the top-25
      let hasChild = false;
      for (let j = i + 1; j < rows.length; j++) {
        if (rows[j].depth === 0) break;
        if (TOP_25_RATIO_CODES.has(rows[j].code)) { hasChild = true; break; }
      }
      if (hasChild) result.push(row);
    } else if (TOP_25_RATIO_CODES.has(row.code)) {
      result.push(row);
    }
  }
  return result;
}

// formatValue has been replaced by formatValueWithHint (from @/lib/valueInFormat),
// which honors the snapshot's per-statement displayHint and per-line-item
// unit/percent/per-share semantics.

type Props = {
  isin: string;
};

export function FinancialStatements({ isin }: Props) {
  const { symbol: userSymbol } = useCurrency();
  const [snapshot, setSnapshot] = useState<StatementsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("yearly");
  const [statement, setStatement] = useState<StatementKey>("pnl");
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  // Year filter state:
  //   null           → "show all" (default)
  //   Set (size > 0) → user-picked subset
  //   Set (size = 0) → user explicitly cleared (Clear button)
  // We DON'T reset this on isin/mode change via a useEffect. Instead the
  // derived `projectedSelectedYears` below filters out years that don't
  // exist in the current view, so switching companies or Yearly↔Quarterly
  // automatically adapts without a cascading render.
  const [selectedYears, setSelectedYears] = useState<Set<number> | null>(null);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const yearPickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getSnapshot(isin, "statements")
      .then((bundle) => {
        if (cancelled) return;
        setSnapshot(bundle.statements);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Failed to load financials");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isin]);

  // Close the year picker on outside click / Escape.
  useEffect(() => {
    if (!yearPickerOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!yearPickerRef.current) return;
      if (!yearPickerRef.current.contains(e.target as Node)) setYearPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setYearPickerOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [yearPickerOpen]);

  // Available fiscal years in the current mode, deduped and sorted DESC
  // (most recent first — the order users care about).
  const availableYears = useMemo(() => {
    if (!snapshot) return [] as number[];
    const years = new Set<number>();
    for (const p of snapshot[mode].periods) years.add(p.fiscalYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [snapshot, mode]);

  // Derived view of `selectedYears` that only contains years actually present
  // in the current mode. Meaning:
  //   - null          → show all (default)
  //   - empty set     → user explicitly cleared ("no years selected")
  //   - non-empty set → those years, filtered to only the valid ones
  // If the user had a selection and none of those years exist in the new
  // mode/isin, we fall back to "show all" so the user is never stuck on an
  // empty table after switching deals.
  const projectedSelectedYears = useMemo<Set<number> | null>(() => {
    if (selectedYears === null) return null;
    if (selectedYears.size === 0) return selectedYears; // explicit Clear
    const availableSet = new Set(availableYears);
    const valid = new Set<number>();
    for (const y of selectedYears) if (availableSet.has(y)) valid.add(y);
    return valid.size > 0 ? valid : null;
  }, [selectedYears, availableYears]);

  // Indices (into the unfiltered `group.periods` array) that survive the
  // year filter. Used both to slice period headers AND to project each row's
  // values[] array — the two must stay aligned.
  const visiblePeriodIndices = useMemo(() => {
    if (!snapshot) return [] as number[];
    const periods = snapshot[mode].periods;
    if (!projectedSelectedYears || projectedSelectedYears.size === 0) {
      return projectedSelectedYears?.size === 0 ? [] : periods.map((_, i) => i);
    }
    const out: number[] = [];
    for (let i = 0; i < periods.length; i++) {
      if (projectedSelectedYears.has(periods[i].fiscalYear)) out.push(i);
    }
    return out;
  }, [snapshot, mode, projectedSelectedYears]);

  // For each row, list its DIRECT child indices that are themselves leaves
  // (rows with no children). Only rows that own at least one such leaf become
  // collapsible. Sub-parents (e.g. Revenue under P&L) never get collapsed —
  // only the leaf line items beneath them do.
  const rowsForMemo: StatementRow[] = useMemo(() => {
    if (!snapshot) return [];
    const rows = snapshot[mode].statements[statement]?.rows ?? [];
    return statement === "ratios_valuations" ? filterTop25Ratios(rows) : rows;
  }, [snapshot, mode, statement]);
  const displayHint = useMemo(
    () => snapshot?.[mode].statements[statement]?.displayHint ?? DEFAULT_HINT,
    [snapshot, mode, statement]
  );
  const directLeafChildren = useMemo(() => {
    const map = new Map<number, number[]>();
    const rows = rowsForMemo;
    const isLeaf = (i: number) => {
      const next = rows[i + 1];
      return !next || next.depth <= rows[i].depth;
    };
    for (let i = 0; i < rows.length; i++) {
      const parentDepth = rows[i].depth;
      const leaves: number[] = [];
      for (let j = i + 1; j < rows.length; j++) {
        if (rows[j].depth <= parentDepth) break; // out of i's subtree
        if (rows[j].depth === parentDepth + 1 && isLeaf(j)) {
          leaves.push(j);
        }
      }
      if (leaves.length > 0) map.set(i, leaves);
    }
    return map;
  }, [rowsForMemo]);

  // Default state: for most statements, collapse every parent that owns
  // leaf children so the initial render shows only section headers. The
  // Financial Ratios tab is the exception — ratios are the whole point of
  // the tab so every category is expanded by default. Re-runs whenever
  // the rows change (mode / statement / isin switch).
  useEffect(() => {
    if (statement === "ratios_valuations") {
      setCollapsed(new Set());
    } else {
      setCollapsed(new Set(directLeafChildren.keys()));
    }
  }, [directLeafChildren, statement]);

  const hiddenRowIdx = useMemo(() => {
    const hidden = new Set<number>();
    for (const parentIdx of collapsed) {
      const kids = directLeafChildren.get(parentIdx) || [];
      for (const k of kids) hidden.add(k);
    }
    return hidden;
  }, [collapsed, directLeafChildren]);

  // Project periods + each row's values through the year filter so the
  // table stays aligned. Index-parallel: periods[i] ↔ row.values[i].
  // IMPORTANT: these useMemo calls must come BEFORE any early return —
  // React's Rules of Hooks require the same hooks to run in the same
  // order on every render. Guard against `snapshot` being null so they
  // can run during the loading phase.
  const periods = useMemo(() => {
    if (!snapshot) return [];
    const all = snapshot[mode].periods;
    return visiblePeriodIndices.map((i) => all[i]);
  }, [snapshot, mode, visiblePeriodIndices]);

  // Only show tabs whose statement block exists and has at least one row.
  const visibleStatements = useMemo(() => {
    if (!snapshot) return STATEMENT_ORDER;
    return STATEMENT_ORDER.filter((s) => {
      const rows = snapshot[mode].statements[s]?.rows ?? [];
      return rows.length > 0;
    });
  }, [snapshot, mode]);

  // If the active tab is no longer present (e.g. switching ISIN), reset to first.
  useEffect(() => {
    if (!visibleStatements.includes(statement)) {
      setStatement(visibleStatements[0] ?? "pnl");
    }
  }, [visibleStatements, statement]);

  const projectedRows = useMemo(() => {
    return rowsForMemo.map((row) => ({
      ...row,
      values: visiblePeriodIndices.map((i) => row.values[i] ?? null),
    }));
  }, [rowsForMemo, visiblePeriodIndices]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="h-6 w-40 bg-slate-100 rounded mb-3 animate-pulse" />
        <div className="h-[400px] bg-slate-50 rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <p className="text-sm text-slate-500">Financial statements not available: {error}</p>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <p className="text-sm text-slate-500">Financial statements not cached yet.</p>
      </div>
    );
  }

  const hasData = periods.length > 0 && projectedRows.length > 0;

  const toggle = (parentIdx: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(parentIdx)) next.delete(parentIdx);
      else next.add(parentIdx);
      return next;
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <h3 className="text-xl font-bold text-slate-900">Financial Statements</h3>
        <div className="flex items-center gap-2">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            className="px-3 py-1.5 text-sm font-bold rounded-lg border border-slate-200 bg-white text-slate-700"
          >
            <option value="yearly">Yearly</option>
            <option value="quarterly">Quarterly</option>
          </select>
          {availableYears.length > 0 && (
            <div className="relative" ref={yearPickerRef}>
              <button
                type="button"
                onClick={() => setYearPickerOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={yearPickerOpen}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span>
                  Years:&nbsp;
                  {projectedSelectedYears === null
                    ? `All (${availableYears.length})`
                    : projectedSelectedYears.size === 0
                      ? "None"
                      : projectedSelectedYears.size === availableYears.length
                        ? `All (${availableYears.length})`
                        : `${projectedSelectedYears.size} of ${availableYears.length}`}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>
              {yearPickerOpen && (
                <div
                  role="listbox"
                  className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg p-2 max-h-80 overflow-y-auto"
                >
                  <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-b border-slate-100 mb-1">
                    <button
                      type="button"
                      onClick={() => setSelectedYears(null)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedYears(new Set())}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700"
                    >
                      Clear
                    </button>
                  </div>
                  {availableYears.map((year) => {
                    const isSelected =
                      projectedSelectedYears === null
                        ? true
                        : projectedSelectedYears.has(year);
                    return (
                      <label
                        key={year}
                        className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedYears((prev) => {
                              // Going from "all" (null) to an explicit set:
                              // start with all years then toggle off this one.
                              const base =
                                prev && prev.size > 0
                                  ? new Set(prev)
                                  : new Set(availableYears);
                              if (base.has(year)) base.delete(year);
                              else base.add(year);
                              return base;
                            });
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-bold text-slate-700">{year}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {directLeafChildren.size > 0 && (() => {
            const allExpanded = collapsed.size === 0;
            return (
              <button
                type="button"
                onClick={() =>
                  setCollapsed(allExpanded ? new Set(directLeafChildren.keys()) : new Set())
                }
                className="px-3 py-1.5 text-sm font-bold rounded-lg border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                {allExpanded ? "Collapse all" : "Expand all"}
              </button>
            );
          })()}
        </div>
      </div>

      <div className="flex gap-2 mb-4 border-b border-slate-100">
        {visibleStatements.map((s) => (
          <button
            key={s}
            onClick={() => setStatement(s)}
            className={`px-4 py-2 text-sm font-bold -mb-px border-b-2 transition-colors ${
              statement === s
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {STATEMENT_LABELS[s]}
          </button>
        ))}
      </div>

      {!hasData ? (
        <p className="text-sm text-slate-500 py-12 text-center">
          {projectedSelectedYears && projectedSelectedYears.size === 0
            ? "No years selected — pick at least one from the Years dropdown above."
            : `No ${mode} ${STATEMENT_LABELS[statement].toLowerCase()} data yet.`}
        </p>
      ) : (
        <div className="-mx-6 px-6 overflow-x-auto">
          <div className="flex items-center justify-end pb-2 pr-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {labelFor(displayHint, userSymbol)}
            </span>
          </div>
          <table className="min-w-full w-max text-sm">
            <thead className="border-b border-slate-100">
              <tr>
                <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider py-2 pr-4 sticky left-0 bg-white z-10 min-w-[14rem]">
                  Line Item
                </th>
                {periods.map((p) => (
                  <th
                    key={p.id}
                    className="text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider py-2 px-3 whitespace-nowrap"
                  >
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projectedRows.map((row, idx) => {
                if (hiddenRowIdx.has(idx)) return null;
                const isParent = (directLeafChildren.get(idx)?.length ?? 0) > 0;
                const isCollapsed = collapsed.has(idx);
                return (
                  <tr key={row.lineItemId} className="border-b border-slate-50 last:border-b-0">
                    <td
                      className={`py-2 pr-4 sticky left-0 bg-white z-10 min-w-[14rem] whitespace-nowrap ${
                        row.isCalculated ? "font-bold text-slate-900" : "text-slate-700"
                      }`}
                      style={{ paddingLeft: `${8 + row.depth * 14}px` }}
                    >
                      {isParent ? (
                        <button
                          type="button"
                          onClick={() => toggle(idx)}
                          className="flex items-center gap-1.5 text-left hover:text-emerald-700 transition-colors"
                          aria-expanded={!isCollapsed}
                        >
                          <ChevronRight
                            className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                              isCollapsed ? "" : "rotate-90"
                            }`}
                          />
                          <span>{row.name}</span>
                        </button>
                      ) : (
                        row.name
                      )}
                    </td>
                    {row.values.map((v, i) => {
                      // In the Financial Ratios tab, category parent rows
                      // (Liquidity / Leverage / Profitability / …) have no
                      // meaningful numeric value — they're pure headers.
                      // Suppress the em-dash placeholder for those rows so
                      // the category headers read cleanly.
                      const suppressValue =
                        statement === "ratios_valuations" && isParent;
                      return (
                        <td
                          key={`${row.lineItemId}:${i}`}
                          className={`text-right py-2 px-3 tabular-nums whitespace-nowrap ${
                            row.isCalculated ? "font-bold text-slate-900" : "text-slate-700"
                          }`}
                        >
                          {suppressValue
                            ? ""
                            : formatValueWithHint(v, row.code, displayHint)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10px] text-slate-400 mt-4">
        Values in {snapshot.currency}. Toggle Yearly/Quarterly above. Data cached from Calcula.
      </p>
    </div>
  );
}
