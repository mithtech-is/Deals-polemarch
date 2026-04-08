"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";
import { getSnapshot, type PriceSnapshot, type PriceEvent } from "@/lib/snapshot";

// ECharts tree-shaken: import only the components we actually use. Cuts
// the chunk from ~1.3 MB down to ~400 KB and reduces mobile TTI.
const ReactECharts = dynamic(
  async () => {
    const [{ default: ReactEChartsCore }, echarts, charts, components, renderers] =
      await Promise.all([
        import("echarts-for-react/lib/core"),
        import("echarts/core"),
        import("echarts/charts"),
        import("echarts/components"),
        import("echarts/renderers"),
      ]);
    echarts.use([
      charts.LineChart,
      components.GridComponent,
      components.TooltipComponent,
      components.DataZoomComponent,
      components.MarkPointComponent,
      components.MarkLineComponent,
      components.AxisPointerComponent,
      renderers.CanvasRenderer,
    ]);
    return function Wrapped(props: any) {
      return <ReactEChartsCore echarts={echarts} {...props} />;
    };
  },
  { ssr: false }
);

type RangeKey = "1M" | "6M" | "1Y" | "3Y" | "5Y" | "MAX" | "CUSTOM";
type PresetRangeKey = Exclude<RangeKey, "CUSTOM">;

const RANGE_MS: Record<Exclude<PresetRangeKey, "MAX">, number> = {
  "1M": 30 * 24 * 3600 * 1000,
  "6M": 182 * 24 * 3600 * 1000,
  "1Y": 365 * 24 * 3600 * 1000,
  "3Y": 3 * 365 * 24 * 3600 * 1000,
  "5Y": 5 * 365 * 24 * 3600 * 1000,
};

// Colour per event category. Keep in sync with the admin UI palette in
// calcula/apps/frontend/components/admin/price-history-section.tsx.
const CATEGORY_COLOR: Record<"C" | "N" | "R" | "UNTAGGED", string> = {
  C: "#059669", // emerald — corporate events
  N: "#d97706", // amber — news
  R: "#e11d48", // rose — regulatory
  UNTAGGED: "#64748b", // slate — legacy events with no category
};

const CATEGORY_LABEL: Record<"C" | "N" | "R", string> = {
  C: "Corporate",
  N: "News",
  R: "Regulatory",
};

function formatDate(ms: number) {
  const d = new Date(ms);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function computeRangeBounds(
  points: [number, number][],
  range: RangeKey,
  customRange: [number, number] | null
): { startMs: number; endMs: number } | null {
  if (!points.length) return null;
  if (range === "CUSTOM") {
    if (!customRange) return null;
    const [startMs, endMs] = customRange;
    return { startMs, endMs };
  }
  const endMs = points[points.length - 1][0];
  if (range === "MAX") return { startMs: points[0][0], endMs };
  const startMs = Math.max(points[0][0], endMs - RANGE_MS[range]);
  return { startMs, endMs };
}

function findFirstPointAtOrAfter(points: [number, number][], ms: number): [number, number] | null {
  for (const p of points) {
    if (p[0] >= ms) return p;
  }
  return null;
}

/** Format a timestamp as YYYY-MM-DD (UTC). Used by the date picker. */
function toIsoDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD (local-date from <input type="date">) as midnight UTC. */
function fromIsoDate(s: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const ms = Date.parse(`${s}T00:00:00.000Z`);
  return Number.isFinite(ms) ? ms : null;
}

type Props = {
  isin: string;
};

export function PriceChart({ isin }: Props) {
  const [snapshot, setSnapshot] = useState<PriceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("MAX");
  // Custom date range: [startMs, endMs] in UTC. Only used when range === "CUSTOM".
  const [customRange, setCustomRange] = useState<[number, number] | null>(null);
  const [customPickerOpen, setCustomPickerOpen] = useState(false);
  const customPickerRef = useRef<HTMLDivElement | null>(null);
  // Category filter — which event kinds are visible on the chart. Keyed by
  // the PriceEventCategory literals plus "UNTAGGED" for legacy events
  // that pre-date the tag rollout. All four on by default.
  const [visibleCategories, setVisibleCategories] = useState<Set<"C" | "N" | "R" | "UNTAGGED">>(
    () => new Set(["C", "N", "R", "UNTAGGED"])
  );
  const [pinned, setPinned] = useState<{ ev: PriceEvent; x: number; y: number } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverLeft, setPopoverLeft] = useState<number>(0);

  // Lock body scroll while expanded; close with Escape
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  // Close the custom-range picker on outside click / Escape.
  useEffect(() => {
    if (!customPickerOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (customPickerRef.current?.contains(e.target as Node)) return;
      setCustomPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCustomPickerOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [customPickerOpen]);

  // Clear pinned event when range / isin changes
  useEffect(() => {
    setPinned(null);
  }, [range, isin]);

  // Clamp popover x so it stays within the chart container
  useEffect(() => {
    if (!pinned || !wrapperRef.current || !popoverRef.current) return;
    const wrapW = wrapperRef.current.clientWidth;
    const popW = popoverRef.current.offsetWidth;
    const margin = 12;
    let left = pinned.x - popW / 2;
    if (left < margin) left = margin;
    if (left + popW > wrapW - margin) left = wrapW - margin - popW;
    setPopoverLeft(left);
  }, [pinned]);

  // Dismiss pinned popover on outside click
  useEffect(() => {
    if (!pinned) return;
    const onDocClick = (e: MouseEvent) => {
      if (popoverRef.current?.contains(e.target as Node)) return;
      // Don't dismiss when clicking on a marker (chart click handler will swap)
      const wrap = wrapperRef.current;
      if (wrap && wrap.contains(e.target as Node)) {
        // ignore — chart click handler manages its own state
        return;
      }
      setPinned(null);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [pinned]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getSnapshot(isin, "prices")
      .then((bundle) => {
        if (cancelled) return;
        setSnapshot(bundle.prices);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Failed to load price history");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isin]);

  // Full price series — no downsampling.
  const chartPoints = useMemo(() => {
    if (!snapshot) return [] as [number, number][];
    return snapshot.prices;
  }, [snapshot]);

  // Header: current price + absolute/percent change over the selected range
  const header = useMemo(() => {
    if (!snapshot || chartPoints.length === 0) return null;
    const last = chartPoints[chartPoints.length - 1];
    const bounds = computeRangeBounds(chartPoints, range, customRange);
    if (!bounds) return null;
    const first = findFirstPointAtOrAfter(chartPoints, bounds.startMs);
    if (!first) {
      return { last, change: 0, changePct: 0 };
    }
    const change = last[1] - first[1];
    const changePct = first[1] !== 0 ? (change / first[1]) * 100 : 0;
    return { last, change, changePct };
  }, [snapshot, chartPoints, range, customRange]);

  // Build ECharts option
  const option = useMemo(() => {
    if (!snapshot) return null;
    const bounds = computeRangeBounds(chartPoints, range, customRange);
    if (!bounds) return null;

    // Pin markers for events — one per event, anchored by timestamp.
    // Colour + letter come from the event's `category`; untagged legacy
    // events get the slate "UNTAGGED" style. Events whose category bucket
    // is toggled off in the filter pills are dropped entirely.
    const markData = snapshot.events
      .filter((e) => {
        const bucket = e.category ?? "UNTAGGED";
        return visibleCategories.has(bucket as "C" | "N" | "R" | "UNTAGGED");
      })
      .map((e) => {
        const bucket = (e.category ?? "UNTAGGED") as "C" | "N" | "R" | "UNTAGGED";
        const color = CATEGORY_COLOR[bucket];
        // Single-letter label inside the marker circle. "•" is used for
        // untagged so the letter doesn't visually clash with "C/N/R".
        const label = bucket === "UNTAGGED" ? "•" : bucket;
        return {
          name: "event",
          coord: [new Date(e.datetime).getTime(), e.price],
          symbol: "circle",
          symbolSize: 22,
          itemStyle: {
            color,
            borderColor: "#ffffff",
            borderWidth: 2,
            shadowBlur: 4,
            shadowColor: "rgba(0,0,0,0.2)",
          },
          label: {
            show: true,
            formatter: label,
            color: "#ffffff",
            fontWeight: "bold" as const,
            fontSize: 12,
          },
          // Attach raw event for the tooltip formatter
          _event: e,
        };
      });

    return {
      animation: false,
      grid: { left: 48, right: 24, top: 16, bottom: 72 },
      xAxis: {
        type: "time" as const,
        boundaryGap: false,
        axisLine: { lineStyle: { color: "#cbd5e1" } },
        axisLabel: { color: "#64748b" },
      },
      yAxis: {
        type: "value" as const,
        scale: true,
        splitLine: { lineStyle: { color: "#e2e8f0" } },
        axisLabel: { color: "#64748b" },
      },
      tooltip: {
        trigger: "axis" as const,
        confine: true,
        axisPointer: {
          type: "cross" as const,
          snap: true,
          lineStyle: { color: "#165DFF" },
          crossStyle: { color: "#165DFF" },
          label: { backgroundColor: "#1e293b" },
        },
        backgroundColor: "rgba(30, 41, 59, 0.95)",
        borderWidth: 0,
        padding: 12,
        textStyle: { color: "#ffffff", fontSize: 13 },
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params];
          const first = arr[0] as { data: [number, number]; marker?: string; seriesName?: string };
          if (!first || !first.data) return "";
          const [ts, price] = first.data;
          const datetime = formatDate(ts);
          // Check if this point is an event (and visible per filter)
          const ev = snapshot.events.find((e) => {
            if (Math.abs(new Date(e.datetime).getTime() - ts) >= 60_000) return false;
            const bucket = (e.category ?? "UNTAGGED") as "C" | "N" | "R" | "UNTAGGED";
            return visibleCategories.has(bucket);
          });
          if (ev) {
            const categoryHtml = ev.category
              ? `<div style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:6px;background:${CATEGORY_COLOR[ev.category]};color:#fff;font-size:11px;font-weight:700">${ev.category} · ${CATEGORY_LABEL[ev.category]}</div>`
              : "";
            const linkHtml = ev.link
              ? `<div style="margin-top:6px"><a href="${ev.link}" target="_blank" rel="noopener noreferrer" style="color:#60a5fa;text-decoration:underline">View details →</a></div>`
              : "";
            const noteHtml = ev.note
              ? `<div style="margin-top:6px;max-width:280px;font-size:12px;line-height:1.4">${ev.note}</div>`
              : "";
            return `<div><div style="font-weight:600">${datetime}</div><div>Price: ${price.toFixed(2)}</div>${categoryHtml}${noteHtml}${linkHtml}</div>`;
          }
          return `<div><div style="font-weight:600">${datetime}</div><div>Price: ${price.toFixed(2)}</div></div>`;
        },
      },
      dataZoom: [
        {
          type: "inside" as const,
          startValue: bounds.startMs,
          endValue: bounds.endMs,
          zoomLock: false,
        },
        {
          type: "slider" as const,
          height: 28,
          bottom: 16,
          startValue: bounds.startMs,
          endValue: bounds.endMs,
          borderColor: "transparent",
          backgroundColor: "#f1f5f9",
          fillerColor: "rgba(22, 93, 255, 0.15)",
          handleStyle: { color: "#3b82f6" },
          moveHandleStyle: { color: "#cbd5e1" },
          textStyle: { color: "#64748b" },
        },
      ],
      series: [
        {
          name: "Price",
          type: "line" as const,
          symbol: "none",
          sampling: "lttb" as const,
          smooth: false,
          lineStyle: { width: 2, color: "#059669" },
          itemStyle: { color: "#059669" },
          data: chartPoints,
          markPoint: markData.length
            ? {
                symbol: "circle",
                data: markData,
                silent: false,
              }
            : undefined,
        },
      ],
    };
  }, [snapshot, chartPoints, range, customRange, visibleCategories]);

  // Empty / loading / error states
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="h-8 w-32 bg-slate-100 rounded mb-3 animate-pulse" />
        <div className="h-[440px] bg-slate-50 rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <p className="text-sm text-slate-500">Price history not available: {error}</p>
      </div>
    );
  }

  if (!snapshot || snapshot.prices.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <p className="text-sm text-slate-500">No price history yet for this share.</p>
      </div>
    );
  }

  const chartHeight = expanded
    ? Math.max(360, (typeof window !== "undefined" ? window.innerHeight : 800) - 220)
    : 480;

  const body = (
    <>
      {header && (
        <div className="flex items-baseline gap-3 mb-2 pr-12">
          <span className="text-3xl font-extrabold text-slate-900">
            ₹ {header.last[1].toFixed(2)}
          </span>
          <span
            className={`text-sm font-bold ${header.change < 0 ? "text-red-600" : "text-emerald-600"}`}
          >
            ({header.change >= 0 ? "+" : ""}
            {header.change.toFixed(2)}) ({header.change >= 0 ? "+" : ""}
            {header.changePct.toFixed(2)}%)
          </span>
          <span className="text-sm text-slate-400 font-medium">{range}</span>
        </div>
      )}

      {option && (
        <div ref={wrapperRef} className="relative">
          <ReactECharts
            option={option}
            notMerge={true}
            lazyUpdate={true}
            style={{ height: chartHeight }}
            onEvents={{
              click: (params: any) => {
                if (params?.componentType !== "markPoint") return;
                const ev: PriceEvent | undefined = params?.data?._event;
                if (!ev) return;
                const wrap = wrapperRef.current;
                if (!wrap) return;
                // params.event.event is the native MouseEvent; offsetX/Y is
                // relative to the chart canvas, which is the same coord
                // system as wrapperRef since the chart fills it.
                const native = params?.event?.event as MouseEvent | undefined;
                const x = native?.offsetX ?? wrap.clientWidth / 2;
                const y = native?.offsetY ?? 60;
                setPinned({ ev, x, y });
              },
            }}
          />
          {pinned && (
            <div
              ref={popoverRef}
              className="absolute z-20 max-w-xs rounded-xl shadow-xl text-white"
              style={{
                left: popoverLeft,
                top: Math.max(8, pinned.y - 12),
                background: "rgba(30, 41, 59, 0.97)",
                padding: 14,
                pointerEvents: "auto",
              }}
            >
              <button
                type="button"
                onClick={() => setPinned(null)}
                className="absolute top-2 right-2 text-slate-300 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="font-semibold pr-5">{formatDate(new Date(pinned.ev.datetime).getTime())}</div>
              <div className="text-sm mt-0.5">Price: {pinned.ev.price.toFixed(2)}</div>
              {pinned.ev.note && (
                <div className="text-xs leading-snug mt-2">{pinned.ev.note}</div>
              )}
              {pinned.ev.link && (
                <div className="mt-2">
                  <a
                    href={pinned.ev.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 underline text-xs"
                  >
                    View details →
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {(["1M", "6M", "1Y", "3Y", "5Y", "MAX"] as PresetRangeKey[]).map((r) => (
            <button
              key={r}
              onClick={() => {
                setRange(r);
                setCustomPickerOpen(false);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                r === range
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              }`}
            >
              {r}
            </button>
          ))}

          {/* Custom range */}
          <div className="relative" ref={customPickerRef}>
            <button
              type="button"
              onClick={() => setCustomPickerOpen((v) => !v)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                range === "CUSTOM"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              }`}
            >
              {range === "CUSTOM" && customRange
                ? `${toIsoDate(customRange[0])} → ${toIsoDate(customRange[1])}`
                : "Custom"}
            </button>
            {customPickerOpen && snapshot && snapshot.prices.length > 0 && (
              <CustomRangePopover
                minMs={snapshot.prices[0][0]}
                maxMs={snapshot.prices[snapshot.prices.length - 1][0]}
                current={customRange}
                onApply={(next) => {
                  setCustomRange(next);
                  setRange("CUSTOM");
                  setCustomPickerOpen(false);
                }}
                onClose={() => setCustomPickerOpen(false)}
              />
            )}
          </div>

        </div>

        {snapshot && snapshot.events.length > 0 && (
          <CategoryFilterPills
            events={snapshot.events}
            visible={visibleCategories}
            setVisible={setVisibleCategories}
          />
        )}
      </div>
    </>
  );

  const expandButton = (
    <button
      type="button"
      onClick={() => setExpanded((e) => !e)}
      aria-label={expanded ? "Collapse chart" : "Expand chart"}
      className="absolute top-4 right-4 z-10 h-9 w-9 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
    >
      {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
    </button>
  );

  if (expanded) {
    return (
      <div
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
        onClick={(e) => {
          if (e.target === e.currentTarget) setExpanded(false);
        }}
      >
        <div className="relative bg-white rounded-2xl border border-slate-100 p-6 shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
          {expandButton}
          {body}
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      {expandButton}
      {body}
    </div>
  );
}

// ── Category filter pills ────────────────────────────────────────
//
// Small toggle buttons above the chart, one per category that's actually
// present in the snapshot's events. Clicking removes that bucket from the
// `visible` set, hiding those markers on the chart and in tooltips.
// Counts are shown inline so the user can see how many events they're
// about to hide.
function CategoryFilterPills({
  events,
  visible,
  setVisible,
}: {
  events: PriceEvent[];
  visible: Set<"C" | "N" | "R" | "UNTAGGED">;
  setVisible: (v: Set<"C" | "N" | "R" | "UNTAGGED">) => void;
}) {
  // Bucket counts. Only render pills for buckets that have at least one event.
  const counts: Record<"C" | "N" | "R" | "UNTAGGED", number> = {
    C: 0,
    N: 0,
    R: 0,
    UNTAGGED: 0,
  };
  for (const e of events) {
    const bucket = (e.category ?? "UNTAGGED") as "C" | "N" | "R" | "UNTAGGED";
    counts[bucket] += 1;
  }

  const buckets: Array<{
    key: "C" | "N" | "R" | "UNTAGGED";
    label: string;
  }> = [
    { key: "C", label: "Corporate" },
    { key: "N", label: "News" },
    { key: "R", label: "Regulatory" },
    { key: "UNTAGGED", label: "Untagged" },
  ];

  const toggle = (key: "C" | "N" | "R" | "UNTAGGED") => {
    const next = new Set(visible);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setVisible(next);
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {buckets
        .filter((b) => counts[b.key] > 0)
        .map((b) => {
          const isOn = visible.has(b.key);
          const color = CATEGORY_COLOR[b.key];
          return (
            <button
              key={b.key}
              type="button"
              onClick={() => toggle(b.key)}
              aria-pressed={isOn}
              title={`${b.label} (${counts[b.key]} event${counts[b.key] === 1 ? "" : "s"})`}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border transition-colors ${
                isOn
                  ? "border-slate-200 bg-white text-slate-700"
                  : "border-slate-100 bg-slate-50 text-slate-400 line-through"
              }`}
            >
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: color, opacity: isOn ? 1 : 0.3 }}
              />
              <span>
                {b.key === "UNTAGGED" ? "•" : b.key}
              </span>
              <span className="text-slate-500 font-normal">{counts[b.key]}</span>
            </button>
          );
        })}
    </div>
  );
}

// ── Custom date range popover ────────────────────────────────────
//
// Small popover with two <input type="date"> fields and an Apply button.
// Start/end are clamped to the snapshot's min/max so the user can't pick
// a window that has no data at all. Dates are treated as UTC to match
// the rest of the pipeline.
function CustomRangePopover({
  minMs,
  maxMs,
  current,
  onApply,
  onClose,
}: {
  minMs: number;
  maxMs: number;
  current: [number, number] | null;
  onApply: (next: [number, number]) => void;
  onClose: () => void;
}) {
  const [startStr, setStartStr] = useState<string>(() =>
    toIsoDate(current ? current[0] : minMs)
  );
  const [endStr, setEndStr] = useState<string>(() =>
    toIsoDate(current ? current[1] : maxMs)
  );
  const [err, setErr] = useState<string | null>(null);

  const apply = () => {
    const startMs = fromIsoDate(startStr);
    const endMs = fromIsoDate(endStr);
    if (startMs === null || endMs === null) {
      setErr("Pick valid dates");
      return;
    }
    if (startMs > endMs) {
      setErr("Start must be before end");
      return;
    }
    // Clamp to the snapshot bounds so the chart never zooms outside data.
    const clampedStart = Math.max(minMs, startMs);
    // Add a day so the end date is inclusive (user picks "Apr 10" →
    // include everything on Apr 10 up to 23:59:59).
    const clampedEnd = Math.min(maxMs, endMs + 86_400_000 - 1);
    if (clampedStart >= clampedEnd) {
      setErr("Range is outside the available data");
      return;
    }
    onApply([clampedStart, clampedEnd]);
  };

  const minDate = toIsoDate(minMs);
  const maxDate = toIsoDate(maxMs);

  return (
    <div
      role="dialog"
      className="absolute left-0 top-full mt-2 z-20 w-72 rounded-xl border border-slate-200 bg-white shadow-lg p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-slate-900">Custom range</h4>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-500">
          From
          <input
            type="date"
            value={startStr}
            min={minDate}
            max={maxDate}
            onChange={(e) => {
              setStartStr(e.target.value);
              setErr(null);
            }}
            className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </label>
        <label className="block text-xs font-bold text-slate-500">
          To
          <input
            type="date"
            value={endStr}
            min={minDate}
            max={maxDate}
            onChange={(e) => {
              setEndStr(e.target.value);
              setErr(null);
            }}
            className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </label>
      </div>
      {err && <p className="text-xs text-rose-600 mt-2">{err}</p>}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <p className="text-[10px] text-slate-400">
          Data: {minDate} → {maxDate}
        </p>
        <button
          type="button"
          onClick={apply}
          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
