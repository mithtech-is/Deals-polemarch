"use client";

import { useEffect, useState } from "react";
import { getSnapshot } from "@/lib/snapshot";

/**
 * Minimal markdown renderer. Handles paragraphs, bullets, bold, and italics
 * — everything an editor typically uses for a company narrative. We avoid
 * adding `react-markdown` as a dependency since the ask is 500 words max.
 */
function renderMarkdown(md: string): React.ReactNode {
  if (!md) return null;
  const blocks = md.split(/\n{2,}/).filter((b) => b.trim());
  return blocks.map((block, i) => {
    // Bullet list?
    const lines = block.split(/\r?\n/);
    const isList = lines.every((l) => /^\s*[-*•]\s+/.test(l) || l.trim() === "");
    if (isList) {
      const items = lines
        .map((l) => l.replace(/^\s*[-*•]\s+/, ""))
        .filter(Boolean);
      return (
        <ul key={i} className="list-disc ml-5 space-y-1 text-sm text-slate-700">
          {items.map((item, j) => (
            <li key={j}>{inline(item)}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={i} className="text-sm text-slate-700 leading-relaxed">
        {inline(block.replace(/\n/g, " "))}
      </p>
    );
  });
}

function inline(text: string): React.ReactNode {
  // Very small bold/italic renderer. Splits on **x** and *x* greedy-ish.
  const parts: React.ReactNode[] = [];
  let rest = text;
  let key = 0;
  while (rest.length > 0) {
    const bold = rest.match(/\*\*([^*]+)\*\*/);
    const italic = rest.match(/\*([^*]+)\*/);
    const next =
      bold && italic
        ? (bold.index! <= italic.index! ? "bold" : "italic")
        : bold
          ? "bold"
          : italic
            ? "italic"
            : null;
    if (!next) {
      parts.push(rest);
      break;
    }
    const m = next === "bold" ? bold! : italic!;
    if (m.index! > 0) parts.push(rest.slice(0, m.index!));
    if (next === "bold") {
      parts.push(<strong key={key++}>{m[1]}</strong>);
    } else {
      parts.push(<em key={key++}>{m[1]}</em>);
    }
    rest = rest.slice(m.index! + m[0].length);
  }
  return <>{parts}</>;
}

type Props = {
  isin: string;
};

export function CompanyOverviewPanel({ isin }: Props) {
  const [overview, setOverview] = useState<{
    summary: string;
    businessModel: string | null;
    competitiveMoat: string | null;
    risks: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSnapshot(isin, "editorial")
      .then((bundle) => {
        if (cancelled) return;
        setOverview(bundle.editorial?.overview ?? null);
      })
      .catch(() => {
        if (!cancelled) setOverview(null);
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
        <div className="h-20 bg-slate-50 rounded animate-pulse" />
      </div>
    );
  }

  if (!overview) return null; // Not curated yet.

  const hasSections = Boolean(
    overview.businessModel || overview.competitiveMoat || overview.risks
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-slate-900">About</h3>
        {hasSections && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
      <div className="space-y-3">{renderMarkdown(overview.summary)}</div>

      {expanded && (
        <div className="mt-5 space-y-5">
          {overview.businessModel && (
            <section>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Business model
              </h4>
              <div className="space-y-2">{renderMarkdown(overview.businessModel)}</div>
            </section>
          )}
          {overview.competitiveMoat && (
            <section>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Competitive moat
              </h4>
              <div className="space-y-2">{renderMarkdown(overview.competitiveMoat)}</div>
            </section>
          )}
          {overview.risks && (
            <section>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Risks
              </h4>
              <div className="space-y-2">{renderMarkdown(overview.risks)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
