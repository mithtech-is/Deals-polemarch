"use client";

import { useEffect, useState } from "react";

const SECTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "price", label: "Price chart" },
  { id: "about", label: "About" },
  { id: "company-details", label: "Company details" },
  { id: "financials", label: "Financials" },
  { id: "key-takeaways", label: "Key takeaways" },
  { id: "timeline", label: "Timeline" },
  { id: "faq", label: "FAQ" },
];

/**
 * Sticky in-page Table of Contents shown inside the deal page's left
 * column on lg+ screens. Highlights the section currently in view via
 * IntersectionObserver. Sections that don't render (e.g. an empty FAQ)
 * are filtered out at mount time so the ToC never has dead links.
 */
export function DealPageToc() {
  const [present, setPresent] = useState<typeof SECTIONS>([]);
  const [activeId, setActiveId] = useState<string>("");

  // Re-check which section ids actually exist after the page has hydrated.
  // We poll briefly because some panels (FAQ, Timeline) mount async after
  // their data fetch completes.
  useEffect(() => {
    let cancelled = false;
    const compute = () => {
      const found = SECTIONS.filter((s) => document.getElementById(s.id));
      if (!cancelled) setPresent(found);
    };
    compute();
    const timers = [200, 800, 2000, 4000].map((ms) => window.setTimeout(compute, ms));
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  // Track which section is currently in view.
  useEffect(() => {
    if (present.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the most-visible entry that intersects.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    present.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [present]);

  if (present.length === 0) return null;

  return (
    <nav
      aria-label="On this page"
      className="hidden lg:block lg:sticky lg:top-8 self-start"
    >
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
        On this page
      </p>
      <ol className="space-y-1">
        {present.map((s) => {
          const isActive = s.id === activeId;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={`block pl-3 py-1 text-xs transition-colors border-l-2 ${
                  isActive
                    ? "text-emerald-700 font-bold border-emerald-700"
                    : "text-slate-500 hover:text-slate-900 border-transparent"
                }`}
              >
                {s.label}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
