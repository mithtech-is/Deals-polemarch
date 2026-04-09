'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { gql } from '@/lib/api';
import { useAuth } from '@/components/auth-context';
import { Modal } from '@/components/ui/modal';
import {
  COMPANY_PRICE_HISTORY_QUERY,
  DELETE_COMPANY_PRICE_BULK_MUTATION,
  DELETE_COMPANY_PRICE_MUTATION,
  UPSERT_COMPANY_PRICE_BULK_MUTATION,
  UPSERT_COMPANY_PRICE_MUTATION
} from '@/lib/queries';
import type { CompanyPricePoint } from '@/types/domain';

type Props = { companyId: string };

type CategoryChoice = '' | 'C' | 'N' | 'R';

type EditDraft = {
  id: string | null;
  datetime: string; // "YYYY-MM-DDTHH:mm" for the datetime-local input
  price: string;
  note: string;
  link: string;
  category: CategoryChoice;
};

type BulkEditField = 'price' | 'note' | 'link' | 'category' | 'clear-event';

type BulkDraft = {
  field: BulkEditField;
  // Used by price (number), note/link (string), category (CategoryChoice).
  // clear-event uses no value.
  value: string;
};

const CATEGORY_OPTIONS: { value: CategoryChoice; label: string; hint: string }[] = [
  { value: '', label: 'None', hint: 'Plain price point' },
  { value: 'C', label: 'C — Corporate', hint: 'Earnings, dividend, split, M&A, fundraising' },
  { value: 'N', label: 'N — News', hint: 'Media coverage, industry updates, rumors' },
  { value: 'R', label: 'R — Regulatory', hint: 'SEBI notices, compliance, penalties' }
];

const CATEGORY_COLOR: Record<Exclude<CategoryChoice, ''>, string> = {
  C: '#059669', // emerald
  N: '#d97706', // amber
  R: '#e11d48'  // rose
};

function toLocalDatetime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDatetime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function PriceHistorySection({ companyId }: Props) {
  const { token } = useAuth();
  const [rows, setRows] = useState<CompanyPricePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draft, setDraft] = useState<EditDraft>({
    id: null,
    datetime: '',
    price: '',
    note: '',
    link: '',
    category: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Bulk selection state. Set of row ids currently ticked. Cleared on any
  // reload (the Set holds stringified CompanyPricePoint.id values).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkDraft, setBulkDraft] = useState<BulkDraft>({ field: 'category', value: '' });

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await gql<{ companyPriceHistory: CompanyPricePoint[] }>(
        COMPANY_PRICE_HISTORY_QUERY,
        { companyId },
        token
      );
      setRows(res.companyPriceHistory ?? []);
      // Drop any selections that no longer exist after the refetch.
      setSelectedIds((prev) => {
        const validIds = new Set((res.companyPriceHistory ?? []).map((r: CompanyPricePoint) => r.id));
        const next = new Set<string>();
        for (const id of prev) if (validIds.has(id)) next.add(id);
        return next;
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [companyId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  // Sibling components (e.g. the Timeline section) can push events onto
  // price history; when they do, they dispatch this event so we refetch
  // without requiring a shared parent state tree.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ companyId?: string }>).detail;
      if (!detail?.companyId || detail.companyId === companyId) {
        void load();
      }
    };
    window.addEventListener('calcula:price-history-updated', handler as EventListener);
    return () =>
      window.removeEventListener('calcula:price-history-updated', handler as EventListener);
  }, [companyId, load]);

  const latest = rows.length ? rows[0] : null; // server returns DESC

  const openNew = () => {
    setDraft({
      id: null,
      datetime: toLocalDatetime(new Date().toISOString()),
      price: '',
      note: '',
      link: '',
      category: ''
    });
    setIsModalOpen(true);
  };

  const openEdit = (row: CompanyPricePoint) => {
    setDraft({
      id: row.id,
      datetime: toLocalDatetime(row.datetime),
      price: String(row.price),
      note: row.note ?? '',
      link: row.link ?? '',
      category: (row.category ?? '') as CategoryChoice
    });
    setIsModalOpen(true);
  };

  const saveDraft = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      if (!draft.datetime) throw new Error('Datetime is required');
      const price = Number(draft.price);
      if (!Number.isFinite(price)) throw new Error('Price must be a valid number');

      const datetimeIso = new Date(draft.datetime).toISOString();
      await gql(
        UPSERT_COMPANY_PRICE_MUTATION,
        {
          companyId,
          input: {
            datetime: datetimeIso,
            price,
            note: draft.note.trim() || null,
            link: draft.link.trim() || null,
            category: draft.category || null
          }
        },
        token
      );
      setSuccess(draft.id ? 'Price updated' : 'Price added');
      setIsModalOpen(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRow = async (row: CompanyPricePoint) => {
    if (!confirm(`Delete the price entry for ${formatDatetime(row.datetime)}?`)) return;
    setError(null);
    setSuccess(null);
    try {
      await gql(DELETE_COMPANY_PRICE_MUTATION, { id: row.id }, token);
      setSuccess('Entry deleted');
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // ── Bulk selection + bulk actions ──────────────────────────────

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (prev.size === rows.length) return new Set();
      return new Set(rows.map((r) => r.id));
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const openBulkEdit = () => {
    setBulkDraft({ field: 'category', value: '' });
    setBulkModalOpen(true);
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} selected price row${ids.length === 1 ? '' : 's'}? This cannot be undone.`)) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await gql<{ deleteCompanyPriceBulk: number }>(
        DELETE_COMPANY_PRICE_BULK_MUTATION,
        { companyId, ids },
        token
      );
      const n = res.deleteCompanyPriceBulk ?? 0;
      setSuccess(`Deleted ${n} row${n === 1 ? '' : 's'}`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const saveBulkEdit = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      // Validate per-field.
      let parsedPrice: number | null = null;
      if (bulkDraft.field === 'price') {
        parsedPrice = Number(bulkDraft.value);
        if (!Number.isFinite(parsedPrice)) {
          throw new Error('Price must be a valid number');
        }
      }
      if (bulkDraft.field === 'category') {
        if (bulkDraft.value && !['C', 'N', 'R'].includes(bulkDraft.value)) {
          throw new Error('Category must be C, N, or R (or blank to clear)');
        }
      }

      // Build the merged entries array. We upsert on the EXISTING
      // (companyId, datetime) keys, so every row hits the update path —
      // no new rows are inserted. We copy every unchanged field through.
      const entries = rows
        .filter((r) => selectedIds.has(r.id))
        .map((r) => {
          const base = {
            datetime: r.datetime,
            price: r.price,
            note: r.note ?? null,
            link: r.link ?? null,
            category: r.category ?? null
          };
          switch (bulkDraft.field) {
            case 'price':
              return { ...base, price: parsedPrice! };
            case 'note':
              return { ...base, note: bulkDraft.value.trim() || null };
            case 'link':
              return { ...base, link: bulkDraft.value.trim() || null };
            case 'category':
              return { ...base, category: bulkDraft.value || null };
            case 'clear-event':
              return { ...base, note: null, link: null, category: null };
          }
        });

      await gql(UPSERT_COMPANY_PRICE_BULK_MUTATION, { companyId, entries }, token);
      setSuccess(`Updated ${entries.length} row${entries.length === 1 ? '' : 's'}`);
      setBulkModalOpen(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(null);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) throw new Error('CSV must have header + at least one row');
      const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const colIdx = (name: string) => header.indexOf(name);
      const iDatetime = colIdx('datetime');
      const iPrice = colIdx('price');
      const iNote = colIdx('note');
      const iLink = colIdx('link');
      const iCategory = colIdx('category');
      if (iDatetime < 0 || iPrice < 0) {
        throw new Error('CSV must contain datetime and price columns');
      }
      const entries = lines.slice(1).map((line) => {
        const cells = line.split(',');
        const datetimeRaw = cells[iDatetime]?.trim() ?? '';
        const priceRaw = cells[iPrice]?.trim() ?? '';
        const note = iNote >= 0 ? cells[iNote]?.trim() ?? null : null;
        const link = iLink >= 0 ? cells[iLink]?.trim() ?? null : null;
        const catRaw = iCategory >= 0 ? (cells[iCategory]?.trim().toUpperCase() ?? '') : '';
        const category = catRaw === 'C' || catRaw === 'N' || catRaw === 'R' ? catRaw : null;
        const d = new Date(datetimeRaw);
        if (Number.isNaN(d.getTime())) {
          throw new Error(`Invalid datetime: ${datetimeRaw}`);
        }
        const p = Number(priceRaw);
        if (!Number.isFinite(p)) {
          throw new Error(`Invalid price: ${priceRaw}`);
        }
        return {
          datetime: d.toISOString(),
          price: p,
          note: note || null,
          link: link || null,
          category
        };
      });
      await gql(UPSERT_COMPANY_PRICE_BULK_MUTATION, { companyId, entries }, token);
      setSuccess(`Imported ${entries.length} rows`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      e.target.value = '';
    }
  };

  const eventCount = useMemo(
    () => rows.filter((r) => r.note || r.link || r.category).length,
    [rows]
  );

  const downloadSample = () => {
    const header = 'datetime,price,note,link,category';
    const today = new Date();
    const iso = (offsetDays: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - offsetDays);
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    };
    // Mix of plain points + events with each of the three categories.
    const sampleRows = [
      `${iso(180)},125.00,,,`,
      `${iso(150)},118.50,,,`,
      `${iso(120)},95.20,"Quarterly results announced",https://example.com/q1-results,C`,
      `${iso(90)},72.30,,,`,
      `${iso(60)},46.00,"INR 3500 Cr CCPS B rights issue at INR 96.8",https://example.com/rights-issue,C`,
      `${iso(45)},30.00,"SEBI notice on beneficial ownership disclosures",,R`,
      `${iso(30)},22.80,,,`,
      `${iso(7)},12.50,"Secondary market transfer at premium",,N`,
      `${iso(0)},6.50,,,`
    ];
    const csv = [header, ...sampleRows].join('\n') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'price-history-sample.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card col">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title">Price Data</h2>
          <p className="muted page-subtitle" style={{ margin: 0 }}>
            Calcula is the source of truth. Entries with a note or link appear as event pins on the storefront chart.
          </p>
          <p className="muted" style={{ margin: '4px 0 0 0', fontSize: 11 }}>
            CSV format: <code>datetime,price,note,link,category</code> · <code>category</code> is optional: C (corporate), N (news), R (regulatory). Download a sample below to see the expected shape.
          </p>
        </div>
        <div className="row">
          <button className="secondary" onClick={downloadSample} title="Download an example CSV with the correct headers">
            Download sample
          </button>
          <label className="secondary" style={{ cursor: 'pointer' }}>
            Import CSV
            <input type="file" accept=".csv" onChange={handleCsvImport} style={{ display: 'none' }} />
          </label>
          <button onClick={openNew}>Update Price</button>
        </div>
      </div>

      {/* Latest price card */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          border: '1px solid #a7f3d0',
          marginTop: 12
        }}
      >
        {latest ? (
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
                Latest Price
              </p>
              <p style={{ fontSize: 28, fontWeight: 800, margin: '4px 0 0 0' }}>
                ₹ {latest.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
              <p className="muted" style={{ fontSize: 12, margin: '4px 0 0 0' }}>
                as of {formatDatetime(latest.datetime)}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="muted" style={{ fontSize: 10, margin: 0 }}>
                {rows.length} entries · {eventCount} events
              </p>
              {(latest.note || latest.link) && (
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: 6,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: '#059669',
                    color: 'white',
                    fontSize: 10,
                    fontWeight: 700
                  }}
                >
                  EVENT
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            {loading ? 'Loading price history…' : 'No price history yet. Click "Update Price" to add one.'}
          </p>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      {/* Bulk selection action bar */}
      {selectedIds.size > 0 && (
        <div
          className="row"
          style={{
            marginTop: 12,
            padding: '10px 14px',
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          <span style={{ fontWeight: 700, color: '#047857' }}>
            {selectedIds.size} selected
          </span>
          <div className="row" style={{ gap: 8 }}>
            <button className="secondary" onClick={openBulkEdit}>
              Bulk Edit
            </button>
            <button
              className="secondary"
              onClick={bulkDelete}
              style={{ color: '#dc2626', borderColor: '#fca5a5' }}
            >
              Delete {selectedIds.size} row{selectedIds.size === 1 ? '' : 's'}
            </button>
            <button className="secondary" onClick={clearSelection}>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* History table */}
      {rows.length > 0 && (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="table-wide">
            <thead>
              <tr>
                <th style={{ width: 32 }}>
                  <input
                    type="checkbox"
                    aria-label="Select all rows"
                    checked={rows.length > 0 && selectedIds.size === rows.length}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate =
                          selectedIds.size > 0 && selectedIds.size < rows.length;
                      }
                    }}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Datetime</th>
                <th style={{ textAlign: 'right' }}>Price</th>
                <th>Tag</th>
                <th>Note</th>
                <th>Link</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isEvent = Boolean(row.note || row.link || row.category);
                const cat = (row.category ?? null) as Exclude<CategoryChoice, ''> | null;
                const isSelected = selectedIds.has(row.id);
                return (
                  <tr
                    key={row.id}
                    style={{
                      background: isSelected ? '#ecfdf5' : undefined
                    }}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(row.id)}
                        aria-label={`Select row ${row.id}`}
                      />
                    </td>
                    <td>
                      {formatDatetime(row.datetime)}
                      {isEvent && (
                        <span
                          style={{
                            display: 'inline-block',
                            marginLeft: 8,
                            padding: '1px 6px',
                            borderRadius: 999,
                            background: cat ? CATEGORY_COLOR[cat] : '#059669',
                            color: 'white',
                            fontSize: 9,
                            fontWeight: 700
                          }}
                        >
                          EVENT
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      ₹ {row.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td>
                      {cat ? (
                        <span
                          title={CATEGORY_OPTIONS.find((o) => o.value === cat)?.hint ?? ''}
                          style={{
                            display: 'inline-block',
                            minWidth: 22,
                            textAlign: 'center',
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: CATEGORY_COLOR[cat],
                            color: 'white',
                            fontSize: 11,
                            fontWeight: 800
                          }}
                        >
                          {cat}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ maxWidth: 320, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.note ?? '—'}
                    </td>
                    <td>
                      {row.link ? (
                        <a href={row.link} target="_blank" rel="noopener noreferrer">
                          Open
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <button className="secondary" onClick={() => openEdit(row)}>
                          Edit
                        </button>
                        <button
                          className="secondary"
                          onClick={() => deleteRow(row)}
                          style={{ color: '#ef4444', borderColor: '#ef4444' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={draft.id ? 'Edit Price Entry' : 'Add Price Entry'}>
        <div className="grid grid-2" style={{ marginBottom: 20 }}>
          <label className="col">
            <span>Datetime</span>
            <input
              type="datetime-local"
              value={draft.datetime}
              onChange={(e) => setDraft((p) => ({ ...p, datetime: e.target.value }))}
            />
          </label>
          <label className="col">
            <span>Price (₹)</span>
            <input
              type="number"
              step="0.01"
              value={draft.price}
              onChange={(e) => setDraft((p) => ({ ...p, price: e.target.value }))}
            />
          </label>
          <label className="col" style={{ gridColumn: '1 / -1' }}>
            <span>Category (optional — drives chart marker colour)</span>
            <select
              value={draft.category}
              onChange={(e) =>
                setDraft((p) => ({ ...p, category: e.target.value as CategoryChoice }))
              }
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value || 'none'} value={opt.value}>
                  {opt.label} {opt.value ? `— ${opt.hint}` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="col" style={{ gridColumn: '1 / -1' }}>
            <span>Note (optional)</span>
            <textarea
              rows={3}
              value={draft.note}
              onChange={(e) => setDraft((p) => ({ ...p, note: e.target.value }))}
              placeholder="e.g. INR 3500 Cr CCPS B rights issue at INR 96.8"
            />
          </label>
          <label className="col" style={{ gridColumn: '1 / -1' }}>
            <span>Link (optional)</span>
            <input
              type="url"
              value={draft.link}
              onChange={(e) => setDraft((p) => ({ ...p, link: e.target.value }))}
              placeholder="https://..."
            />
          </label>
        </div>
        <p className="muted" style={{ fontSize: 11, marginBottom: 12 }}>
          Any row with a category, note, or link becomes an event pin on the storefront price chart. Category sets the marker colour.
        </p>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button className="secondary" onClick={() => setIsModalOpen(false)}>
            Cancel
          </button>
          <button onClick={saveDraft} disabled={submitting}>
            {submitting ? 'Saving…' : draft.id ? 'Update' : 'Add'}
          </button>
        </div>
      </Modal>

      {/* Bulk edit modal */}
      <Modal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title={`Bulk edit ${selectedIds.size} row${selectedIds.size === 1 ? '' : 's'}`}
      >
        <div className="col" style={{ gap: 16 }}>
          <label className="col">
            <span>Field to update</span>
            <select
              value={bulkDraft.field}
              onChange={(e) =>
                setBulkDraft({ field: e.target.value as BulkEditField, value: '' })
              }
            >
              <option value="category">Category</option>
              <option value="price">Price</option>
              <option value="note">Note</option>
              <option value="link">Link</option>
              <option value="clear-event">Clear event (remove note, link, category)</option>
            </select>
          </label>

          {bulkDraft.field === 'price' && (
            <label className="col">
              <span>New price (₹) — applied to all selected rows</span>
              <input
                type="number"
                step="0.01"
                value={bulkDraft.value}
                onChange={(e) => setBulkDraft((p) => ({ ...p, value: e.target.value }))}
              />
            </label>
          )}

          {bulkDraft.field === 'category' && (
            <label className="col">
              <span>New category</span>
              <select
                value={bulkDraft.value}
                onChange={(e) => setBulkDraft((p) => ({ ...p, value: e.target.value }))}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value || 'none'} value={opt.value}>
                    {opt.label} {opt.value ? `— ${opt.hint}` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}

          {bulkDraft.field === 'note' && (
            <label className="col">
              <span>New note (blank to clear)</span>
              <textarea
                rows={3}
                value={bulkDraft.value}
                onChange={(e) => setBulkDraft((p) => ({ ...p, value: e.target.value }))}
              />
            </label>
          )}

          {bulkDraft.field === 'link' && (
            <label className="col">
              <span>New link (blank to clear)</span>
              <input
                type="url"
                value={bulkDraft.value}
                onChange={(e) => setBulkDraft((p) => ({ ...p, value: e.target.value }))}
              />
            </label>
          )}

          {bulkDraft.field === 'clear-event' && (
            <p className="muted" style={{ fontSize: 12 }}>
              This will clear <strong>note</strong>, <strong>link</strong> and <strong>category</strong> on all
              selected rows. The price and datetime are preserved.
            </p>
          )}

          <p className="muted" style={{ fontSize: 11 }}>
            Only the chosen field changes — every other column on the selected rows stays as-is.
          </p>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="secondary" onClick={() => setBulkModalOpen(false)}>
            Cancel
          </button>
          <button onClick={saveBulkEdit} disabled={submitting}>
            {submitting ? 'Saving…' : `Apply to ${selectedIds.size}`}
          </button>
        </div>
      </Modal>
    </div>
  );
}
