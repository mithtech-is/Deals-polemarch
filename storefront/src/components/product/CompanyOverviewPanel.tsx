"use client";

import { useEffect, useState } from "react";
import { getSnapshot } from "@/lib/snapshot";
import { Markdown } from "./Markdown";

type Props = {
  isin: string;
};

/** Strip markdown markup for JSON-LD plaintext. */
function toPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function CompanyOverviewPanel({ isin }: Props) {
  const [companyName, setCompanyName] = useState<string>("");
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
        setCompanyName(bundle.company_name ?? "");
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

  const name = companyName || "the company";
  const headingId = `about-${isin.toLowerCase()}`;
  const summaryId = `${headingId}-summary`;
  const bmId = `${headingId}-bm`;
  const moatId = `${headingId}-moat`;
  const risksId = `${headingId}-risks`;

  // Build question/answer pairs for the FAQPage JSON-LD. Only populated
  // fields are included. Answers are markdown stripped to plaintext so
  // crawlers see clean sentences.
  const qa: Array<{ id: string; question: string; md: string }> = [
    { id: summaryId, question: `What does ${name} do?`, md: overview.summary }
  ];
  if (overview.businessModel) {
    qa.push({
      id: bmId,
      question: `How does ${name} make money?`,
      md: overview.businessModel
    });
  }
  if (overview.competitiveMoat) {
    qa.push({
      id: moatId,
      question: `What makes ${name} different from competitors?`,
      md: overview.competitiveMoat
    });
  }
  if (overview.risks) {
    qa.push({
      id: risksId,
      question: `What are the risks of investing in ${name}?`,
      md: overview.risks
    });
  }

  // Switched from FAQPage → Article so the deal page has only ONE FAQPage
  // block (owned by FaqPanel). Search engines penalise pages that ship
  // duplicate FAQPage objects, and the About narrative reads more
  // naturally as long-form Article content anyway.
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `About ${name}`,
    about: name,
    articleBody: qa.map((q) => `${q.question}\n${toPlainText(q.md)}`).join("\n\n")
  };

  const hasSections = qa.length > 1;

  return (
    <article
      className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm"
      aria-labelledby={headingId}
      itemScope
      itemType="https://schema.org/Corporation"
    >
      <script
        type="application/ld+json"
        // Safe: articleLd is built from server-provided text already run
        // through toPlainText, and JSON.stringify escapes HTML-unsafe chars.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />

      <header className="mb-4">
        <h2 id={headingId} className="text-xl font-bold text-slate-900" itemProp="name">
          About {name}
        </h2>
      </header>

      <section aria-labelledby={`${summaryId}-h`} itemProp="description">
        <h3
          id={`${summaryId}-h`}
          className="text-base font-bold text-slate-900 mb-2"
        >
          What does {name} do?
        </h3>
        <div className="space-y-3"><Markdown>{overview.summary}</Markdown></div>
      </section>

      {/*
        All remaining sections are ALWAYS rendered to the DOM so crawlers
        and LLM fetchers see the full content. The `hidden` attribute flips
        with the expand toggle, which removes them from visual + a11y trees
        for users without tearing them out of the DOM for bots.
      */}
      {hasSections && (
        <div className="mt-5 space-y-5" hidden={!expanded}>
          {overview.businessModel && (
            <section aria-labelledby={`${bmId}-h`}>
              <h3 id={`${bmId}-h`} className="text-base font-bold text-slate-900 mb-2">
                How does {name} make money?
              </h3>
              <div className="space-y-2"><Markdown>{overview.businessModel}</Markdown></div>
            </section>
          )}
          {overview.competitiveMoat && (
            <section aria-labelledby={`${moatId}-h`}>
              <h3 id={`${moatId}-h`} className="text-base font-bold text-slate-900 mb-2">
                What makes {name} different from competitors?
              </h3>
              <div className="space-y-2"><Markdown>{overview.competitiveMoat}</Markdown></div>
            </section>
          )}
          {overview.risks && (
            <section aria-labelledby={`${risksId}-h`}>
              <h3 id={`${risksId}-h`} className="text-base font-bold text-slate-900 mb-2">
                What are the risks of investing in {name}?
              </h3>
              <div className="space-y-2"><Markdown>{overview.risks}</Markdown></div>
            </section>
          )}
        </div>
      )}

      {hasSections && (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-colors"
            aria-expanded={expanded}
          >
            {expanded ? "Show less" : `Show more (${qa.length - 1} section${qa.length - 1 === 1 ? "" : "s"})`}
            <svg
              className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}
    </article>
  );
}
