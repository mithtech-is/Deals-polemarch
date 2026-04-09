'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { gql } from '@/lib/api';
import { useAuth } from '@/components/auth-context';
import { Modal } from '@/components/ui/modal';
import {
  COMPANY_NEWS_EVENTS_QUERY,
  DELETE_NEWS_EVENT_MUTATION,
  PUSH_NEWS_EVENTS_TO_PRICES_BULK_MUTATION,
  PUSH_NEWS_EVENT_TO_PRICES_MUTATION,
  UPSERT_NEWS_EVENT_BULK_MUTATION,
  UPSERT_NEWS_EVENT_MUTATION
} from '@/lib/queries';
import type { NewsEventItem, PriceEventCategory } from '@/types/domain';

type Category = PriceEventCategory;

const CATEGORY_OPTIONS: { value: Category; label: string; hint: string }[] = [
  { value: 'C', label: 'C — Corporate', hint: 'Earnings, dividend, split, M&A, fundraising' },
  { value: 'N', label: 'N — News', hint: 'Media coverage, industry updates, rumors' },
  { value: 'R', label: 'R — Regulatory', hint: 'SEBI notices, compliance, penalties' }
];

const CATEGORY_COLOR: Record<Category, string> = {
  C: '#059669',
  N: '#d97706',
  R: '#e11d48'
};

type Draft = {
  id: string | null;
  occurredAt: string; // yyyy-MM-ddTHH:mm
  category: Category;
  title: string;
  body: string;
  sourceUrl: string;
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

type Props = { companyId: string };

export function NewsEventsSection({ companyId }: Props) {
  const { token } = useAuth();
  const [events, setEvents] = useState<NewsEventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    id: null,
    occurredAt: '',
    category: 'C',
    title: '',
    body: '',
    sourceUrl: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pushingBulk, setPushingBulk] = useState(false);
  const [pushingIds, setPushingIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await gql<{ companyNewsEvents: NewsEventItem[] }>(
        COMPANY_NEWS_EVENTS_QUERY,
        { companyId },
        token
      );
      setEvents(res.companyNewsEvents ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [companyId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const openNew = () => {
    setDraft({
      id: null,
      occurredAt: toLocalDatetime(new Date().toISOString()),
      category: 'C',
      title: '',
      body: '',
      sourceUrl: ''
    });
    setIsOpen(true);
  };

  const openEdit = (row: NewsEventItem) => {
    setDraft({
      id: row.id,
      occurredAt: toLocalDatetime(row.occurredAt),
      category: row.category,
      title: row.title,
      body: row.body,
      sourceUrl: row.sourceUrl ?? ''
    });
    setIsOpen(true);
  };

  const save = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      if (!draft.title.trim()) throw new Error('Title is required');
      if (!draft.body.trim()) throw new Error('Body is required');
      if (!draft.occurredAt) throw new Error('Date is required');
      const occurredAt = new Date(draft.occurredAt).toISOString();
      await gql(
        UPSERT_NEWS_EVENT_MUTATION,
        {
          input: {
            id: draft.id || undefined,
            companyId,
            occurredAt,
            category: draft.category,
            title: draft.title.trim(),
            body: draft.body.trim(),
            sourceUrl: draft.sourceUrl.trim() || null
          }
        },
        token
      );
      setSuccess(draft.id ? 'Event updated' : 'Event added');
      setIsOpen(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const notifyPriceHistoryUpdated = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('calcula:price-history-updated', { detail: { companyId } })
    );
  }, [companyId]);

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
      const iOccurredAt = colIdx('occurredat');
      const iCategory = colIdx('category');
      const iTitle = colIdx('title');
      const iBody = colIdx('body');
      const iSourceUrl = colIdx('sourceurl');
      if (iOccurredAt < 0 || iCategory < 0 || iTitle < 0 || iBody < 0) {
        throw new Error(
          'CSV must contain occurredAt, category, title, body columns (sourceUrl optional)'
        );
      }
      // Simple split on comma — good enough for our authored CSVs. Users
      // that need embedded commas should wrap fields in quotes; we strip
      // matched leading/trailing quotes per field.
      const stripQuotes = (v: string) => v.replace(/^"(.*)"$/, '$1');
      const rows = lines.slice(1).map((line) => {
        const cells = line.split(',').map((c) => stripQuotes(c.trim()));
        const occurredAtRaw = cells[iOccurredAt] ?? '';
        const categoryRaw = (cells[iCategory] ?? '').toUpperCase();
        const title = cells[iTitle] ?? '';
        const body = cells[iBody] ?? '';
        const sourceUrl = iSourceUrl >= 0 ? cells[iSourceUrl] ?? '' : '';
        if (!['C', 'N', 'R'].includes(categoryRaw)) {
          throw new Error(`Invalid category "${categoryRaw}" — must be C, N or R`);
        }
        const d = new Date(occurredAtRaw);
        if (Number.isNaN(d.getTime())) {
          throw new Error(`Invalid occurredAt: ${occurredAtRaw}`);
        }
        if (!title) throw new Error('Title is required on every row');
        if (!body) throw new Error('Body is required on every row');
        return {
          companyId,
          occurredAt: d.toISOString(),
          category: categoryRaw,
          title,
          body,
          sourceUrl: sourceUrl || null
        };
      });
      await gql(
        UPSERT_NEWS_EVENT_BULK_MUTATION,
        { input: { companyId, rows } },
        token
      );
      setSuccess(`Imported ${rows.length} events`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      e.target.value = '';
    }
  };

  const downloadSample = () => {
    const header = 'occurredAt,category,title,body,sourceUrl';
    const today = new Date();
    const iso = (offsetDays: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - offsetDays);
      d.setHours(9, 0, 0, 0);
      return d.toISOString();
    };
    const rows = [
      `${iso(30)},C,"Q4 FY26 earnings","Revenue up 34% YoY; EBITDA margin expanded to 18%.",https://example.com/q4`,
      `${iso(14)},N,"Chittorgarh reports fresh GMP surge","Secondary market transfers up 15% this week.",`,
      `${iso(7)},R,"SEBI notice on disclosures","Compliance filing required by month-end.",`
    ];
    const csv = [header, ...rows].join('\n') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'timeline-sample.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const pushSingle = async (row: NewsEventItem) => {
    setError(null);
    setSuccess(null);
    setPushingIds((prev) => new Set(prev).add(row.id));
    try {
      const res = await gql<{
        pushNewsEventToPriceHistory: {
          priceHistoryId: string;
          datetime: string;
          matchedExact: boolean;
        };
      }>(PUSH_NEWS_EVENT_TO_PRICES_MUTATION, { eventId: row.id }, token);
      const r = res.pushNewsEventToPriceHistory;
      const when = new Date(r.datetime).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      setSuccess(
        `Pushed "${row.title}" to price on ${when} (${r.matchedExact ? 'exact date' : 'nearest date'})`
      );
      notifyPriceHistoryUpdated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPushingIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    }
  };

  const pushBulk = async () => {
    if (selectedIds.size === 0) return;
    setError(null);
    setSuccess(null);
    setPushingBulk(true);
    try {
      const res = await gql<{
        pushNewsEventsToPriceHistoryBulk: {
          pushed: number;
          skipped: Array<{ eventId: string; reason: string }>;
        };
      }>(
        PUSH_NEWS_EVENTS_TO_PRICES_BULK_MUTATION,
        { eventIds: Array.from(selectedIds) },
        token
      );
      const r = res.pushNewsEventsToPriceHistoryBulk;
      if (r.skipped.length) {
        setSuccess(
          `Pushed ${r.pushed}, skipped ${r.skipped.length}. First reason: ${r.skipped[0].reason}`
        );
      } else {
        setSuccess(`Pushed ${r.pushed} events to price history`);
      }
      setSelectedIds(new Set());
      notifyPriceHistoryUpdated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPushingBulk(false);
    }
  };

  const allSelected = useMemo(
    () => events.length > 0 && selectedIds.size === events.length,
    [events, selectedIds]
  );

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(events.map((e) => e.id)));
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const remove = async (row: NewsEventItem) => {
    if (!confirm(`Delete "${row.title}"?`)) return;
    setError(null);
    setSuccess(null);
    try {
      await gql(DELETE_NEWS_EVENT_MUTATION, { id: row.id }, token);
      setSuccess('Event deleted');
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="card col">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title">Timeline</h2>
          <p className="muted page-subtitle" style={{ margin: 0 }}>
            Important company events only. Shown in the storefront timeline. Categories match
            the price-chart markers.
          </p>
          <p className="muted" style={{ margin: '4px 0 0 0', fontSize: 11 }}>
            CSV format: <code>occurredAt,category,title,body,sourceUrl</code> · category is
            C (corporate), N (news) or R (regulatory).
          </p>
        </div>
        <div className="row">
          <button className="secondary" onClick={downloadSample}>
            Download sample
          </button>
          <label className="secondary" style={{ cursor: 'pointer' }}>
            Import CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvImport}
              style={{ display: 'none' }}
            />
          </label>
          <button
            className="secondary"
            onClick={pushBulk}
            disabled={selectedIds.size === 0 || pushingBulk}
          >
            {pushingBulk ? 'Pushing…' : `Push selected → Prices (${selectedIds.size})`}
          </button>
          <button onClick={openNew}>Add Event</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      {loading ? (
        <p className="muted" style={{ marginTop: 12 }}>
          Loading news events…
        </p>
      ) : events.length === 0 ? (
        <p className="muted" style={{ marginTop: 12 }}>
          No news events yet. Click "Add Event" to create one.
        </p>
      ) : (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="table-wide">
            <thead>
              <tr>
                <th style={{ width: 32 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
                <th>Date</th>
                <th>Tag</th>
                <th>Title</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleOne(row.id)}
                      aria-label={`Select ${row.title}`}
                    />
                  </td>
                  <td>{formatDatetime(row.occurredAt)}</td>
                  <td>
                    <span
                      title={CATEGORY_OPTIONS.find((o) => o.value === row.category)?.hint ?? ''}
                      style={{
                        display: 'inline-block',
                        minWidth: 22,
                        textAlign: 'center',
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: CATEGORY_COLOR[row.category],
                        color: 'white',
                        fontSize: 11,
                        fontWeight: 800
                      }}
                    >
                      {row.category}
                    </span>
                  </td>
                  <td style={{ maxWidth: 420, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <strong>{row.title}</strong>
                  </td>
                  <td>
                    {row.sourceUrl ? (
                      <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer">
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
                        onClick={() => pushSingle(row)}
                        disabled={pushingIds.has(row.id)}
                        title="Attach note/link/category to the nearest price row"
                      >
                        {pushingIds.has(row.id) ? 'Pushing…' : 'Push → Prices'}
                      </button>
                      <button
                        className="secondary"
                        onClick={() => remove(row)}
                        style={{ color: '#ef4444', borderColor: '#ef4444' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={draft.id ? 'Edit News Event' : 'Add News Event'}
      >
        <div className="grid grid-2" style={{ marginBottom: 20 }}>
          <label className="col">
            <span>Occurred At</span>
            <input
              type="datetime-local"
              value={draft.occurredAt}
              onChange={(e) => setDraft((p) => ({ ...p, occurredAt: e.target.value }))}
            />
          </label>
          <label className="col">
            <span>Category</span>
            <select
              value={draft.category}
              onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value as Category }))}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.hint}
                </option>
              ))}
            </select>
          </label>
          <label className="col" style={{ gridColumn: '1 / -1' }}>
            <span>Title</span>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Q3 FY26 earnings: revenue up 34% YoY"
            />
          </label>
          <label className="col" style={{ gridColumn: '1 / -1' }}>
            <span>Body (markdown)</span>
            <textarea
              rows={8}
              value={draft.body}
              onChange={(e) => setDraft((p) => ({ ...p, body: e.target.value }))}
              placeholder="Longer commentary. Supports **bold**, *italic*, and - bullet lists."
            />
          </label>
          <label className="col" style={{ gridColumn: '1 / -1' }}>
            <span>Source URL (optional)</span>
            <input
              type="url"
              value={draft.sourceUrl}
              onChange={(e) => setDraft((p) => ({ ...p, sourceUrl: e.target.value }))}
              placeholder="https://..."
            />
          </label>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button className="secondary" onClick={() => setIsOpen(false)}>
            Cancel
          </button>
          <button onClick={save} disabled={submitting}>
            {submitting ? 'Saving…' : draft.id ? 'Update' : 'Add'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
