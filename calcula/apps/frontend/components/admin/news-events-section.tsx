'use client';

import { useCallback, useEffect, useState } from 'react';
import { gql } from '@/lib/api';
import { useAuth } from '@/components/auth-context';
import { Modal } from '@/components/ui/modal';
import {
  COMPANY_NEWS_EVENTS_QUERY,
  DELETE_NEWS_EVENT_MUTATION,
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
          <h2 className="page-title">News & Events</h2>
          <p className="muted page-subtitle" style={{ margin: 0 }}>
            Editorial news, corporate actions, and regulatory notices. Shown in the storefront
            news panel and event timeline. Categories match the price-chart markers.
          </p>
        </div>
        <button onClick={openNew}>Add Event</button>
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
