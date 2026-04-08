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

  const navItems = useMemo(() => {
    const base = [{ href: '/', label: 'Home', shortLabel: 'HM' }];
    if (isAdmin) {
      base.push({ href: '/admin/taxonomy', label: 'Admin / Taxonomy', shortLabel: 'TX' });
      base.push({ href: '/admin/companies', label: 'Admin / Companies', shortLabel: 'CO' });
    }
    if (isAdmin && contextCompanyIsin) {
      base.push({
        href: `/admin/companies/${contextCompanyIsin}`,
        label: 'Admin / Current Company',
        shortLabel: 'AC'
      });
    }
    if (contextCompanyId) {
      base.push({ href: `/company/${contextCompanyId}`, label: 'Company Dashboard', shortLabel: 'DB' });
    }
    return base;
  }, [contextCompanyId, contextCompanyIsin, isAdmin]);

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
          {navItems.map((item) => (
            <Link
              key={item.href}
              className={`sidebar-link ${pathname.startsWith(item.href) && item.href !== '/' ? 'active' : ''} ${pathname === item.href ? 'active' : ''}`}
              href={item.href}
              onClick={() => setSidebarOpenMobile(false)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>
              {sidebarExpanded ? item.label : item.shortLabel}
            </Link>
          ))}
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
