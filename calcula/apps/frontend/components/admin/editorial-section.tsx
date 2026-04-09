'use client';

import { useCallback, useEffect, useState } from 'react';
import { gql } from '@/lib/api';
import { useAuth } from '@/components/auth-context';
import {
  COMPANY_FAQ_QUERY,
  COMPANY_NARRATIVE_QUERY,
  COMPANY_PROS_CONS_QUERY,
  SEED_DEFAULT_FAQ_MUTATION,
  UPSERT_COMPANY_FAQ_MUTATION,
  UPSERT_COMPANY_NARRATIVE_MUTATION,
  UPSERT_PROS_CONS_MUTATION
} from '@/lib/queries';
import type {
  CompanyFaq,
  CompanyFaqItem,
  CompanyNarrative,
  CompanyProsCons
} from '@/types/domain';

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

  // FAQ form
  const [faqItems, setFaqItems] = useState<CompanyFaqItem[]>([]);

  const [savingOverview, setSavingOverview] = useState(false);
  const [savingProsCons, setSavingProsCons] = useState(false);
  const [savingFaq, setSavingFaq] = useState(false);
  const [seedingFaq, setSeedingFaq] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const [narrative, prosCons, faq] = await Promise.all([
        gql<{ companyNarrative: CompanyNarrative | null }>(COMPANY_NARRATIVE_QUERY, { companyId }, token),
        gql<{ companyProsCons: CompanyProsCons | null }>(COMPANY_PROS_CONS_QUERY, { companyId }, token),
        gql<{ companyFaq: CompanyFaq | null }>(COMPANY_FAQ_QUERY, { companyId }, token)
      ]);
      const n = narrative.companyNarrative;
      setSummary(n?.summary ?? '');
      setBusinessModel(n?.businessModel ?? '');
      setCompetitiveMoat(n?.competitiveMoat ?? '');
      setRisks(n?.risks ?? '');
      const pc = prosCons.companyProsCons;
      setPros(pc?.pros ?? '');
      setCons(pc?.cons ?? '');
      setFaqItems(faq.companyFaq?.items ?? []);
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

  const updateFaqField = (index: number, key: 'question' | 'answer', value: string) => {
    setFaqItems((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  };

  const addFaqRow = () => {
    setFaqItems((prev) => [...prev, { question: '', answer: '' }]);
  };

  const removeFaqRow = (index: number) => {
    setFaqItems((prev) => prev.filter((_, i) => i !== index));
  };

  const moveFaqRow = (index: number, direction: -1 | 1) => {
    setFaqItems((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const insertDefaultFaqs = async () => {
    setSeedingFaq(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await gql<{ seedDefaultFaq: CompanyFaq }>(
        SEED_DEFAULT_FAQ_MUTATION,
        { companyId },
        token
      );
      setFaqItems(res.seedDefaultFaq.items ?? []);
      setSuccess('Default FAQs inserted (existing questions preserved).');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSeedingFaq(false);
    }
  };

  const saveFaq = async () => {
    setSavingFaq(true);
    setError(null);
    setSuccess(null);
    try {
      const items = faqItems
        .map((row) => ({ question: row.question.trim(), answer: row.answer.trim() }))
        .filter((row) => row.question && row.answer);
      await gql(
        UPSERT_COMPANY_FAQ_MUTATION,
        { input: { companyId, items } },
        token
      );
      setFaqItems(items);
      setSuccess(`FAQ saved (${items.length} items)`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingFaq(false);
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
        <h3 style={{ margin: '0 0 4px 0' }}>Pros & Cons (quick scan)</h3>
        <p className="muted" style={{ fontSize: 11, marginTop: 0 }}>
          3–5 short bullets each — the "at a glance" TL;DR. For long-form analyst commentary
          on <em>why</em> the company has structural advantages or specific risks, use the
          <strong> Competitive moat</strong> and <strong>Risks</strong> fields under Company
          Overview above. One bullet per line, prefixed with <code>-</code>.
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

      {/* FAQ */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0' }}>FAQ</h3>
            <p className="muted" style={{ fontSize: 11, margin: 0 }}>
              Rendered as an accordion at the bottom of the storefront deal page. Use the
              ↑ / ↓ buttons to reorder. Rows with empty question or answer are dropped on
              save.
            </p>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button
              className="secondary"
              onClick={insertDefaultFaqs}
              disabled={seedingFaq}
              title="Adds Polemarch's standard investor FAQs. Already-present questions are skipped."
            >
              {seedingFaq ? 'Inserting…' : 'Insert default questions'}
            </button>
            <button className="secondary" onClick={addFaqRow}>
              Add question
            </button>
          </div>
        </div>

        {faqItems.length === 0 ? (
          <p className="muted" style={{ marginTop: 12 }}>
            No FAQ items yet. Click "Add question" to create one.
          </p>
        ) : (
          <div className="col" style={{ marginTop: 12, gap: 12 }}>
            {faqItems.map((row, index) => (
              <div
                key={index}
                className="col"
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 12,
                  gap: 8,
                  position: 'relative'
                }}
              >
                <label className="col">
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                    Question {index + 1}
                  </span>
                  <input
                    type="text"
                    value={row.question}
                    onChange={(e) => updateFaqField(index, 'question', e.target.value)}
                    placeholder="e.g. How is the price determined?"
                  />
                </label>
                <label className="col">
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Answer</span>
                  <textarea
                    rows={3}
                    value={row.answer}
                    onChange={(e) => updateFaqField(index, 'answer', e.target.value)}
                    placeholder="Plain text or markdown"
                  />
                </label>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div className="row" style={{ gap: 4 }}>
                    <button
                      className="secondary"
                      onClick={() => moveFaqRow(index, -1)}
                      disabled={index === 0}
                      title="Move up"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      className="secondary"
                      onClick={() => moveFaqRow(index, 1)}
                      disabled={index === faqItems.length - 1}
                      title="Move down"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => removeFaqRow(index)}
                    style={{ color: '#ef4444', borderColor: '#ef4444' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
          <button onClick={saveFaq} disabled={savingFaq}>
            {savingFaq ? 'Saving…' : 'Save FAQ'}
          </button>
        </div>
      </div>
    </div>
  );
}
