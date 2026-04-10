'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from './auth-context';

const LAST_COMPANY_KEY = 'calcula_last_company_id';
const LAST_COMPANY_ISIN_KEY = 'calcula_last_company_isin';
const SIDEBAR_EXPANDED_KEY = 'calcula_sidebar_expanded';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { token, role, username, logout } = useAuth();
  const pathname = usePathname();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
  const [contextCompanyId, setContextCompanyId] = useState<string | null>(null);
  const [contextCompanyIsin, setContextCompanyIsin] = useState<string | null>(null);
  const isAdmin = String(role ?? '').toUpperCase() === 'ADMIN';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(SIDEBAR_EXPANDED_KEY);
    if (raw === '0') setSidebarExpanded(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SIDEBAR_EXPANDED_KEY, sidebarExpanded ? '1' : '0');
  }, [sidebarExpanded]);

  useEffect(() => {
    // /company/[uuid] → public dashboard context (stores UUID)
    if (pathname.startsWith('/company/')) {
      const parts = pathname.split('/');
      const fromPath = parts[2];
      if (fromPath) {
        setContextCompanyId(fromPath);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LAST_COMPANY_KEY, fromPath);
        }
      }
    }
    // /admin/companies/[isin] → admin company context (stores ISIN)
    if (pathname.startsWith('/admin/companies/') && pathname !== '/admin/companies') {
      const parts = pathname.split('/');
      const fromPath = parts[3];
      if (fromPath) {
        setContextCompanyIsin(fromPath);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LAST_COMPANY_ISIN_KEY, fromPath);
        }
      }
    }
    // Fall back to last-known context when navigating away
    if (typeof window !== 'undefined') {
      if (!contextCompanyId) {
        const savedId = localStorage.getItem(LAST_COMPANY_KEY);
        if (savedId) setContextCompanyId(savedId);
      }
      if (!contextCompanyIsin) {
        const savedIsin = localStorage.getItem(LAST_COMPANY_ISIN_KEY);
        if (savedIsin) setContextCompanyIsin(savedIsin);
      }
    }
    setSidebarOpenMobile(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  type NavLeaf = { href: string; label: string; shortLabel: string };
  type NavGroup = { groupLabel: string; groupShortLabel: string; children: NavLeaf[] };
  type NavItem = NavLeaf | NavGroup;

  const navItems = useMemo<NavItem[]>(() => {
    const base: NavItem[] = [{ href: '/', label: 'Home', shortLabel: 'HM' }];
    if (isAdmin) {
      base.push({ href: '/admin/companies', label: 'Companies', shortLabel: 'CO' });
      base.push({
        groupLabel: 'Data Model',
        groupShortLabel: 'DM',
        children: [
          { href: '/admin/taxonomy/balance-sheet', label: 'Balance Sheet', shortLabel: 'BS' },
          { href: '/admin/taxonomy/pnl', label: 'P&L', shortLabel: 'PL' },
          { href: '/admin/taxonomy/cashflow', label: 'Cash Flow', shortLabel: 'CF' },
          { href: '/admin/taxonomy/change-in-equity', label: 'SOCIE', shortLabel: 'SOCIE' },
          { href: '/admin/taxonomy/ratios', label: 'Ratios and Valuations', shortLabel: 'RV' },
          { href: '/admin/industry-classification', label: 'Industry Classification', shortLabel: 'IC' },
          { href: '/admin/currency', label: 'Currency', shortLabel: 'CU' }
        ]
      });
    }
    return base;
  }, [contextCompanyId, contextCompanyIsin, isAdmin]);

  const [taxonomyGroupOpen, setTaxonomyGroupOpen] = useState(true);
  useEffect(() => {
    if (pathname.startsWith('/admin/taxonomy') || pathname.startsWith('/admin/industry-classification') || pathname.startsWith('/admin/currency')) {
      setTaxonomyGroupOpen(true);
    }
  }, [pathname]);

  const toggleMenu = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1024px)').matches) {
      setSidebarOpenMobile((v) => !v);
      return;
    }
    setSidebarExpanded((v) => !v);
  };

  return (
    <main className={`app-shell ${sidebarExpanded ? '' : 'sidebar-collapsed'}`}>
      <button
        className="sidebar-toggle"
        onClick={toggleMenu}
        aria-label="Toggle sidebar"
      >
        Menu
      </button>

      <aside className={`sidebar ${sidebarOpenMobile ? 'open' : ''}`}>
        {token && (
          <div className="sidebar-profile">
            <div className="avatar" />
            {sidebarExpanded && (
              <div className="col" style={{ gap: 2, overflow: 'hidden' }}>
                <p className="brand-title">{username}</p>
                <p className="brand-subtitle">{role || 'Agent Admin'}</p>
              </div>
            )}
            <button className="secondary sidebar-menu-btn" onClick={toggleMenu} aria-label="Toggle menu" style={{ marginLeft: 'auto', background: 'transparent', border: 'none' }}>
              ☰
            </button>
          </div>
        )}

        {!token && (
          <div className="sidebar-brand row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="col" style={{ gap: 2 }}>
              <p className="brand-title">Calcula</p>
              {sidebarExpanded && <p className="brand-subtitle">Financials</p>}
            </div>
            <button className="secondary sidebar-menu-btn" onClick={toggleMenu} aria-label="Toggle menu" style={{ border: 'none' }}>
              ☰
            </button>
          </div>
        )}

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            if ('groupLabel' in item) {
              const anyActive = item.children.some((c) => pathname.startsWith(c.href));
              return (
                <div key={item.groupLabel}>
                  <button
                    type="button"
                    className={`sidebar-link ${anyActive ? 'active' : ''}`}
                    onClick={() => setTaxonomyGroupOpen((v) => !v)}
                    style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>
                    {sidebarExpanded ? (
                      <span style={{ display: 'flex', justifyContent: 'space-between', flex: 1 }}>
                        <span>{item.groupLabel}</span>
                        <span>{taxonomyGroupOpen ? '▾' : '▸'}</span>
                      </span>
                    ) : item.groupShortLabel}
                  </button>
                  {taxonomyGroupOpen && item.children.map((child) => (
                    <Link
                      key={child.href}
                      className={`sidebar-link ${pathname.startsWith(child.href) ? 'active' : ''}`}
                      href={child.href}
                      onClick={() => setSidebarOpenMobile(false)}
                      style={{ paddingLeft: sidebarExpanded ? 32 : undefined }}
                    >
                      <span style={{ width: 18 }} />
                      {sidebarExpanded ? child.label : child.shortLabel}
                    </Link>
                  ))}
                </div>
              );
            }
            return (
              <Link
                key={item.href}
                className={`sidebar-link ${pathname.startsWith(item.href) && item.href !== '/' ? 'active' : ''} ${pathname === item.href ? 'active' : ''}`}
                href={item.href}
                onClick={() => setSidebarOpenMobile(false)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>
                {sidebarExpanded ? item.label : item.shortLabel}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {token ? (
            <button className="secondary" onClick={logout} style={{ width: '100%', display: sidebarExpanded ? 'block' : 'none' }}>Logout</button>
          ) : (
            pathname !== '/login' && <Link className="sidebar-link" href="/login">Login</Link>
          )}
        </div>
      </aside>

      <div
        className={`sidebar-backdrop ${sidebarOpenMobile ? 'show' : ''}`}
        onClick={() => setSidebarOpenMobile(false)}
      />

      <section className="app-content" style={{ padding: 0 }}>
        <header className="content-header">
          <h1 className="content-header-title">Dashboard</h1>
        </header>

        <div style={{ padding: '14px 24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {children}
        </div>
      </section>
    </main>
  );
}
