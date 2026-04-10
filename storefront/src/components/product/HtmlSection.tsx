"use client";

/**
 * Renders a block of analyst-authored HTML (sanitised) inside a storefront
 * card. Used by the Financial Insights and Industry / Sector / Activity
 * Analysis sections. The HTML is authored in the Calcula admin editorial
 * section and flows through the editorial snapshot.
 *
 * Sanitization is delegated to `sanitizeEditorialHtml` which wraps
 * `sanitize-html` with an allowlist that preserves inline `style` attributes
 * (required by the inline-styled report HTML) while stripping scripts, iframes,
 * event handlers and javascript: URIs. The previous regex sanitiser stripped
 * `<style>` entirely — which is why the editorial HTML had to be refactored to
 * inline styles in the first place — and was trivially bypassable with
 * malformed markup.
 */

import { sanitizeEditorialHtml } from "@/lib/sanitizeEditorialHtml";

type Props = {
  id?: string;
  title: string;
  subtitle?: string;
  html: string | null | undefined;
};

export function HtmlSection({ id, title, subtitle, html }: Props) {
  if (!html || !html.trim()) return null;
  const safe = sanitizeEditorialHtml(html);
  if (!safe) return null;
  return (
    <article
      id={id}
      className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm"
    >
      <header className="mb-4">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        )}
      </header>
      <div
        // HTML is analyst-authored in Calcula's admin, flows through the
        // editorial snapshot and Medusa cache, and is passed through
        // `sanitizeEditorialHtml` before injection. Inline `style=""` is
        // preserved so the KPI cards / tables / callouts render as authored.
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    </article>
  );
}
