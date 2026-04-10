'use client';

import { useCallback, useEffect, useState } from 'react';
import { gql } from '@/lib/api';
import { useAuth } from '@/components/auth-context';
import {
  COMPANY_COMPETITORS_QUERY,
  UPSERT_COMPANY_COMPETITORS_MUTATION
} from '@/lib/queries';
import type { CompanyCompetitorEntry, CompanyCompetitors } from '@/types/domain';

type Props = { companyId: string; companyName?: string };

/**
 * Competitors editor with comparative commentary. Each row captures a
 * competitor's name, ISIN (optional), an external link, what the
 * competitor does better, what this company does better, and an extra
 * note field. Storefront renders this as a comparison card.
 */
export function CompetitorsSection({ companyId, companyName }: Props) {
  const { token } = useAuth();
  const [entries, setEntries] = useState<CompanyCompetitorEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await gql<{ companyCompetitors: CompanyCompetitors | null }>(
        COMPANY_COMPETITORS_QUERY,
        { companyId },
        token
      );
      setEntries(res.companyCompetitors?.entries ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [companyId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateField = (
    index: number,
    key: keyof CompanyCompetitorEntry,
    value: string
  ) => {
    setEntries((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    );
  };

  const addRow = () => {
    setEntries((prev) => [
      ...prev,
      { name: '', isin: '', link: '', theirEdge: '', ourEdge: '', note: '' }
    ]);
  };

  const removeRow = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    setEntries((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const cleaned = entries
        .map((e) => ({
          name: e.name.trim(),
          isin: (e.isin ?? '').trim() || null,
          link: (e.link ?? '').trim() || null,
          theirEdge: (e.theirEdge ?? '').trim() || null,
          ourEdge: (e.ourEdge ?? '').trim() || null,
          note: (e.note ?? '').trim() || null
        }))
        .filter((e) => e.name);
      await gql(
        UPSERT_COMPANY_COMPETITORS_MUTATION,
        { input: { companyId, entries: cleaned } },
        token
      );
      setEntries(cleaned);
      setSuccess(`Competitors saved (${cleaned.length} entries)`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const ourName = companyName || 'this company';

  return (
    <div className="card col">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title">Competitors</h2>
          <p className="muted page-subtitle" style={{ margin: 0 }}>
            Side-by-side comparison of direct competitors. Use "Their edge" for what the
            competitor does better, "Our edge" for what <strong>{ourName}</strong> does better.
            If the competitor is a listed company, paste the ISIN and a link to its page.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="secondary" onClick={addRow}>
            Add competitor
          </button>
          <button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Competitors'}
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      {loading && <p className="muted" style={{ marginTop: 12 }}>Loading competitors…</p>}

      {entries.length === 0 && !loading ? (
        <p className="muted" style={{ marginTop: 12 }}>
          No competitors yet. Click "Add competitor" to create one.
        </p>
      ) : (
        <div className="col" style={{ marginTop: 12, gap: 12 }}>
          {entries.map((row, index) => (
            <div
              key={index}
              className="col"
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: 12,
                gap: 8
              }}
            >
              <div className="grid grid-2" style={{ gap: 8 }}>
                <label className="col">
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Name</span>
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateField(index, 'name', e.target.value)}
                    placeholder="e.g. Tata 1mg"
                  />
                </label>
                <label className="col">
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                    ISIN (optional)
                  </span>
                  <input
                    type="text"
                    value={row.isin ?? ''}
                    onChange={(e) => updateField(index, 'isin', e.target.value.toUpperCase())}
                    placeholder="INE0XXYY01234"
                    maxLength={12}
                  />
                </label>
                <label className="col" style={{ gridColumn: '1 / -1' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                    Link (optional — storefront makes the name clickable)
                  </span>
                  <input
                    type="url"
                    value={row.link ?? ''}
                    onChange={(e) => updateField(index, 'link', e.target.value)}
                    placeholder="https://deals.polemarch.in/deals/… or external URL"
                  />
                </label>
                <label className="col">
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>
                    Their edge — what they do better
                  </span>
                  <textarea
                    rows={3}
                    value={row.theirEdge ?? ''}
                    onChange={(e) => updateField(index, 'theirEdge', e.target.value)}
                    placeholder="e.g. Larger OTC catalogue, deeper partnership with Tata Neu, insurer integrations"
                  />
                </label>
                <label className="col">
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>
                    Our edge — what {ourName} does better
                  </span>
                  <textarea
                    rows={3}
                    value={row.ourEdge ?? ''}
                    onChange={(e) => updateField(index, 'ourEdge', e.target.value)}
                    placeholder={`e.g. Vertically-integrated diagnostics via Thyrocare, larger user base, private-label mix`}
                  />
                </label>
                <label className="col" style={{ gridColumn: '1 / -1' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                    Extra note (optional)
                  </span>
                  <textarea
                    rows={2}
                    value={row.note ?? ''}
                    onChange={(e) => updateField(index, 'note', e.target.value)}
                    placeholder="Any other context — funding stage, valuation, recent news"
                  />
                </label>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div className="row" style={{ gap: 4 }}>
                  <button
                    className="secondary"
                    onClick={() => moveRow(index, -1)}
                    disabled={index === 0}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    className="secondary"
                    onClick={() => moveRow(index, 1)}
                    disabled={index === entries.length - 1}
                    title="Move down"
                  >
                    ↓
                  </button>
                </div>
                <button
                  className="secondary"
                  onClick={() => removeRow(index)}
                  style={{ color: '#ef4444', borderColor: '#ef4444' }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
