"use client";

import { useEffect, useMemo, useState } from "react";
import { getSnapshot, type NewsEventItem, type PriceEventCategory } from "@/lib/snapshot";

const CATEGORY_COLOR: Record<PriceEventCategory, string> = {
  C: "#059669",
  N: "#d97706",
  R: "#e11d48",
};

const CATEGORY_LABEL: Record<PriceEventCategory, string> = {
  C: "Corporate",
  N: "News",
  R: "Regulatory",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type Props = {
  isin: string;
};

/**
 * Vertical event timeline. Reads the same NewsEvent data as NewsPanel —
 * this component is a different rendering, not a different data source.
 * Limits to the 30 most recent events by default with a "Show all" toggle.
 */
export function EventTimeline({ isin }: Props) {
  const [events, setEvents] = useState<NewsEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSnapshot(isin, "news")
      .then((bundle) => {
        if (cancelled) return;
        setEvents(bundle.news?.events ?? []);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isin]);

  const visible = useMemo(
    () => (showAll ? events : events.slice(0, 30)),
    [events, showAll]
  );

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="h-6 w-32 bg-slate-100 rounded mb-3 animate-pulse" />
        <div className="h-40 bg-slate-50 rounded animate-pulse" />
      </div>
    );
  }

  if (events.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <h3 className="text-xl font-bold text-slate-900 mb-4">Timeline</h3>
      <ol className="relative border-l-2 border-slate-100 ml-2 space-y-5 pl-6">
        {visible.map((e) => {
          const color = CATEGORY_COLOR[e.category];
          return (
            <li key={e.id} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-[33px] top-0 h-4 w-4 rounded-full border-2 border-white shadow"
                style={{ background: color }}
              />
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
              </div>
              <h4 className="mt-0.5 text-sm font-bold text-slate-900 leading-snug">
                {e.title}
              </h4>
            </li>
          );
        })}
      </ol>
      {events.length > 30 && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
          >
            {showAll ? "Show fewer" : `Show all ${events.length} events`}
          </button>
        </div>
      )}
    </div>
  );
}
