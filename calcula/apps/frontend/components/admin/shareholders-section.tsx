'use client';

import { useCallback, useEffect, useState } from 'react';
import { gql } from '@/lib/api';
import { useAuth } from '@/components/auth-context';
import {
  COMPANY_SHAREHOLDERS_QUERY,
  UPSERT_COMPANY_SHAREHOLDERS_MUTATION
} from '@/lib/queries';
import type { CompanyShareholderEntry, CompanyShareholders } from '@/types/domain';

type Props = { companyId: string };

const TYPE_SUGGESTIONS = [
  'Founder',
  'Co-founder',
  'Promoter',
  'Institutional',
  'Strategic',
  'Employee Trust',
  'Public'
];

export function ShareholdersSection({ companyId }: Props) {
  const { token } = useAuth();
  const [entries, setEntries] = useState<CompanyShareholderEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await gql<{ companyShareholders: CompanyShareholders | null }>(
        COMPANY_SHAREHOLDERS_QUERY,
        { companyId },
        token
      );
      setEntries(res.companyShareholders?.entries ?? []);
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
    key: keyof CompanyShareholderEntry,
    value: string
  ) => {
    setEntries((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    );
  };

  const addRow = () => {
    setEntries((prev) => [
      ...prev,
      { name: '', type: 'Institutional', stakePercent: '', since: '', note: '' }
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
          type: e.type.trim(),
          stakePercent: (e.stakePercent ?? '').trim() || null,
          since: (e.since ?? '').trim() || null,
          note: (e.note ?? '').trim() || null
        }))
        .filter((e) => e.name && e.type);
      await gql(
        UPSERT_COMPANY_SHAREHOLDERS_MUTATION,
        { input: { companyId, entries: cleaned } },
        token
      );
      setEntries(cleaned);
      setSuccess(`Shareholders saved (${cleaned.length} entries)`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card col">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="page-title">Major Shareholders</h2>
          <p className="muted page-subtitle" style={{ margin: 0 }}>
            Promoters, founders, institutional investors, and large strategic holders. Rows
            with empty name or type are dropped on save.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="secondary" onClick={addRow}>
            Add shareholder
          </button>
          <button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Shareholders'}
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      {loading && <p className="muted" style={{ marginTop: 12 }}>Loading shareholders…</p>}

      {entries.length === 0 && !loading ? (
        <p className="muted" style={{ marginTop: 12 }}>
          No shareholders yet. Click "Add shareholder" to create one.
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
                    placeholder="e.g. Prosus / Temasek / Dharmil Sheth"
                  />
                </label>
                <label className="col">
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Type</span>
                  <input
                    type="text"
                    value={row.type}
                    onChange={(e) => updateField(index, 'type', e.target.value)}
                    placeholder="Institutional / Founder / Strategic…"
                    list={`sh-type-${index}`}
                  />
                  <datalist id={`sh-type-${index}`}>
                    {TYPE_SUGGESTIONS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </label>
                <label className="col">
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Stake %</span>
                  <input
                    type="text"
                    value={row.stakePercent ?? ''}
                    onChange={(e) => updateField(index, 'stakePercent', e.target.value)}
                    placeholder="~12.5%"
                  />
                </label>
                <label className="col">
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Since</span>
                  <input
                    type="text"
                    value={row.since ?? ''}
                    onChange={(e) => updateField(index, 'since', e.target.value)}
                    placeholder="2021 or Aug 2023"
                  />
                </label>
                <label className="col" style={{ gridColumn: '1 / -1' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Note (optional)</span>
                  <textarea
                    rows={2}
                    value={row.note ?? ''}
                    onChange={(e) => updateField(index, 'note', e.target.value)}
                    placeholder="Anchor investor of rights issue, board seat, etc."
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
