'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import JSZip from 'jszip';
import { gql, rest } from '@/lib/api';
import { useAuth } from '@/components/auth-context';
import { DashboardPage } from '@/components/dashboard/template';
import { RequireAuth } from '@/components/require-auth';
import { Modal } from '@/components/ui/modal';
import { COMPANIES_QUERY, CREATE_COMPANY_MUTATION } from '@/lib/queries';
import type { Company } from '@/types/domain';

const ISIN_REGEX = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<null | 'export' | 'sync' | 'import'>(null);
  const [status, setStatus] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

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

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected =
    sortedCompanies.length > 0 && sortedCompanies.every((c) => selectedIds.has(c.id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        for (const c of sortedCompanies) next.delete(c.id);
        return next;
      }
      const next = new Set(prev);
      for (const c of sortedCompanies) next.add(c.id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedCompanies = useMemo(
    () => sortedCompanies.filter((c) => selectedIds.has(c.id)),
    [sortedCompanies, selectedIds]
  );

  const exportSelected = async () => {
    if (selectedCompanies.length === 0) return;
    setBulkBusy('export');
    setError(null);
    setStatus(null);
    try {
      if (selectedCompanies.length === 1) {
        const c = selectedCompanies[0];
        const payload = await rest<Record<string, unknown>>(
          `/companies/${c.id}/export`,
          { method: 'GET' },
          token
        );
        downloadBlob(
          new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
          `${c.isin}-${new Date().toISOString().slice(0, 10)}.json`
        );
        setStatus(`Exported ${c.isin}`);
        return;
      }

      const zip = new JSZip();
      let ok = 0;
      for (const c of selectedCompanies) {
        try {
          const payload = await rest<Record<string, unknown>>(
            `/companies/${c.id}/export`,
            { method: 'GET' },
            token
          );
          zip.file(`${c.isin}.json`, JSON.stringify(payload, null, 2));
          ok += 1;
        } catch (e) {
          console.error('Export failed for', c.isin, e);
        }
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(
        blob,
        `calcula-companies-${new Date().toISOString().slice(0, 10)}.zip`
      );
      setStatus(`Exported ${ok} of ${selectedCompanies.length} companies to zip`);
    } catch (e) {
      setError(`Export failed: ${(e as Error).message}`);
    } finally {
      setBulkBusy(null);
    }
  };

  const syncSelected = async () => {
    if (selectedCompanies.length === 0) return;
    if (!confirm(`Push ${selectedCompanies.length} compan${selectedCompanies.length === 1 ? 'y' : 'ies'} to the product pages (storefront)?`)) {
      return;
    }
    setBulkBusy('sync');
    setError(null);
    setStatus(null);
    let ok = 0;
    let failed = 0;
    for (const c of selectedCompanies) {
      try {
        await rest<{ success: boolean }>(
          `/companies/${c.id}/sync`,
          { method: 'POST' },
          token
        );
        ok += 1;
      } catch (e) {
        failed += 1;
        console.error('Sync failed for', c.isin, e);
      }
    }
    setBulkBusy(null);
    if (failed === 0) setStatus(`Pushed ${ok} companies to product pages`);
    else setError(`Pushed ${ok}, failed ${failed}. Check console for details.`);
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setStatus(null);
    setBulkBusy('import');
    try {
      const isZip =
        /\.zip$/i.test(file.name) ||
        file.type === 'application/zip' ||
        file.type === 'application/x-zip-compressed';

      const payloads: Array<{ name: string; data: unknown }> = [];
      if (isZip) {
        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        const jsonEntries = Object.values(zip.files).filter(
          (f) => !f.dir && /\.json$/i.test(f.name)
        );
        if (jsonEntries.length === 0) throw new Error('Zip contains no .json files');
        for (const entry of jsonEntries) {
          const text = await entry.async('string');
          payloads.push({ name: entry.name, data: JSON.parse(text) });
        }
      } else {
        const text = await file.text();
        payloads.push({ name: file.name, data: JSON.parse(text) });
      }

      let ok = 0;
      let failed = 0;
      const lines: string[] = [];
      for (const p of payloads) {
        try {
          const res = await rest<{ imported: Record<string, number>; isin: string }>(
            '/companies/import',
            { method: 'POST', body: JSON.stringify(p.data) },
            token
          );
          ok += 1;
          const counts = Object.entries(res.imported)
            .map(([k, v]) => `${k}:${v}`)
            .join(' ');
          lines.push(`✓ ${res.isin} (${counts})`);
        } catch (err) {
          failed += 1;
          lines.push(`✗ ${p.name}: ${(err as Error).message}`);
        }
      }

      // Reload list so newly imported companies show up.
      gql<{ companies: Company[] }>(COMPANIES_QUERY, { q: debouncedSearch || undefined }, token)
        .then((res) => setCompanies(res.companies ?? []))
        .catch(() => undefined);

      if (failed === 0) setStatus(`Imported ${ok} company file${ok === 1 ? '' : 's'}\n${lines.join('\n')}`);
      else setError(`Imported ${ok}, failed ${failed}\n${lines.join('\n')}`);
    } catch (err) {
      setError(`Import failed: ${(err as Error).message}`);
    } finally {
      setBulkBusy(null);
      e.target.value = '';
    }
  };

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
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button
              className="secondary"
              onClick={() => importInputRef.current?.click()}
              disabled={bulkBusy !== null}
              title="Import a single .json export or a .zip of multiple company exports"
            >
              {bulkBusy === 'import' ? 'Importing…' : 'Import JSON / ZIP'}
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json,application/zip,.zip"
              onChange={onImportFile}
              style={{ display: 'none' }}
            />
            <button onClick={openNew}>+ Create Company</button>
          </div>
        </div>

        {/* Bulk-action toolbar — visible only when something is selected */}
        {selectedIds.size > 0 && (
          <div
            className="row"
            style={{
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 12,
              flexWrap: 'wrap'
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>
              {selectedIds.size} selected
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button
                className="secondary"
                onClick={toggleSelectAll}
                disabled={bulkBusy !== null}
              >
                {allVisibleSelected ? 'Deselect visible' : 'Select all visible'}
              </button>
              <button
                className="secondary"
                onClick={clearSelection}
                disabled={bulkBusy !== null}
              >
                Clear
              </button>
              <button onClick={exportSelected} disabled={bulkBusy !== null}>
                {bulkBusy === 'export'
                  ? 'Exporting…'
                  : selectedIds.size === 1
                    ? 'Export JSON'
                    : `Export ${selectedIds.size} as ZIP`}
              </button>
              <button onClick={syncSelected} disabled={bulkBusy !== null}>
                {bulkBusy === 'sync' ? 'Pushing…' : 'Push to product pages'}
              </button>
            </div>
          </div>
        )}

        {error && <p className="error" style={{ whiteSpace: 'pre-wrap' }}>{error}</p>}
        {status && <p className="success" style={{ whiteSpace: 'pre-wrap' }}>{status}</p>}
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
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(company.id)}
                    onChange={() => toggleSelected(company.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select ${company.name}`}
                    style={{ marginTop: 4, cursor: 'pointer' }}
                  />
                  <h3 className="page-title" style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>
                    {company.name}
                  </h3>
                </div>
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
