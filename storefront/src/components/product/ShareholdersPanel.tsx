"use client";

import { useEffect, useState } from "react";
import { getSnapshot } from "@/lib/snapshot";

type Props = {
  isin: string;
};

type Entry = {
  name: string;
  type: string;
  stakePercent: string | null;
  since: string | null;
  note: string | null;
};

// Type → colour chip for quick visual scanning.
const TYPE_COLOR: Record<string, string> = {
  Founder: "#059669",
  "Co-founder": "#059669",
  Promoter: "#059669",
  Institutional: "#2563eb",
  Strategic: "#7c3aed",
  "Employee Trust": "#d97706",
  Public: "#64748b"
};

export function ShareholdersPanel({ isin }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSnapshot(isin, "editorial")
      .then((bundle) => {
        if (cancelled) return;
        setEntries(bundle.editorial?.shareholders?.entries ?? []);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isin]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="h-6 w-40 bg-slate-100 rounded mb-3 animate-pulse" />
        <div className="h-24 bg-slate-50 rounded animate-pulse" />
      </div>
    );
  }

  if (entries.length === 0) return null;

  return (
    <article className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900 mb-4">
        Major Shareholders
      </h2>
      <ul className="divide-y divide-slate-100">
        {entries.map((e, idx) => {
          const color = TYPE_COLOR[e.type] ?? "#64748b";
          return (
            <li
              key={idx}
              className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900">{e.name}</h3>
                  <span
                    className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full text-white"
                    style={{ background: color }}
                  >
                    {e.type}
                  </span>
                  {e.since && (
                    <span className="text-[11px] text-slate-400">since {e.since}</span>
                  )}
                </div>
                {e.note && (
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {e.note}
                  </p>
                )}
              </div>
              {e.stakePercent && (
                <div className="flex-shrink-0 text-right">
                  <p className="text-lg font-bold text-slate-900">
                    {e.stakePercent}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}
