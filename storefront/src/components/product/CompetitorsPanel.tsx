"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { getSnapshot } from "@/lib/snapshot";

type Props = {
  isin: string;
  companyName?: string;
};

type Entry = {
  name: string;
  isin: string | null;
  link: string | null;
  theirEdge: string | null;
  ourEdge: string | null;
  note: string | null;
};

export function CompetitorsPanel({ isin, companyName }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSnapshot(isin, "editorial")
      .then((bundle) => {
        if (cancelled) return;
        setEntries(bundle.editorial?.competitors?.entries ?? []);
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
        <div className="h-32 bg-slate-50 rounded animate-pulse" />
      </div>
    );
  }

  if (entries.length === 0) return null;

  const ourName = companyName || "This company";

  return (
    <article className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900 mb-4">Competitors</h2>
      <ul className="space-y-4">
        {entries.map((e, idx) => {
          // Render the name as a hyperlink if the admin supplied an
          // external link. If only ISIN is available, render it as a
          // small tag next to the name.
          const nameNode = e.link ? (
            <a
              href={e.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-slate-900 hover:text-emerald-700"
            >
              {e.name}
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </a>
          ) : (
            <span className="text-slate-900">{e.name}</span>
          );

          return (
            <li
              key={idx}
              className="border border-slate-100 rounded-xl p-4 bg-slate-50"
            >
              <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
                <h3 className="text-base font-bold">{nameNode}</h3>
                {e.isin && (
                  <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-slate-200 text-slate-700 font-mono">
                    {e.isin}
                  </span>
                )}
              </div>

              {(e.theirEdge || e.ourEdge) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                  {e.theirEdge && (
                    <div className="rounded-lg bg-white border border-rose-100 p-3">
                      <p className="text-[10px] font-bold text-rose-700 uppercase tracking-widest mb-1">
                        {e.name}&apos;s edge
                      </p>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {e.theirEdge}
                      </p>
                    </div>
                  )}
                  {e.ourEdge && (
                    <div className="rounded-lg bg-white border border-emerald-100 p-3">
                      <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1">
                        {ourName}&apos;s edge
                      </p>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {e.ourEdge}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {e.note && (
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  {e.note}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}
