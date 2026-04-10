'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { gql, rest } from '@/lib/api';
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
import { CompanyDetailsSection } from '@/components/admin/company-details-section';
import { ValuationsSection } from '@/components/admin/valuations-section';
import { TeamSection } from '@/components/admin/team-section';
import { ShareholdersSection } from '@/components/admin/shareholders-section';
import { CompetitorsSection } from '@/components/admin/competitors-section';
import { CompanyTabs, type CompanyTab } from '@/components/admin/company-tabs';

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
    sectorId: '',
    industryId: '',
    activityId: '',
    cin: '',
    description: ''
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [trbcTree, setTrbcTree] = useState<
    Array<{
      id: string;
      name: string;
      industries: Array<{
        id: string;
        name: string;
        activities: Array<{ id: string; name: string }>;
      }>;
    }>
  >([]);

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
      sectorId: company.sectorId ?? '',
      industryId: company.industryId ?? '',
      activityId: company.activityId ?? '',
      cin: company.cin ?? '',
      description: company.description ?? ''
    });
    setEditOpen(true);
    // Load tree lazily the first time the modal opens.
    if (!trbcTree.length) {
      void rest<typeof trbcTree>('/industry-classification/tree', {}, token)
        .then(setTrbcTree)
        .catch(() => {
          /* ignore — dropdowns will just be empty */
        });
    }
  };

  const submitEdit = async () => {
    if (!company) return;
    setEditSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const selectedSector = trbcTree.find((s) => s.id === editDraft.sectorId);
      const selectedIndustry = selectedSector?.industries.find((i) => i.id === editDraft.industryId);
      const selectedActivity = selectedIndustry?.activities.find((a) => a.id === editDraft.activityId);
      await gql(
        UPDATE_COMPANY_MUTATION,
        {
          id: company.id,
          input: {
            name: editDraft.name.trim(),
            sectorId: editDraft.sectorId || null,
            industryId: editDraft.industryId || null,
            activityId: editDraft.activityId || null,
            sector: selectedSector?.name ?? null,
            industry: selectedIndustry?.name ?? null,
            activity: selectedActivity?.name ?? null,
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

  const importInputRef = useRef<HTMLInputElement>(null);

  const exportCompany = async () => {
    if (!company) return;
    setError(null);
    setSuccess(null);
    try {
      const payload = await rest<Record<string, unknown>>(
        `/companies/${company.id}/export`,
        { method: 'GET' },
        token
      );
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${company.isin}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSuccess('Export downloaded');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(null);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const res = await rest<{ imported: Record<string, number>; isin: string }>(
        '/companies/import',
        { method: 'POST', body: JSON.stringify(payload) },
        token
      );
      const counts = Object.entries(res.imported)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      setSuccess(`Imported ${res.isin} — ${counts}`);
      await loadCompany();
      if (company?.id) await loadPeriods(company.id);
    } catch (err) {
      setError(`Import failed: ${(err as Error).message}`);
    } finally {
      e.target.value = '';
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
            <button className="secondary" onClick={exportCompany}>
              Export JSON
            </button>
            <button
              className="secondary"
              onClick={() => importInputRef.current?.click()}
            >
              Import JSON
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              onChange={onImportFile}
              style={{ display: 'none' }}
            />
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

        <CompanyTabs
          tabs={(
            [
              {
                id: 'editorial',
                label: 'Editorial',
                aliases: ['company-overview', 'pros-cons', 'faq'],
                render: () => <EditorialSection companyId={company.id} />
              },
              {
                id: 'details',
                label: 'Details',
                render: () => <CompanyDetailsSection companyId={company.id} />
              },
              {
                id: 'valuations',
                label: 'Valuations',
                render: () => <ValuationsSection companyId={company.id} />
              },
              {
                id: 'market',
                label: 'Market',
                aliases: ['periods', 'prices'],
                render: () => (
                  <div className="col" style={{ gap: 12 }}>
                    <PeriodsSection
                      companyId={company.id}
                      periods={periods}
                      onPeriodsChanged={(next) => setPeriods(next)}
                    />
                    <PriceHistorySection companyId={company.id} />
                  </div>
                )
              },
              {
                id: 'timeline',
                label: 'Timeline',
                render: () => <NewsEventsSection companyId={company.id} />
              },
              {
                id: 'people',
                label: 'People',
                aliases: ['team', 'shareholders'],
                render: () => (
                  <div className="col" style={{ gap: 12 }}>
                    <TeamSection companyId={company.id} />
                    <ShareholdersSection companyId={company.id} />
                  </div>
                )
              },
              {
                id: 'competitors',
                label: 'Competitors',
                render: () => (
                  <CompetitorsSection companyId={company.id} companyName={company.name} />
                )
              },
              {
                id: 'financials',
                label: 'Financials',
                render: () => (
                  <PeriodFinancialEditor companyId={company.id} periods={periods} />
                )
              }
            ] satisfies ReadonlyArray<CompanyTab>
          )}
        />

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
              <select
                value={editDraft.sectorId}
                onChange={(e) =>
                  setEditDraft((p) => ({
                    ...p,
                    sectorId: e.target.value,
                    industryId: '',
                    activityId: ''
                  }))
                }
              >
                <option value="">—</option>
                {trbcTree.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="col">
              <span>Industry</span>
              <select
                value={editDraft.industryId}
                disabled={!editDraft.sectorId}
                onChange={(e) =>
                  setEditDraft((p) => ({ ...p, industryId: e.target.value, activityId: '' }))
                }
              >
                <option value="">—</option>
                {trbcTree
                  .find((s) => s.id === editDraft.sectorId)
                  ?.industries.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="col">
              <span>Activity</span>
              <select
                value={editDraft.activityId}
                disabled={!editDraft.industryId}
                onChange={(e) => setEditDraft((p) => ({ ...p, activityId: e.target.value }))}
              >
                <option value="">—</option>
                {trbcTree
                  .find((s) => s.id === editDraft.sectorId)
                  ?.industries.find((i) => i.id === editDraft.industryId)
                  ?.activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
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
