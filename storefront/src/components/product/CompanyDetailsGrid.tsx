"use client";

import { useEffect, useState, Fragment } from "react";
import { getSnapshot, type CompanyDetailsData } from "@/lib/snapshot";

type Props = {
  isin: string;
};

/**
 * Extra company-details rows pulled from Calcula's CompanyDetails curation
 * form. Designed to render INSIDE the parent Company Details grid in
 * `deals/[id]/page.tsx` so the legacy fields and the extra fields appear as
 * one unified 2-column block. Previously this component rendered its own
 * "More corporate details" card below the legacy grid — the two were merged
 * by product request.
 *
 * Outputs:
 *   - Row fragments shaped to match the legacy grid items (flex justify-
 *     between, border-b slate-200 py-3) so they visually continue the same
 *     table.
 *   - An optional links bar (Website / LinkedIn / Twitter / Crunchbase)
 *     spanning both grid columns via `md:col-span-2`.
 *
 * Silent when no CompanyDetails row is curated — additive & backwards
 * compatible.
 */

function clean(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === "null" || s === "undefined") return null;
  return s;
}

function link(v: unknown): string | null {
  const s = clean(v);
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) return `https://${s}`;
  return s;
}

export function CompanyDetailsGrid({ isin }: Props) {
  const [details, setDetails] = useState<CompanyDetailsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isin) return;
    let cancelled = false;
    setLoading(true);
    getSnapshot(isin, "profile")
      .then((bundle) => {
        if (!cancelled) setDetails(bundle.profile?.details ?? null);
      })
      .catch(() => {
        if (!cancelled) setDetails(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isin]);

  if (loading || !details) return null;

  const rows: Array<[string, string]> = [];
  const push = (label: string, v: unknown) => {
    const s = clean(v);
    if (s) rows.push([label, s]);
  };

  push("Legal entity", details.legalEntityType);
  push("Incorporation country", details.incorporationCountry);
  push("Registered office", details.registeredOffice);
  push("Fiscal year end", details.fiscalYearEnd);
  push("Auditor", details.auditor);
  push("Employees", details.employeeCount);
  push("Subsidiaries", details.subsidiariesCount);
  push("Availability (%)", details.availabilityPercent);
  push("Last round type", details.lastRoundType);
  push("Last round date", details.lastRoundDate);
  push("Last round raised", details.lastRoundRaised);
  push("Last round lead", details.lastRoundLead);
  push("Last post-money", details.lastRoundValuation);

  const website = link(details.website);
  const linkedin = link(details.linkedinUrl);
  const twitter = link(details.twitterUrl);
  const crunchbase = link(details.crunchbaseUrl);
  const hasLinks = Boolean(website || linkedin || twitter || crunchbase);

  if (!rows.length && !hasLinks) return null;

  return (
    <Fragment>
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex justify-between items-center border-b border-slate-200 py-3"
        >
          <span className="text-xs text-slate-500">{label}</span>
          <span className="text-sm font-bold text-slate-900 text-right">
            {value}
          </span>
        </div>
      ))}
      {hasLinks && (
        <div className="md:col-span-2 flex flex-wrap gap-2 pt-4 mt-2 border-t border-slate-200">
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
            >
              Website ↗
            </a>
          )}
          {linkedin && (
            <a
              href={linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
            >
              LinkedIn ↗
            </a>
          )}
          {twitter && (
            <a
              href={twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
            >
              Twitter / X ↗
            </a>
          )}
          {crunchbase && (
            <a
              href={crunchbase}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
            >
              Crunchbase ↗
            </a>
          )}
        </div>
      )}
    </Fragment>
  );
}
