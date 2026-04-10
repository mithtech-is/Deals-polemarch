"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { getSnapshot, type NewsEventItem, type PriceEventCategory } from "@/lib/snapshot";

// Colour palette must match PriceChart.tsx and the Calcula admin UI so
// the same tag looks the same everywhere.
const CATEGORY_COLOR: Record<PriceEventCategory, string> = {
  C: "#059669", // emerald — corporate actions
  E: "#2563eb", // blue    — business events
  N: "#d97706", // amber   — news
  R: "#e11d48", // rose    — regulatory
};

const CATEGORY_LABEL: Record<PriceEventCategory, string> = {
  C: "Corporate action",
  E: "Business event",
  N: "News",
  R: "Regulatory",
};

type Filter = "ALL" | PriceEventCategory;

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
  // Strip the most common markdown atoms so the preview reads cleanly.
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

export function NewsPanel({ isin }: Props) {
  const [events, setEvents] = useState<NewsEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
        // 404 "Snapshot not cached yet" is not an error from the user's
        // perspective — it just means no news yet for this company.
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

  const visible = useMemo(() => {
    if (filter === "ALL") return events;
    return events.filter((e) => e.category === filter);
  }, [events, filter]);

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
        <div className="h-24 bg-slate-50 rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <p className="text-sm text-slate-500">News panel unavailable: {error}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 mb-2">News & Events</h3>
        <p className="text-sm text-slate-500">
          No news or corporate events posted for this company yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <h3 className="text-xl font-bold text-slate-900">News & Events</h3>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["ALL", "C", "N", "R"] as Filter[])
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
                  <span>
                    {f === "ALL" ? "All" : CATEGORY_LABEL[f]}
                  </span>
                  <span className={isOn ? "text-slate-300" : "text-slate-400"}>{count}</span>
                </button>
              );
            })}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-slate-500 py-8 text-center">
          No events in this category.
        </p>
      ) : (
        <ol className="space-y-4">
          {visible.map((e) => {
            const isExpanded = expanded.has(e.id);
            const color = CATEGORY_COLOR[e.category];
            return (
              <li
                key={e.id}
                className="pl-4 border-l-2"
                style={{ borderColor: color }}
              >
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span
                    className="inline-block px-2 py-0.5 text-[10px] font-bold rounded"
                    style={{ background: color, color: "white" }}
                    title={CATEGORY_LABEL[e.category]}
                  >
                    {e.category}
                  </span>
                  <span className="text-xs text-slate-500">{formatDate(e.occurredAt)}</span>
                </div>
                <h4 className="mt-1 font-bold text-slate-900 text-base leading-snug">
                  {e.title}
                </h4>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                  {isExpanded ? e.body : snippet(e.body)}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  {e.body.length > 220 && (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(e.id)}
                      className="font-bold text-emerald-700 hover:text-emerald-800"
                    >
                      {isExpanded ? "Show less" : "Read more"}
                    </button>
                  )}
                  {e.sourceUrl && (
                    <a
                      href={e.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-slate-500 hover:text-slate-700"
                    >
                      Source <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
