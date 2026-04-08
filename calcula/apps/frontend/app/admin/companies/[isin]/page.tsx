'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { gql } from '@/lib/api';
import { useAuth } from '@/components/auth-context';
import { DashboardPage } from '@/components/dashboard/template';
import { RequireAuth } from '@/components/require-auth';
import { Modal } from '@/components/ui/modal';
import {
  COMPANY_BY_ISIN_QUERY,
  DELETE_COMPANY_MUTATION,
  PERIODS_QUERY,
  UPDATE_COMPANY_MUTATION
} from '@/lib/queries';
import type { Company, FinancialPeriod } from '@/types/domain';
import { PeriodsSection } from '@/components/admin/periods-section';
import { PeriodFinancialEditor } from '@/components/admin/period-financial-editor';
import { PriceHistorySection } from '@/components/admin/price-history-section';
import { NewsEventsSection } from '@/components/admin/news-events-section';
import { EditorialSection } from '@/components/admin/editorial-section';

export default function AdminCompanyDetailPage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams<{ isin: string }>();
  const isin = params.isin;

  const [company, setCompany] = useState<Company | null>(null);
  const [periods, setPeriods] = useState<FinancialPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState({
    name: '',
    sector: '',
    industry: '',
    cin: '',
    description: ''
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const loadCompany = useCallback(async () => {
    if (!isin) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const res = await gql<{ companyByIsin: Company }>(COMPANY_BY_ISIN_QUERY, { isin }, token);
      if (!res.companyByIsin) {
        setNotFound(true);
        setCompany(null);
        return;
      }
      setCompany(res.companyByIsin);
      if (typeof window !== 'undefined') {
        localStorage.setItem('calcula_last_company_id', res.companyByIsin.id);
        localStorage.setItem('calcula_last_company_isin', res.companyByIsin.isin);
      }
    } catch (e) {
      const msg = (e as Error).message;
      if (/not found/i.test(msg)) {
        setNotFound(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [isin, token]);

  const loadPeriods = useCallback(
    async (companyId: string) => {
      try {
        const res = await gql<{ companyPeriods: FinancialPeriod[] }>(PERIODS_QUERY, { companyId }, token);
        setPeriods(res.companyPeriods ?? []);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [token]
  );

  useEffect(() => {
    void loadCompany();
  }, [loadCompany]);

  useEffect(() => {
    if (company?.id) void loadPeriods(company.id);
  }, [company?.id, loadPeriods]);

  const openEdit = () => {
    if (!company) return;
    setEditDraft({
      name: company.name,
      sector: company.sector ?? '',
      industry: company.industry ?? '',
      cin: company.cin ?? '',
      description: company.description ?? ''
    });
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!company) return;
    setEditSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await gql(
        UPDATE_COMPANY_MUTATION,
        {
          id: company.id,
          input: {
            name: editDraft.name.trim(),
            sector: editDraft.sector.trim() || undefined,
            industry: editDraft.industry.trim() || undefined,
            cin: editDraft.cin.trim() || undefined,
            description: editDraft.description.trim() || undefined
          }
        },
        token
      );
      setSuccess('Company updated');
      setEditOpen(false);
      await loadCompany();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const deleteCompany = async () => {
    if (!company) return;
    if (!confirm(`Delete ${company.name} and all its financial data? This cannot be undone.`)) return;
    try {
      await gql(DELETE_COMPANY_MUTATION, { id: company.id }, token);
      router.push('/admin/companies');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (loading && !company) {
    return (
      <RequireAuth adminOnly>
        <DashboardPage title="Loading…">
          <p className="muted">Loading company…</p>
        </DashboardPage>
      </RequireAuth>
    );
  }

  if (notFound) {
    return (
      <RequireAuth adminOnly>
        <DashboardPage title="Company not found">
          <div className="card">
            <p>No company with ISIN <code>{isin}</code>.</p>
            <Link href="/admin/companies">← Back to companies</Link>
          </div>
        </DashboardPage>
      </RequireAuth>
    );
  }

  if (!company) {
    return (
      <RequireAuth adminOnly>
        <DashboardPage title="Error">
          <p className="error">{error ?? 'Unable to load company.'}</p>
          <Link href="/admin/companies">← Back to companies</Link>
        </DashboardPage>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth adminOnly>
      <DashboardPage
        title={company.name}
        subtitle={`${company.isin} · ${company.sector ?? 'Sector —'} · ${company.industry ?? 'Industry —'}`}
      >
        <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div className="row" style={{ gap: 8 }}>
            <Link className="button-link secondary" href="/admin/companies">
              ← All companies
            </Link>
            <Link className="button-link secondary" href={`/company/${company.id}`}>
              Open public dashboard →
            </Link>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="secondary" onClick={openEdit}>
              Edit metadata
            </button>
            <button
              className="secondary"
              onClick={deleteCompany}
              style={{ color: '#ef4444', borderColor: '#ef4444' }}
            >
              Delete company
            </button>
          </div>
        </div>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        <PeriodsSection
          companyId={company.id}
          periods={periods}
          onPeriodsChanged={(next) => setPeriods(next)}
        />

        <PriceHistorySection companyId={company.id} />

        <NewsEventsSection companyId={company.id} />

        <EditorialSection companyId={company.id} />

        <PeriodFinancialEditor companyId={company.id} periods={periods} />

        <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit company metadata">
          <div className="grid grid-2" style={{ marginBottom: 20 }}>
            <label className="col">
              <span>Name</span>
              <input value={editDraft.name} onChange={(e) => setEditDraft((p) => ({ ...p, name: e.target.value }))} />
            </label>
            <label className="col">
              <span>ISIN</span>
              <input value={company.isin} disabled />
            </label>
            <label className="col">
              <span>Sector</span>
              <input value={editDraft.sector} onChange={(e) => setEditDraft((p) => ({ ...p, sector: e.target.value }))} />
            </label>
            <label className="col">
              <span>Industry</span>
              <input
                value={editDraft.industry}
                onChange={(e) => setEditDraft((p) => ({ ...p, industry: e.target.value }))}
              />
            </label>
            <label className="col">
              <span>CIN</span>
              <input value={editDraft.cin} onChange={(e) => setEditDraft((p) => ({ ...p, cin: e.target.value }))} />
            </label>
            <label className="col" style={{ gridColumn: '1 / -1' }}>
              <span>Description</span>
              <textarea
                rows={3}
                value={editDraft.description}
                onChange={(e) => setEditDraft((p) => ({ ...p, description: e.target.value }))}
              />
            </label>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <button className="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </button>
            <button onClick={submitEdit} disabled={editSubmitting}>
              {editSubmitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      </DashboardPage>
    </RequireAuth>
  );
}
