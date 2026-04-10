'use client';

import { useEffect, useState } from 'react';

type Section = { id: string; label: string };

type Props = {
  sections: ReadonlyArray<Section>;
};

/**
 * Sticky horizontal anchor bar for long admin pages (e.g. the company
 * detail page). Mirrors the storefront DealPageToc pattern: each section
 * on the page wraps a visible `id="..."` attribute, this component scrolls
 * the active one into view via direct scroll-position math. Sections that
 * don't yet exist in the DOM (late-mounting children) are filtered out on
 * each recompute, so the bar never contains dead anchors.
 */
export function AdminPageToc({ sections }: Props) {
  const [present, setPresent] = useState<Section[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  // Re-check which ids exist. Children are async (each admin section
  // mounts + loads its own data), so we probe a few times after mount.
  useEffect(() => {
    let cancelled = false;
    const compute = () => {
      const found = sections.filter((s) => document.getElementById(s.id));
      if (!cancelled) setPresent(found);
    };
    compute();
    const timers = [200, 800, 2000, 4000].map((ms) => window.setTimeout(compute, ms));
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [sections]);

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
      const nearBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 60;
      if (nearBottom) current = present[present.length - 1].id;
      setActiveId(current);
    };

    recompute();
    window.addEventListener('scroll', recompute, { passive: true });
    window.addEventListener('resize', recompute);
    return () => {
      window.removeEventListener('scroll', recompute);
      window.removeEventListener('resize', recompute);
    };
  }, [present]);

  if (present.length === 0) return null;

  return (
    <nav
      aria-label="On this page"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        padding: '10px 14px',
        marginBottom: 12,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.04)'
      }}
    >
      <ol
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          scrollbarWidth: 'none'
        }}
      >
        {present.map((s) => {
          const isActive = s.id === activeId;
          return (
            <li key={s.id} style={{ flexShrink: 0 }}>
              <a
                href={`#${s.id}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '6px 12px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  textDecoration: 'none',
                  background: isActive ? '#065f46' : 'transparent',
                  color: isActive ? '#ffffff' : '#475569',
                  transition: 'background 120ms, color 120ms'
                }}
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
