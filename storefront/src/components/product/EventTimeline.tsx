"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { getSnapshot, type NewsEventItem, type PriceEventCategory } from "@/lib/snapshot";

const CATEGORY_COLOR: Record<PriceEventCategory, string> = {
  C: "#059669", // emerald — shareholder-facing corporate actions
  E: "#2563eb", // blue    — business events
  N: "#d97706", // amber   — news / commentary
  R: "#e11d48", // rose    — regulatory
};

const CATEGORY_LABEL: Record<PriceEventCategory, string> = {
  C: "Corporate action",
  E: "Business event",
  N: "News",
  R: "Regulatory",
};

// Sentiment colours match the calcula admin editor so the same row looks
// the same on both surfaces. 'B' (neutral / black) is also the fallback
// for null / undefined sentiment values so legacy rows keep rendering in
// slate-900.
const SENTIMENT_TEXT_COLOR: Record<string, string> = {
  G: "#059669",
  R: "#dc2626",
  B: "#0f172a",
};

type Filter = "ALL" | PriceEventCategory;
type MinImpact = 0 | 1 | 2 | 3 | 4 | 5;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function snippet(body: string, max = 220): string {
  const stripped = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/#+\s*/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length <= max) return stripped;
  return stripped.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

type Props = {
  isin: string;
};

/**
 * Vertical event timeline with category filter + per-item Read more toggle.
 * Replaces the separate NewsPanel; this is the single "News & Events" view.
 */
export function EventTimeline({ isin }: Props) {
  const [events, setEvents] = useState<NewsEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [minImpact, setMinImpact] = useState<MinImpact>(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getSnapshot(isin, "news")
      .then((bundle) => {
        if (cancelled) return;
        setEvents(bundle.news?.events ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = (err?.message || "").toLowerCase();
          if (msg.includes("not cached")) {
            setEvents([]);
          } else {
            setError(err?.message ?? "Failed to load news");
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isin]);

  const counts = useMemo(() => {
    const c: Record<PriceEventCategory, number> = { C: 0, E: 0, N: 0, R: 0 };
    for (const e of events) c[e.category] += 1;
    return c;
  }, [events]);

  const filtered = useMemo(() => {
    // Backend returns events newest-first for the admin editor, but on
    // the storefront we want an oldest → newest narrative ("story of the
    // company"): 2015 founding at the top, latest news at the bottom.
    const byCategory =
      filter === "ALL" ? events : events.filter((e) => e.category === filter);
    const byImpact =
      minImpact === 0
        ? byCategory
        : byCategory.filter((e) => (e.impactScore ?? 0) >= minImpact);
    return [...byImpact].sort(
      (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
    );
  }, [events, filter, minImpact]);

  const visible = useMemo(
    () => (showAll ? filtered : filtered.slice(0, 30)),
    [filtered, showAll]
  );

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="h-6 w-32 bg-slate-100 rounded mb-3 animate-pulse" />
        <div className="h-40 bg-slate-50 rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <p className="text-sm text-slate-500">Timeline unavailable: {error}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 mb-2">Timeline</h3>
        <p className="text-sm text-slate-500">
          No news or corporate events posted for this company yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <h3 className="text-xl font-bold text-slate-900">Timeline</h3>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {(["ALL", "C", "E", "N", "R"] as Filter[])
              .filter((f) => f === "ALL" || counts[f] > 0)
              .map((f) => {
                const isOn = filter === f;
                const count = f === "ALL" ? events.length : counts[f];
                const color = f === "ALL" ? "#64748b" : CATEGORY_COLOR[f];
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    aria-pressed={isOn}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border transition-colors ${
                      isOn
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: color }}
                    />
                    <span>{f === "ALL" ? "All" : CATEGORY_LABEL[f]}</span>
                    <span className={isOn ? "text-slate-300" : "text-slate-400"}>
                      {count}
                    </span>
                  </button>
                );
              })}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Impact
            </span>
            {([0, 2, 3, 4, 5] as MinImpact[]).map((min) => {
              const isOn = minImpact === min;
              return (
                <button
                  key={min}
                  type="button"
                  onClick={() => setMinImpact(min)}
                  aria-pressed={isOn}
                  className={`inline-flex items-center px-2.5 py-1 text-[11px] font-bold rounded-full border transition-colors ${
                    isOn
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {min === 0 ? "Any" : `≥ ${min}★`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-slate-500 py-8 text-center">
          No events in this category.
        </p>
      ) : (
        <ol className="relative border-l-2 border-slate-100 ml-2 space-y-5 pl-6">
          {visible.map((e) => {
            const color = CATEGORY_COLOR[e.category];
            const isOpen = expanded.has(e.id);
            const panelId = `timeline-panel-${e.id}`;
            const hasBody = Boolean(e.body && e.body.trim());
            return (
              <li key={e.id} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute -left-[33px] top-0 h-4 w-4 rounded-full border-2 border-white shadow"
                  style={{ background: color }}
                />
                <button
                  type="button"
                  onClick={() => (hasBody || e.sourceUrl) && toggleExpanded(e.id)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="w-full text-left"
                  disabled={!hasBody && !e.sourceUrl}
                >
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <time className="text-xs text-slate-500 font-medium">
                      {formatDate(e.occurredAt)}
                    </time>
                    <span
                      className="inline-block px-1.5 py-0.5 text-[10px] font-bold rounded"
                      style={{ background: color, color: "white" }}
                      title={CATEGORY_LABEL[e.category]}
                    >
                      {e.category}
                    </span>
                    {e.impactScore != null && e.impactScore > 0 && (
                      <span
                        className="text-[10px] font-bold text-amber-500"
                        title={`Impact ${e.impactScore}/5`}
                      >
                        {"★".repeat(e.impactScore)}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-start justify-between gap-3">
                    <h4
                      className="text-sm font-bold leading-snug"
                      style={{ color: SENTIMENT_TEXT_COLOR[e.sentiment ?? "B"] }}
                    >
                      {e.title}
                    </h4>
                    {(hasBody || e.sourceUrl) && (
                      <ChevronDown
                        aria-hidden="true"
                        className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </div>
                </button>
                {isOpen && (hasBody || e.sourceUrl) && (
                  <div id={panelId} className="mt-2">
                    {hasBody && (
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {e.body}
                      </p>
                    )}
                    {e.sourceUrl && (
                      <a
                        href={e.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700"
                      >
                        Source <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {filtered.length > 30 && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
          >
            {showAll ? "Show fewer" : `Show all ${filtered.length} events`}
          </button>
        </div>
      )}
    </div>
  );
}
