'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';

export type CompanyTab = {
  id: string;
  label: string;
  /** Extra hash ids that should also activate this tab when linked directly. */
  aliases?: ReadonlyArray<string>;
  render: () => ReactNode;
};

type Props = {
  tabs: ReadonlyArray<CompanyTab>;
};

/**
 * Tabbed layout for the admin company detail page. Replaces the old
 * single-scroll layout. Each tab mounts lazily on first visit and then
 * stays mounted (hidden via display:none) so in-flight edits and fetched
 * state persist when switching back and forth.
 *
 * The active tab is mirrored into the URL hash so deep links work —
 * e.g. `/admin/companies/INE...#team` opens the People tab. Legacy
 * section ids from the old `COMPANY_PAGE_SECTIONS` config are accepted
 * via each tab's `aliases`.
 */
export function CompanyTabs({ tabs }: Props) {
  const aliasIndex = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tabs) {
      map.set(t.id, t.id);
      for (const a of t.aliases ?? []) map.set(a, t.id);
    }
    return map;
  }, [tabs]);

  const initial = tabs[0]?.id ?? '';
  const [activeId, setActiveId] = useState<string>(initial);
  const [mounted, setMounted] = useState<Set<string>>(() => new Set(initial ? [initial] : []));

  // Sync from hash on mount + hashchange.
  useEffect(() => {
    const applyHash = () => {
      const raw = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
      if (!raw) return;
      const target = aliasIndex.get(raw);
      if (!target) return;
      setActiveId(target);
      setMounted((prev) => {
        if (prev.has(target)) return prev;
        const next = new Set(prev);
        next.add(target);
        return next;
      });
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [aliasIndex]);

  const selectTab = (id: string) => {
    setActiveId(id);
    setMounted((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    if (typeof window !== 'undefined') {
      const url = `${window.location.pathname}${window.location.search}#${id}`;
      window.history.replaceState(null, '', url);
    }
  };

  if (tabs.length === 0) return null;

  return (
    <div className="col" style={{ gap: 12 }}>
      <nav
        aria-label="Company sections"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          padding: '10px 14px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.04)'
        }}
      >
        <ol
          role="tablist"
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
          {tabs.map((t) => {
            const isActive = t.id === activeId;
            return (
              <li key={t.id} style={{ flexShrink: 0 }}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => selectTab(t.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 14px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    border: 'none',
                    cursor: 'pointer',
                    background: isActive ? '#065f46' : 'transparent',
                    color: isActive ? '#ffffff' : '#475569',
                    transition: 'background 120ms, color 120ms'
                  }}
                >
                  {t.label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div>
        {tabs.map((t) => {
          if (!mounted.has(t.id)) return null;
          const isActive = t.id === activeId;
          return (
            <div
              key={t.id}
              role="tabpanel"
              aria-hidden={!isActive}
              style={{ display: isActive ? 'block' : 'none' }}
            >
              {t.render()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
