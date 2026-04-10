'use client';

import Link from 'next/link';
import { DashboardPage, DashboardSection } from '@/components/dashboard/template';
import { RequireAuth } from '@/components/require-auth';

const cards = [
  {
    href: '/admin/taxonomy/balance-sheet',
    title: 'Balance Sheet',
    description: 'Assets, liabilities, and equity line items.'
  },
  {
    href: '/admin/taxonomy/pnl',
    title: 'Profit & Loss',
    description: 'Revenue, expenses, and derived margins.'
  },
  {
    href: '/admin/taxonomy/cashflow',
    title: 'Cashflow',
    description: 'Operating, investing, and financing activities.'
  },
  {
    href: '/admin/taxonomy/ratios',
    title: 'Ratios & Valuations',
    description: 'Derived ratios, per-share metrics, and valuation models.'
  }
];

export default function AdminTaxonomyIndexPage() {
  return (
    <RequireAuth adminOnly>
      <DashboardPage
        title="Taxonomy Manager"
        subtitle="Pick a statement to edit its line-item tree, formulas, and remainder mapping."
      >
        <DashboardSection>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16
            }}
          >
            {cards.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="card"
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: 20,
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block'
                }}
              >
                <h3 style={{ margin: 0, marginBottom: 8 }}>{c.title}</h3>
                <p className="muted" style={{ margin: 0 }}>{c.description}</p>
              </Link>
            ))}
          </div>
        </DashboardSection>
      </DashboardPage>
    </RequireAuth>
  );
}
