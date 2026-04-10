'use client';

import { gql, invalidateQueryCache } from '@/lib/api';
import { useAuth } from '@/components/auth-context';

import type { StatementType } from '@/types/domain';
export type { StatementType };
export type ScaleUnit = 'units' | 'thousands' | 'lakhs' | 'crores' | 'millions' | 'billions';

export const ALL_SCALES: ScaleUnit[] = ['units', 'thousands', 'lakhs', 'crores', 'millions', 'billions'];
export const COMMON_CURRENCIES = ['INR'];

export const SCALE_LABEL: Record<ScaleUnit, string> = {
  units: 'Units',
  thousands: 'Thousands',
  lakhs: 'Lakhs',
  crores: 'Crores',
  millions: 'Millions',
  billions: 'Billions',
};

const SET_STATEMENT_VALUE_IN = `
  mutation SetStatementValueIn($periodId: String!, $statementType: String!, $currency: String, $scale: String) {
    setStatementValueIn(periodId: $periodId, statementType: $statementType, currency: $currency, scale: $scale) { ok }
  }
`;

type Props = {
  periodId: string;
  statementType: StatementType;
  currency: string | null;
  scale: ScaleUnit | null;
  missing?: boolean; // inherited from fallback
  onChange: (next: { currency: string | null; scale: ScaleUnit | null }) => void;
  label?: string; // e.g. "FY2024"
};

export function ValueInPicker({ periodId, statementType, currency, scale, missing, onChange, label }: Props) {
  const { token } = useAuth();

  const save = async (next: { currency: string | null; scale: ScaleUnit | null }) => {
    await gql(
      SET_STATEMENT_VALUE_IN,
      {
        periodId,
        statementType,
        currency: next.currency,
        scale: next.scale,
      },
      token,
    );
    invalidateQueryCache();
    onChange(next);
  };

  const effCurrency = currency ?? 'INR';
  const effScale: ScaleUnit = scale ?? 'crores';

  return (
    <div
      className="row"
      style={{
        gap: 6,
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 6,
        background: missing ? 'rgba(240, 180, 0, 0.12)' : 'rgba(255,255,255,0.03)',
        border: missing ? '1px solid rgba(240, 180, 0, 0.4)' : '1px solid transparent',
      }}
      title={missing ? 'Inherited from company default — click to confirm' : 'Value In override'}
    >
      {label && <span className="muted" style={{ fontSize: 12, minWidth: 50 }}>{label}</span>}
      <span className="muted" style={{ fontSize: 12 }}>Value in</span>
      <select
        value={effCurrency}
        onChange={(e) => save({ currency: e.target.value, scale: effScale })}
        style={{ padding: '2px 6px', fontSize: 12 }}
      >
        {COMMON_CURRENCIES.map((c) => (
          <option key={c} value={c}>{c === 'INR' ? '₹ INR' : c}</option>
        ))}
      </select>
      <select
        value={effScale}
        onChange={(e) => save({ currency: effCurrency, scale: e.target.value as ScaleUnit })}
        style={{ padding: '2px 6px', fontSize: 12 }}
      >
        {ALL_SCALES.map((s) => (
          <option key={s} value={s}>{SCALE_LABEL[s]}</option>
        ))}
      </select>
      {missing && <span style={{ fontSize: 11, color: '#d98e00' }}>inherited</span>}
      {(currency || scale) && !missing && (
        <button
          className="secondary"
          style={{ padding: '2px 6px', fontSize: 11 }}
          onClick={() => save({ currency: null, scale: null })}
          title="Reset to inherit"
        >
          reset
        </button>
      )}
    </div>
  );
}
