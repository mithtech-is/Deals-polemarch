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

/** Strip markdown bullet/bold/italic markup for JSON-LD plaintext. */
function toPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^\s*[-*•]\s+/gm, "")
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

      <header className="flex items-center justify-between mb-4">
        <h2 id={headingId} className="text-xl font-bold text-slate-900" itemProp="name">
          About {name}
        </h2>
        {hasSections && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
            aria-expanded={expanded}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </header>

      <section aria-labelledby={`${summaryId}-h`} itemProp="description">
        <h3
          id={`${summaryId}-h`}
          className="text-base font-bold text-slate-900 mb-2"
        >
          What does {name} do?
        </h3>
        <div className="space-y-3">{renderMarkdown(overview.summary)}</div>
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
              <div className="space-y-2">{renderMarkdown(overview.businessModel)}</div>
            </section>
          )}
          {overview.competitiveMoat && (
            <section aria-labelledby={`${moatId}-h`}>
              <h3 id={`${moatId}-h`} className="text-base font-bold text-slate-900 mb-2">
                What makes {name} different from competitors?
              </h3>
              <div className="space-y-2">{renderMarkdown(overview.competitiveMoat)}</div>
            </section>
          )}
          {overview.risks && (
            <section aria-labelledby={`${risksId}-h`}>
              <h3 id={`${risksId}-h`} className="text-base font-bold text-slate-900 mb-2">
                What are the risks of investing in {name}?
              </h3>
              <div className="space-y-2">{renderMarkdown(overview.risks)}</div>
            </section>
          )}
        </div>
      )}
    </article>
  );
}
