'use client';

import { useCallback, useEffect, useState } from 'react';
import { gql } from '@/lib/api';
import { useAuth } from '@/components/auth-context';
import {
  COMPANY_TEAM_QUERY,
  UPSERT_COMPANY_TEAM_MUTATION
} from '@/lib/queries';
import type { CompanyTeam, CompanyTeamMember } from '@/types/domain';

type Props = { companyId: string };

/**
 * Admin editor for Company Key Management Team. One row per person with
 * name, role, since-date, bio, LinkedIn URL, photo URL. Stored in the
 * CompanyTeam table as a single JSON array per company; rendered on the
 * storefront deal page alongside About / Pros / Cons.
 */
export function TeamSection({ companyId }: Props) {
  const { token } = useAuth();
  const [members, setMembers] = useState<CompanyTeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await gql<{ companyTeam: CompanyTeam | null }>(
        COMPANY_TEAM_QUERY,
        { companyId },
        token
      );
      setMembers(res.companyTeam?.members ?? []);
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
    key: keyof CompanyTeamMember,
    value: string
  ) => {
    setMembers((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    );
  };

  const addRow = () => {
    setMembers((prev) => [
      ...prev,
      { name: '', role: '', since: '', bio: '', linkedinUrl: '', photoUrl: '' }
    ]);
  };

  const removeRow = (index: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    setMembers((prev) => {
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
      const cleaned = members
        .map((m) => ({
          name: m.name.trim(),
          role: m.role.trim(),
          since: (m.since ?? '').trim() || null,
          bio: (m.bio ?? '').trim() || null,
          linkedinUrl: (m.linkedinUrl ?? '').trim() || null,
          photoUrl: (m.photoUrl ?? '').trim() || null
        }))
        .filter((m) => m.name && m.role);
      await gql(
        UPSERT_COMPANY_TEAM_MUTATION,
        { input: { companyId, members: cleaned } },
        token
      );
      setMembers(cleaned);
      setSuccess(`Team saved (${cleaned.length} members)`);
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
          <h2 className="page-title">Key Management Team</h2>
          <p className="muted page-subtitle" style={{ margin: 0 }}>
            Founders, CEO, MD, key execs. Shown on the storefront deal page. Rows with
            empty name or role are dropped on save.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="secondary" onClick={addRow}>
            Add member
          </button>
          <button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Team'}
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      {loading && <p className="muted" style={{ marginTop: 12 }}>Loading team…</p>}

      {members.length === 0 && !loading ? (
        <p className="muted" style={{ marginTop: 12 }}>
          No team members yet. Click "Add member" to create one.
        </p>
      ) : (
        <div className="col" style={{ marginTop: 12, gap: 12 }}>
          {members.map((row, index) => (
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
                    placeholder="e.g. Dharmil Sheth"
                  />
                </label>
                <label className="col">
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Role</span>
                  <input
                    type="text"
                    value={row.role}
                    onChange={(e) => updateField(index, 'role', e.target.value)}
                    placeholder="Co-founder & Executive Chairman"
                  />
                </label>
                <label className="col">
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Since</span>
                  <input
                    type="text"
                    value={row.since ?? ''}
                    onChange={(e) => updateField(index, 'since', e.target.value)}
                    placeholder="2015 or Jun 2023"
                  />
                </label>
                <label className="col">
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>LinkedIn URL</span>
                  <input
                    type="url"
                    value={row.linkedinUrl ?? ''}
                    onChange={(e) => updateField(index, 'linkedinUrl', e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                  />
                </label>
                <label className="col" style={{ gridColumn: '1 / -1' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Photo URL (optional)</span>
                  <input
                    type="url"
                    value={row.photoUrl ?? ''}
                    onChange={(e) => updateField(index, 'photoUrl', e.target.value)}
                    placeholder="https://..."
                  />
                </label>
                <label className="col" style={{ gridColumn: '1 / -1' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Bio</span>
                  <textarea
                    rows={3}
                    value={row.bio ?? ''}
                    onChange={(e) => updateField(index, 'bio', e.target.value)}
                    placeholder="Background, previous roles, notable achievements"
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
                    disabled={index === members.length - 1}
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
