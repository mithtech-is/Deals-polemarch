"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { getSnapshot } from "@/lib/snapshot";

type Props = {
  isin: string;
};

type FaqItem = { question: string; answer: string };

/**
 * Accordion FAQ rendered at the bottom of the deal page. Items are
 * curated in the calcula admin under Editorial → FAQ and folded into
 * the `editorial` snapshot. Each row toggles independently (multi-open)
 * so readers can compare answers side by side.
 */
export function FaqPanel({ isin }: Props) {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSnapshot(isin, "editorial")
      .then((bundle) => {
        if (cancelled) return;
        // Hide placeholder rows (question present, answer empty) — admins
        // use those as TODOs in the editor; users should never see them.
        const raw = bundle.editorial?.faq?.items ?? [];
        setItems(raw.filter((i) => i.question.trim() && i.answer.trim()));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
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
        <div className="h-6 w-52 bg-slate-100 rounded mb-3 animate-pulse" />
        <div className="h-32 bg-slate-50 rounded animate-pulse" />
      </div>
    );
  }

  if (items.length === 0) return null;

  const toggle = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // FAQPage JSON-LD — primary GEO signal for the deal page. Each curated
  // Q&A becomes a structured entry crawlers can extract directly.
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <h2 className="text-xl font-bold text-slate-900">
          Frequently Asked Questions
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded(new Set(items.map((_, i) => i)))}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
          >
            Expand all
          </button>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <button
            type="button"
            onClick={() => setExpanded(new Set())}
            className="text-xs font-bold text-slate-500 hover:text-slate-700"
          >
            Collapse all
          </button>
        </div>
      </div>
      <ul className="divide-y divide-slate-100">
        {items.map((item, index) => {
          const isOpen = expanded.has(index);
          const panelId = `faq-panel-${index}`;
          return (
            <li key={index} className="py-3 first:pt-0 last:pb-0">
              <button
                type="button"
                onClick={() => toggle(index)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-center justify-between gap-4 text-left"
              >
                <span className="text-sm font-bold text-slate-900 leading-snug">
                  {item.question}
                </span>
                <ChevronDown
                  className={`h-4 w-4 flex-shrink-0 text-slate-500 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>
              {isOpen && (
                <p
                  id={panelId}
                  className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap"
                >
                  {item.answer}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
