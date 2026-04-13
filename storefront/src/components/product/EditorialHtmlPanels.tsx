"use client";

import { useEffect, useState } from "react";
import { getSnapshot } from "@/lib/snapshot";
import { HtmlSection } from "./HtmlSection";

type Props = {
  isin: string;
  /**
   * Retained for API compatibility with the deal page. The component now only
   * renders Financial Analysis — Industry / Sector / Activity rendering was
   * removed by product decision. The prop is accepted but ignored so existing
   * call sites don't need to be touched.
   */
  only?: "industry" | "financial" | "all";
};

/**
 * Single-fetch wrapper that pulls the editorial snapshot once and renders the
 * Financial Analysis HTML block. Returns null when the field is empty so the
 * deal page stays clean for uncurated companies.
 *
 * Industry / Sector / Activity blocks were previously rendered here as well;
 * they were removed from the product. The DB columns remain populated (see
 * `company_overview.industry_analysis` / `sector_analysis` / `activity_analysis`)
 * so they can be re-enabled without a data migration if product decides to
 * re-introduce them.
 */
export function EditorialHtmlPanels({ isin }: Props) {
  const [financialInsights, setFinancialInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSnapshot(isin, "editorial")
      .then((bundle) => {
        if (cancelled) return;
        setFinancialInsights(bundle.editorial?.overview?.financialInsights ?? null);
      })
      .catch(() => {
        if (!cancelled) setFinancialInsights(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isin]);

  if (loading || !financialInsights?.trim()) return null;

  return (
    <HtmlSection
      title="Financial Insights"
      subtitle="Analyst commentary on the latest financial trajectory"
      html={financialInsights}
    />
  );
}
