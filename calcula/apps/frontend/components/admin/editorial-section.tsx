'use client';

import { useCallback, useEffect, useState } from 'react';
import { gql } from '@/lib/api';
import { useAuth } from '@/components/auth-context';
import {
  COMPANY_NARRATIVE_QUERY,
  COMPANY_PROS_CONS_QUERY,
  UPSERT_COMPANY_NARRATIVE_MUTATION,
  UPSERT_PROS_CONS_MUTATION
} from '@/lib/queries';
import type { CompanyNarrative, CompanyProsCons } from '@/types/domain';

type Props = { companyId: string };

/**
 * Combined editorial editor — Company Overview (long-form narrative) +
 * Pros/Cons. Both round-trip through the single `editorial` snapshot kind
 * in Medusa, so editors see a single "Editorial" section and don't have
 * to think about the storage split.
 */
export function EditorialSection({ companyId }: Props) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Overview form
  const [summary, setSummary] = useState('');
  const [businessModel, setBusinessModel] = useState('');
  const [competitiveMoat, setCompetitiveMoat] = useState('');
  const [risks, setRisks] = useState('');

  // ProsCons form
  const [pros, setPros] = useState('');
  const [cons, setCons] = useState('');

  const [savingOverview, setSavingOverview] = useState(false);
  const [savingProsCons, setSavingProsCons] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const [narrative, prosCons] = await Promise.all([
        gql<{ companyNarrative: CompanyNarrative | null }>(COMPANY_NARRATIVE_QUERY, { companyId }, token),
        gql<{ companyProsCons: CompanyProsCons | null }>(COMPANY_PROS_CONS_QUERY, { companyId }, token)
      ]);
      const n = narrative.companyNarrative;
      setSummary(n?.summary ?? '');
      setBusinessModel(n?.businessModel ?? '');
      setCompetitiveMoat(n?.competitiveMoat ?? '');
      setRisks(n?.risks ?? '');
      const pc = prosCons.companyProsCons;
      setPros(pc?.pros ?? '');
      setCons(pc?.cons ?? '');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [companyId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveOverview = async () => {
    setSavingOverview(true);
    setError(null);
    setSuccess(null);
    try {
      if (!summary.trim()) throw new Error('Summary is required');
      await gql(
        UPSERT_COMPANY_NARRATIVE_MUTATION,
        {
          input: {
            companyId,
            summary: summary.trim(),
            businessModel: businessModel.trim() || null,
            competitiveMoat: competitiveMoat.trim() || null,
            risks: risks.trim() || null
          }
        },
        token
      );
      setSuccess('Overview saved');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingOverview(false);
    }
  };

  const saveProsCons = async () => {
    setSavingProsCons(true);
    setError(null);
    setSuccess(null);
    try {
      await gql(
        UPSERT_PROS_CONS_MUTATION,
        {
          input: { companyId, pros: pros.trim(), cons: cons.trim() }
        },
        token
      );
      setSuccess('Pros / Cons saved');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingProsCons(false);
    }
  };

  return (
    <div className="card col">
      <div>
        <h2 className="page-title">Editorial</h2>
        <p className="muted page-subtitle" style={{ margin: 0 }}>
          Long-form Company Overview + Pros & Cons. Rendered on the storefront deal detail page.
          Both share a single <code>editorial</code> snapshot version on Medusa — saving either
          here triggers one webhook.
        </p>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      {loading && <p className="muted">Loading editorial…</p>}

      {/* Company Overview */}
      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ margin: '0 0 8px 0' }}>Company Overview</h3>
        <label className="col">
          <span>Summary (markdown, required)</span>
          <textarea
            rows={6}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="One or two paragraphs about the company. Supports **bold**, *italic*, and bullet lists."
          />
        </label>
        <label className="col" style={{ marginTop: 10 }}>
          <span>Business model (optional)</span>
          <textarea
            rows={4}
            value={businessModel}
            onChange={(e) => setBusinessModel(e.target.value)}
          />
        </label>
        <label className="col" style={{ marginTop: 10 }}>
          <span>Competitive moat (optional)</span>
          <textarea
            rows={4}
            value={competitiveMoat}
            onChange={(e) => setCompetitiveMoat(e.target.value)}
          />
        </label>
        <label className="col" style={{ marginTop: 10 }}>
          <span>Risks (optional)</span>
          <textarea rows={4} value={risks} onChange={(e) => setRisks(e.target.value)} />
        </label>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
          <button onClick={saveOverview} disabled={savingOverview}>
            {savingOverview ? 'Saving…' : 'Save Overview'}
          </button>
        </div>
      </div>

      {/* Pros / Cons */}
      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ margin: '0 0 8px 0' }}>Pros & Cons</h3>
        <p className="muted" style={{ fontSize: 11, marginTop: 0 }}>
          One bullet per line. Prefix with <code>-</code> or let each line be its own bullet.
        </p>
        <div className="grid grid-2">
          <label className="col">
            <span style={{ color: '#059669', fontWeight: 700 }}>Pros</span>
            <textarea
              rows={8}
              value={pros}
              onChange={(e) => setPros(e.target.value)}
              placeholder={'- Market leader in X\n- Founder-led, high insider ownership\n- 35% revenue CAGR over 3 years'}
            />
          </label>
          <label className="col">
            <span style={{ color: '#e11d48', fontWeight: 700 }}>Cons</span>
            <textarea
              rows={8}
              value={cons}
              onChange={(e) => setCons(e.target.value)}
              placeholder={'- Concentrated customer base\n- Dependent on regulatory approval\n- Single-country operations'}
            />
          </label>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
          <button onClick={saveProsCons} disabled={savingProsCons}>
            {savingProsCons ? 'Saving…' : 'Save Pros / Cons'}
          </button>
        </div>
      </div>
    </div>
  );
}
