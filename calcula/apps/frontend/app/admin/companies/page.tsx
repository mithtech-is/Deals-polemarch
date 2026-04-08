'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { gql } from '@/lib/api';
import { useAuth } from '@/components/auth-context';
import { DashboardPage } from '@/components/dashboard/template';
import { RequireAuth } from '@/components/require-auth';
import { Modal } from '@/components/ui/modal';
import { COMPANIES_QUERY, CREATE_COMPANY_MUTATION } from '@/lib/queries';
import type { Company } from '@/types/domain';

const ISIN_REGEX = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

type NewCompany = {
  name: string;
  isin: string;
  sector: string;
  industry: string;
  cin: string;
};

export default function AdminCompaniesListPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [draft, setDraft] = useState<NewCompany>({
    name: '',
    isin: '',
    sector: '',
    industry: '',
    cin: ''
  });

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Load list whenever the debounced search changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    gql<{ companies: Company[] }>(COMPANIES_QUERY, { q: debouncedSearch || undefined }, token)
      .then((res) => {
        if (!cancelled) setCompanies(res.companies ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, token]);

  const sortedCompanies = useMemo(
    () => [...companies].sort((a, b) => a.name.localeCompare(b.name)),
    [companies]
  );

  const openNew = () => {
    setDraft({ name: '', isin: '', sector: '', industry: '', cin: '' });
    setFormError(null);
    setIsModalOpen(true);
  };

  const submit = async () => {
    setFormError(null);
    if (!draft.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    const normalizedIsin = draft.isin.trim().toUpperCase();
    if (!ISIN_REGEX.test(normalizedIsin)) {
      setFormError('ISIN must be 12 characters (e.g. INE0DJ201029).');
      return;
    }
    setSubmitting(true);
    try {
      const res = await gql<{ createCompany: Company }>(
        CREATE_COMPANY_MUTATION,
        {
          input: {
            name: draft.name.trim(),
            isin: normalizedIsin,
            sector: draft.sector.trim() || undefined,
            industry: draft.industry.trim() || undefined,
            cin: draft.cin.trim() || undefined
          }
        },
        token
      );
      setIsModalOpen(false);
      router.push(`/admin/companies/${res.createCompany.isin}`);
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RequireAuth adminOnly>
      <DashboardPage
        title="Companies"
        subtitle="Browse, search and open companies. Click any card to manage its periods, financials and price data."
      >
        <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: '1 1 260px', maxWidth: 420 }}
          />
          <button onClick={openNew}>+ Create Company</button>
        </div>

        {error && <p className="error">{error}</p>}
        {loading && <p className="muted">Loading companies…</p>}

        {!loading && sortedCompanies.length === 0 && !error && (
          <div className="card">
            <p className="muted" style={{ margin: 0 }}>
              No companies yet. Click <strong>Create Company</strong> to add one.
            </p>
          </div>
        )}

        <div className="grid grid-3">
          {sortedCompanies.map((company) => (
            <div
              key={company.id}
              role="button"
              tabIndex={0}
              className="card col company-card"
              onClick={() => router.push(`/admin/companies/${company.isin}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  router.push(`/admin/companies/${company.isin}`);
                }
              }}
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                background: 'white',
                color: '#0f172a',
                border: '1px solid #e5e7eb',
                borderRadius: 16,
                padding: 20,
                gap: 8,
                alignItems: 'stretch',
                transition: 'transform 0.1s ease, box-shadow 0.1s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <h3 className="page-title" style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>
                  {company.name}
                </h3>
                <span
                  style={{
                    fontSize: 9,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: company.listingStatus === 'listed' ? '#dbeafe' : '#fef3c7',
                    color: company.listingStatus === 'listed' ? '#1e40af' : '#92400e',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {company.listingStatus}
                </span>
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 12, fontFamily: 'monospace' }}>
                {company.isin}
              </p>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#64748b', marginTop: 4 }}>
                <span>
                  <strong>Sector:</strong> {company.sector || '—'}
                </span>
                <span>
                  <strong>Industry:</strong> {company.industry || '—'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Company">
          {formError && <p className="error" style={{ marginBottom: 12 }}>{formError}</p>}
          <div className="grid grid-2" style={{ marginBottom: 20 }}>
            <label className="col">
              <span>Name *</span>
              <input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
            </label>
            <label className="col">
              <span>ISIN *</span>
              <input
                value={draft.isin}
                onChange={(e) => setDraft((p) => ({ ...p, isin: e.target.value.toUpperCase() }))}
                placeholder="INE0DJ201029"
                maxLength={12}
              />
            </label>
            <label className="col">
              <span>Sector</span>
              <input value={draft.sector} onChange={(e) => setDraft((p) => ({ ...p, sector: e.target.value }))} />
            </label>
            <label className="col">
              <span>Industry</span>
              <input value={draft.industry} onChange={(e) => setDraft((p) => ({ ...p, industry: e.target.value }))} />
            </label>
            <label className="col" style={{ gridColumn: '1 / -1' }}>
              <span>CIN</span>
              <input value={draft.cin} onChange={(e) => setDraft((p) => ({ ...p, cin: e.target.value }))} />
            </label>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <button className="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button onClick={submit} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create'}
            </button>
          </div>
        </Modal>
      </DashboardPage>
    </RequireAuth>
  );
}
