'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { gql } from '@/lib/api';
import { useAuth } from '@/components/auth-context';
import {
  COMPANY_VALUATIONS_QUERY,
  UPSERT_COMPANY_VALUATIONS_MUTATION
} from '@/lib/queries';
import type {
  CompanyValuations,
  ValuationMethodType,
  ValuationModelEntry
} from '@/types/domain';
import {
  VALUATION_METHOD_LABELS,
  VALUATION_METHOD_ORDER,
  computeImpliedRange,
  defaultPayloadFor
} from '@/lib/valuation-models';
import { MarkdownEditor } from './markdown-editor';

type Props = { companyId: string };

type EditorState = {
  baseCurrency: string;
  asOfDate: string;
  summary: string;
  models: ValuationModelEntry[];
};

function newId() {
  return `vm_${Math.random().toString(36).slice(2, 10)}`;
}

function deriveRange(entry: ValuationModelEntry): ValuationModelEntry {
  const r = computeImpliedRange(entry.methodType, entry.payload);
  return {
    ...entry,
    impliedValueLow: r.low,
    impliedValueBase: r.base,
    impliedValueHigh: r.high
  };
}

function parseModels(json: string): ValuationModelEntry[] {
  try {
    const raw = JSON.parse(json);
    if (!Array.isArray(raw)) return [];
    return raw.map((e: any) => ({
      id: typeof e.id === 'string' ? e.id : newId(),
      methodType: e.methodType as ValuationMethodType,
      label: typeof e.label === 'string' ? e.label : '',
      weight: typeof e.weight === 'number' ? e.weight : 1,
      impliedValueLow: typeof e.impliedValueLow === 'number' ? e.impliedValueLow : null,
      impliedValueBase:
        typeof e.impliedValueBase === 'number' ? e.impliedValueBase : null,
      impliedValueHigh:
        typeof e.impliedValueHigh === 'number' ? e.impliedValueHigh : null,
      notes: typeof e.notes === 'string' ? e.notes : null,
      payload:
        typeof e.payload === 'object' && e.payload !== null
          ? (e.payload as Record<string, unknown>)
          : {}
    }));
  } catch {
    return [];
  }
}

function titleCase(s: string): string {
  return s
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function formatNum(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  let v = n;
  let suf = '';
  if (abs >= 1e9) {
    v = n / 1e9;
    suf = 'B';
  } else if (abs >= 1e7) {
    v = n / 1e7;
    suf = 'Cr';
  } else if (abs >= 1e5) {
    v = n / 1e5;
    suf = 'L';
  } else if (abs >= 1e3) {
    v = n / 1e3;
    suf = 'K';
  }
  return `${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}${suf}`;
}

// ── Recursive payload editor ────────────────────────────────────
// Renders primitives, arrays of primitives, and arrays of objects.
// Keeps forms short for all 18 methods without hand-writing each one.

type PayloadEditorProps = {
  value: unknown;
  onChange: (v: unknown) => void;
  keyPath?: string;
};

function PrimEditor({
  value,
  onChange,
  keyName
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  keyName: string;
}) {
  if (typeof value === 'number') {
    return (
      <input
        type="number"
        step="any"
        value={Number.isFinite(value) ? String(value) : ''}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? 0 : parseFloat(v));
        }}
        style={{ width: '100%' }}
      />
    );
  }
  if (typeof value === 'boolean') {
    return (
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  }
  // string / null
  return (
    <input
      type="text"
      value={value == null ? '' : String(value)}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: '100%' }}
      placeholder={keyName}
    />
  );
}

function ObjectArrayEditor({
  rows,
  onChange
}: {
  rows: Array<Record<string, unknown>>;
  onChange: (next: Array<Record<string, unknown>>) => void;
}) {
  if (!rows.length) {
    const blank = () =>
      onChange([
        {
          name: '',
          value: 0
        }
      ]);
    return (
      <button type="button" className="secondary" onClick={blank}>
        + Add row
      </button>
    );
  }
  const cols = Object.keys(rows[0]);
  const setCell = (i: number, c: string, v: unknown) => {
    const next = rows.slice();
    next[i] = { ...next[i], [c]: v };
    onChange(next);
  };
  const addRow = () => {
    const blank: Record<string, unknown> = {};
    for (const c of cols) blank[c] = typeof rows[0][c] === 'number' ? 0 : '';
    onChange([...rows, blank]);
  };
  const removeRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead style={{ background: '#f8fafc' }}>
          <tr>
            {cols.map((c) => (
              <th
                key={c}
                style={{
                  padding: '6px 8px',
                  textAlign: 'left',
                  fontWeight: 700,
                  borderBottom: '1px solid #e2e8f0'
                }}
              >
                {titleCase(c)}
              </th>
            ))}
            <th style={{ width: 40 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {cols.map((c) => (
                <td key={c} style={{ padding: 4, borderBottom: '1px solid #f1f5f9' }}>
                  <PrimEditor
                    keyName={c}
                    value={row[c]}
                    onChange={(v) => setCell(i, c, v)}
                  />
                </td>
              ))}
              <td style={{ padding: 4, textAlign: 'right' }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => removeRow(i)}
                  style={{ color: '#ef4444', borderColor: '#ef4444' }}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: 6, borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <button type="button" className="secondary" onClick={addRow}>
          + Add row
        </button>
      </div>
    </div>
  );
}

function NumberArrayEditor({
  values,
  onChange
}: {
  values: number[];
  onChange: (next: number[]) => void;
}) {
  return (
    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
      {values.map((v, i) => (
        <input
          key={i}
          type="number"
          step="any"
          value={v}
          onChange={(e) => {
            const next = values.slice();
            next[i] = parseFloat(e.target.value || '0');
            onChange(next);
          }}
          style={{ width: 80 }}
        />
      ))}
      <button type="button" className="secondary" onClick={() => onChange([...values, 0])}>
        +
      </button>
      {values.length > 1 && (
        <button
          type="button"
          className="secondary"
          onClick={() => onChange(values.slice(0, -1))}
        >
          −
        </button>
      )}
    </div>
  );
}

function PayloadEditor({
  payload,
  onChange
}: {
  payload: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const entries = Object.entries(payload);
  const set = (k: string, v: unknown) => onChange({ ...payload, [k]: v });
  return (
    <div className="col" style={{ gap: 10 }}>
      {entries.map(([k, v]) => {
        if (
          Array.isArray(v) &&
          v.length > 0 &&
          typeof v[0] === 'object' &&
          v[0] !== null
        ) {
          return (
            <label key={k} className="col">
              <span>{titleCase(k)}</span>
              <ObjectArrayEditor
                rows={v as Array<Record<string, unknown>>}
                onChange={(next) => set(k, next)}
              />
            </label>
          );
        }
        if (Array.isArray(v) && v.every((x) => typeof x === 'number')) {
          return (
            <label key={k} className="col">
              <span>{titleCase(k)}</span>
              <NumberArrayEditor values={v as number[]} onChange={(next) => set(k, next)} />
            </label>
          );
        }
        if (Array.isArray(v)) {
          return (
            <label key={k} className="col">
              <span>{titleCase(k)}</span>
              <input
                type="text"
                value={(v as unknown[]).join(', ')}
                onChange={(e) =>
                  set(
                    k,
                    e.target.value
                      .split(',')
                      .map((x) => x.trim())
                      .filter(Boolean)
                  )
                }
              />
            </label>
          );
        }
        return (
          <label key={k} className="col">
            <span>{titleCase(k)}</span>
            <PrimEditor keyName={k} value={v} onChange={(next) => set(k, next)} />
          </label>
        );
      })}
    </div>
  );
}

// ── Main section ────────────────────────────────────────────────

/**
 * Calcula admin editor for CompanyValuations — an extensive PE/VC
 * valuation workbench. Adds up to 18 method types per company, each with
 * a typed payload, live-computed implied value range, weight, and optional
 * markdown notes. Saved entries publish via the `profile` snapshot kind.
 */
export function ValuationsSection({ companyId }: Props) {
  const { token } = useAuth();
  const [state, setState] = useState<EditorState>({
    baseCurrency: 'INR',
    asOfDate: '',
    summary: '',
    models: []
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await gql<{ companyValuations: CompanyValuations | null }>(
        COMPANY_VALUATIONS_QUERY,
        { companyId },
        token
      );
      const row = res.companyValuations;
      setState({
        baseCurrency: row?.baseCurrency ?? 'INR',
        asOfDate: row?.asOfDate ? row.asOfDate.slice(0, 10) : '',
        summary: row?.summary ?? '',
        models: row ? parseModels(row.modelsJson) : []
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

  const addModel = (methodType: ValuationMethodType) => {
    const entry: ValuationModelEntry = {
      id: newId(),
      methodType,
      label: VALUATION_METHOD_LABELS[methodType],
      weight: 1,
      impliedValueLow: null,
      impliedValueBase: null,
      impliedValueHigh: null,
      notes: null,
      payload: defaultPayloadFor(methodType)
    };
    const withRange = deriveRange(entry);
    setState((prev) => ({ ...prev, models: [...prev.models, withRange] }));
    setExpandedIds((prev) => new Set(prev).add(entry.id));
    setAddMenuOpen(false);
  };

  const updateModel = (id: string, patch: Partial<ValuationModelEntry>) => {
    setState((prev) => ({
      ...prev,
      models: prev.models.map((m) => {
        if (m.id !== id) return m;
        const merged = { ...m, ...patch };
        return patch.payload ? deriveRange(merged) : merged;
      })
    }));
  };

  const removeModel = (id: string) => {
    setState((prev) => ({ ...prev, models: prev.models.filter((m) => m.id !== id) }));
  };

  const moveModel = (id: string, dir: -1 | 1) => {
    setState((prev) => {
      const idx = prev.models.findIndex((m) => m.id === id);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.models.length) return prev;
      const next = prev.models.slice();
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...prev, models: next };
    });
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const consensus = useMemo(() => {
    const withBase = state.models.filter((m) => m.impliedValueBase != null);
    if (!withBase.length) return null;
    const totalW = withBase.reduce((a, b) => a + (b.weight || 1), 0) || 1;
    const weighted =
      withBase.reduce(
        (a, b) => a + (b.weight || 1) * (b.impliedValueBase as number),
        0
      ) / totalW;
    const low = Math.min(
      ...withBase.map((m) => m.impliedValueLow ?? (m.impliedValueBase as number))
    );
    const high = Math.max(
      ...withBase.map((m) => m.impliedValueHigh ?? (m.impliedValueBase as number))
    );
    return { weighted, low, high };
  }, [state.models]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await gql(
        UPSERT_COMPANY_VALUATIONS_MUTATION,
        {
          input: {
            companyId,
            baseCurrency: state.baseCurrency,
            asOfDate: state.asOfDate || null,
            summary: state.summary || null,
            modelsJson: JSON.stringify(state.models)
          }
        },
        token
      );
      setSuccess('Valuations saved');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card col">
      <div>
        <h2 className="page-title">Valuations</h2>
        <p className="muted page-subtitle" style={{ margin: 0 }}>
          PE/VC workbench — add up to 18 valuation methodologies per company.
          Implied value ranges auto-compute as you edit. Saved to the{' '}
          <code>profile</code> snapshot and rendered on the storefront deal
          page.
        </p>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      {loading && <p className="muted">Loading…</p>}

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="col" style={{ minWidth: 120 }}>
            <span>Base currency</span>
            <select
              value={state.baseCurrency}
              onChange={(e) =>
                setState((prev) => ({ ...prev, baseCurrency: e.target.value }))
              }
            >
              <option value="INR">INR ₹</option>
              <option value="USD">USD $</option>
              <option value="EUR">EUR €</option>
              <option value="GBP">GBP £</option>
            </select>
          </label>
          <label className="col" style={{ minWidth: 160 }}>
            <span>As of date</span>
            <input
              type="date"
              value={state.asOfDate}
              onChange={(e) =>
                setState((prev) => ({ ...prev, asOfDate: e.target.value }))
              }
            />
          </label>
          <div style={{ flex: 1 }} />
          <div style={{ position: 'relative' }}>
            <button onClick={() => setAddMenuOpen((o) => !o)}>+ Add model</button>
            {addMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  zIndex: 20,
                  minWidth: 260,
                  maxHeight: 360,
                  overflowY: 'auto'
                }}
              >
                {VALUATION_METHOD_ORDER.map((mt) => (
                  <button
                    key={mt}
                    type="button"
                    onClick={() => addModel(mt)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 12px',
                      border: 'none',
                      borderBottom: '1px solid #f1f5f9',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: 13
                    }}
                  >
                    {VALUATION_METHOD_LABELS[mt]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Valuations'}
          </button>
        </div>

        <label className="col" style={{ marginTop: 12 }}>
          <span>Analyst summary (markdown)</span>
          <MarkdownEditor
            value={state.summary}
            onChange={(v) => setState((prev) => ({ ...prev, summary: v }))}
            rows={6}
            placeholder="Headline thesis, method weighting rationale, sensitivity notes…"
          />
        </label>

        {consensus && (
          <div
            className="row"
            style={{
              marginTop: 12,
              gap: 12,
              padding: 12,
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 8
            }}
          >
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#047857' }}>
                WEIGHTED CONSENSUS
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#064e3b' }}>
                {formatNum(consensus.weighted)}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid #a7f3d0', paddingLeft: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#047857' }}>RANGE</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {formatNum(consensus.low)} – {formatNum(consensus.high)}
              </div>
            </div>
          </div>
        )}
      </div>

      {state.models.length === 0 ? (
        <p className="muted" style={{ marginTop: 12 }}>
          No models yet. Click "+ Add model" above to start building a
          valuation.
        </p>
      ) : (
        <div className="col" style={{ marginTop: 12, gap: 10 }}>
          {state.models.map((m, idx) => {
            const isOpen = expandedIds.has(m.id);
            return (
              <div
                key={m.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  overflow: 'hidden'
                }}
              >
                <div
                  className="row"
                  style={{
                    padding: 10,
                    background: '#f8fafc',
                    alignItems: 'center',
                    gap: 10
                  }}
                >
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => toggleExpanded(m.id)}
                  >
                    {isOpen ? '▾' : '▸'}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input
                      type="text"
                      value={m.label}
                      onChange={(e) => updateModel(m.id, { label: e.target.value })}
                      placeholder={VALUATION_METHOD_LABELS[m.methodType]}
                      style={{ width: '100%', fontWeight: 700 }}
                    />
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      {VALUATION_METHOD_LABELS[m.methodType]} • Implied{' '}
                      {formatNum(m.impliedValueBase)} ({formatNum(m.impliedValueLow)} –{' '}
                      {formatNum(m.impliedValueHigh)})
                    </div>
                  </div>
                  <label style={{ fontSize: 11 }}>
                    Weight{' '}
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      value={m.weight}
                      onChange={(e) =>
                        updateModel(m.id, {
                          weight: parseFloat(e.target.value || '0')
                        })
                      }
                      style={{ width: 60 }}
                    />
                  </label>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => moveModel(m.id, -1)}
                    disabled={idx === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => moveModel(m.id, 1)}
                    disabled={idx === state.models.length - 1}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    style={{ color: '#ef4444', borderColor: '#ef4444' }}
                    onClick={() => removeModel(m.id)}
                  >
                    Remove
                  </button>
                </div>
                {isOpen && (
                  <div style={{ padding: 12 }}>
                    <PayloadEditor
                      payload={m.payload}
                      onChange={(next) => updateModel(m.id, { payload: next })}
                    />
                    <label className="col" style={{ marginTop: 10 }}>
                      <span>Notes (markdown)</span>
                      <MarkdownEditor
                        value={m.notes ?? ''}
                        onChange={(v) => updateModel(m.id, { notes: v })}
                        rows={4}
                        placeholder="Assumption rationale, caveats, data sources…"
                      />
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
