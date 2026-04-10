"use client";

import { useEffect, useState } from "react";

const SECTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "price", label: "Price chart" },
  { id: "about", label: "About" },
  { id: "company-details", label: "Company details" },
  { id: "financials", label: "Financials" },
  { id: "key-takeaways", label: "Key takeaways" },
  { id: "team", label: "Team" },
  { id: "shareholders", label: "Shareholders" },
  { id: "competitors", label: "Competitors" },
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
  //
  // IntersectionObserver gets flaky with long sections (e.g. FAQ) because
  // intersectionRatio drops for tall elements and shorter neighbours win
  // the "most visible" race even after you've scrolled past them.
  // Instead: compute the active section from scroll position. The active
  // section is the LAST one whose top has scrolled past a probe line
  // ~30% down the viewport. This matches what a user visually considers
  // "the section I'm reading".
  useEffect(() => {
    if (present.length === 0) return;
    const PROBE_OFFSET = 0.3; // 30% from top of viewport

    const recompute = () => {
      const probeY = window.scrollY + window.innerHeight * PROBE_OFFSET;
      let current = present[0].id;
      for (const s of present) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top + window.scrollY;
        if (top <= probeY) current = s.id;
        else break;
      }
      // Near bottom → force the last present section so FAQ always wins
      // once the document can't scroll any further.
      const nearBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 60;
      if (nearBottom) current = present[present.length - 1].id;
      setActiveId(current);
    };

    recompute();
    window.addEventListener("scroll", recompute, { passive: true });
    window.addEventListener("resize", recompute);
    return () => {
      window.removeEventListener("scroll", recompute);
      window.removeEventListener("resize", recompute);
    };
  }, [present]);

  if (present.length === 0) return null;

  return (
    <nav
      aria-label="On this page"
      className="sticky top-24 z-20 bg-white rounded-2xl border border-slate-100 shadow-sm px-4"
    >
      <ol
        className="flex items-center gap-1 overflow-x-auto py-3"
        style={{ scrollbarWidth: "none" }}
      >
        {present.map((s) => {
          const isActive = s.id === activeId;
          return (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-emerald-700 text-white"
                    : "text-slate-600 hover:bg-slate-100"
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
