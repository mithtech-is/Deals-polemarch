"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { getSnapshot } from "@/lib/snapshot";

/**
 * Parse a markdown bullet list (`- item`, `* item`, `• item`) into a flat
 * array of lines. Tolerates blank lines and leading whitespace. If no
 * bullets are found, treats each non-empty line as its own item.
 */
function parseBullets(md: string): string[] {
  if (!md) return [];
  const lines = md
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const bulleted = lines
    .filter((l) => /^[-*•]\s+/.test(l))
    .map((l) => l.replace(/^[-*•]\s+/, ""));
  return bulleted.length > 0 ? bulleted : lines;
}

type Props = {
  isin: string;
};

export function ProsConsPanel({ isin }: Props) {
  const [pros, setPros] = useState<string[]>([]);
  const [cons, setCons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSnapshot(isin, "editorial")
      .then((bundle) => {
        if (cancelled) return;
        const pc = bundle.editorial?.prosCons;
        setPros(parseBullets(pc?.pros ?? ""));
        setCons(parseBullets(pc?.cons ?? ""));
      })
      .catch(() => {
        if (!cancelled) {
          setPros([]);
          setCons([]);
        }
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
        <div className="h-6 w-32 bg-slate-100 rounded mb-3 animate-pulse" />
        <div className="h-24 bg-slate-50 rounded animate-pulse" />
      </div>
    );
  }

  if (pros.length === 0 && cons.length === 0) {
    return null; // Nothing curated yet — don't render an empty card.
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <h3 className="text-xl font-bold text-slate-900 mb-4">Pros & Cons</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">
            Pros
          </h4>
          {pros.length === 0 ? (
            <p className="text-sm text-slate-400">—</p>
          ) : (
            <ul className="space-y-1.5">
              {pros.map((line, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700 leading-relaxed">
                  <Check className="h-4 w-4 text-emerald-600 flex-none mt-0.5" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-2">
            Cons
          </h4>
          {cons.length === 0 ? (
            <p className="text-sm text-slate-400">—</p>
          ) : (
            <ul className="space-y-1.5">
              {cons.map((line, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700 leading-relaxed">
                  <X className="h-4 w-4 text-rose-600 flex-none mt-0.5" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
