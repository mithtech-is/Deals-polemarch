'use client';

import { useCallback, useEffect, useState } from 'react';
import { gql, invalidateQueryCache } from '@/lib/api';
import { useAuth } from '@/components/auth-context';
import { DashboardPage, DashboardSection } from '@/components/dashboard/template';
import { RequireAuth } from '@/components/require-auth';

type CurrencyRate = {
  id: string;
  fromCcy: string;
  toCcy: string;
  rate: number;
  asOf: string;
  source: string | null;
};

const LIST_QUERY = `
  query CurrencyRates {
    currencyRates { id fromCcy toCcy rate asOf source }
  }
`;

const UPSERT_MUTATION = `
  mutation UpsertCurrencyRate($input: UpsertCurrencyRateInput!) {
    upsertCurrencyRate(input: $input) { id fromCcy toCcy rate asOf source }
  }
`;

const DELETE_MUTATION = `
  mutation DeleteCurrencyRate($id: String!) {
    deleteCurrencyRate(id: $id) { ok }
  }
`;

const COMMON_CCY = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AED'];

const SCALE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'auto', label: 'Auto (per-statement best fit)' },
  { value: 'units', label: 'Units' },
  { value: 'thousands', label: 'Thousands' },
  { value: 'lakhs', label: 'Lakhs' },
  { value: 'crores', label: 'Crores' },
  { value: 'millions', label: 'Millions' },
  { value: 'billions', label: 'Billions' }
];

const SITE_SETTINGS_QUERY = `
  query SiteSettings {
    siteSettings { defaultCurrency defaultScale }
  }
`;

const UPDATE_SITE_SETTINGS_MUTATION = `
  mutation UpdateSiteSettings($input: UpdateSiteSettingsInput!) {
    updateSiteSettings(input: $input) { defaultCurrency defaultScale }
  }
`;

type SiteSettings = { defaultCurrency: string; defaultScale: string };

export default function CurrencyRatesPage() {
  return (
    <RequireAuth>
      <CurrencyRatesInner />
    </RequireAuth>
  );
}

function CurrencyRatesInner() {
  const { token } = useAuth();
  const [rows, setRows] = useState<CurrencyRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({
    fromCcy: 'USD',
    toCcy: 'INR',
    rate: '',
    asOf: new Date().toISOString().slice(0, 10),
    source: '',
  });
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    defaultCurrency: 'INR',
    defaultScale: 'auto',
  });
  const [savingSite, setSavingSite] = useState(false);
  const [siteSaved, setSiteSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, siteData] = await Promise.all([
        gql<{ currencyRates: CurrencyRate[] }>(LIST_QUERY, {}, token),
        gql<{ siteSettings: SiteSettings }>(SITE_SETTINGS_QUERY, {}, token),
      ]);
      setRows(data.currencyRates);
      setSiteSettings(siteData.siteSettings);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const saveSiteSettings = async () => {
    setSavingSite(true);
    setSiteSaved(null);
    try {
      const res = await gql<{ updateSiteSettings: SiteSettings }>(
        UPDATE_SITE_SETTINGS_MUTATION,
        {
          input: {
            defaultCurrency: siteSettings.defaultCurrency,
            defaultScale: siteSettings.defaultScale,
          },
        },
        token,
      );
      invalidateQueryCache();
      setSiteSettings(res.updateSiteSettings);
      setSiteSaved('Saved. New defaults apply on the next snapshot read.');
    } finally {
      setSavingSite(false);
    }
  };

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!draft.rate || Number.isNaN(Number(draft.rate))) return;
    await gql(
      UPSERT_MUTATION,
      {
        input: {
          fromCcy: draft.fromCcy.toUpperCase(),
          toCcy: draft.toCcy.toUpperCase(),
          rate: Number(draft.rate),
          asOf: draft.asOf,
          source: draft.source || null,
        },
      },
      token,
    );
    invalidateQueryCache();
    setDraft({ ...draft, rate: '', source: '' });
    await load();
  };

  const remove = async (id: string) => {
    await gql(DELETE_MUTATION, { id }, token);
    invalidateQueryCache();
    await load();
  };

  return (
    <DashboardPage
      title="Currency"
      subtitle="FX rates used to normalize financials to INR base for the Medusa storefront"
    >
      <DashboardSection title="Site defaults">
        <p className="muted" style={{ margin: '0 0 12px 0', fontSize: 12 }}>
          Controls the currency symbol and display scale used for every
          company's financial statements on the storefront. "Auto" keeps the
          per-statement best-fit behaviour (e.g. Crores for big balance
          sheets, Lakhs for smaller P&amp;L). Force a specific scale (e.g.
          Lakhs) to make every statement render in that unit site-wide.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr) auto',
            gap: 8,
            alignItems: 'end',
          }}
        >
          <label className="col">
            <span className="label">Default currency</span>
            <select
              value={siteSettings.defaultCurrency}
              onChange={(e) =>
                setSiteSettings({ ...siteSettings, defaultCurrency: e.target.value })
              }
            >
              {COMMON_CCY.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="col">
            <span className="label">Default display scale</span>
            <select
              value={siteSettings.defaultScale}
              onChange={(e) =>
                setSiteSettings({ ...siteSettings, defaultScale: e.target.value })
              }
            >
              {SCALE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <div className="muted" style={{ fontSize: 11 }}>
            Preview:
            <br />
            <strong style={{ color: '#0f172a' }}>
              All values in{' '}
              {siteSettings.defaultCurrency === 'INR'
                ? '₹'
                : siteSettings.defaultCurrency}{' '}
              {siteSettings.defaultScale === 'auto'
                ? '(auto)'
                : siteSettings.defaultScale.charAt(0).toUpperCase() +
                  siteSettings.defaultScale.slice(1)}
            </strong>
          </div>
          <button className="primary" onClick={saveSiteSettings} disabled={savingSite}>
            {savingSite ? 'Saving…' : 'Save defaults'}
          </button>
        </div>
        {siteSaved && (
          <p className="success" style={{ marginTop: 8, marginBottom: 0 }}>
            {siteSaved}
          </p>
        )}
      </DashboardSection>

      <DashboardSection title="Add / update rate">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, alignItems: 'end' }}>
          <label className="col">
            <span className="label">From</span>
            <select value={draft.fromCcy} onChange={(e) => setDraft({ ...draft, fromCcy: e.target.value })}>
              {COMMON_CCY.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="col">
            <span className="label">To</span>
            <select value={draft.toCcy} onChange={(e) => setDraft({ ...draft, toCcy: e.target.value })}>
              {COMMON_CCY.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="col">
            <span className="label">Rate</span>
            <input
              type="number"
              step="0.0001"
              value={draft.rate}
              onChange={(e) => setDraft({ ...draft, rate: e.target.value })}
              placeholder="e.g. 83.25"
            />
          </label>
          <label className="col">
            <span className="label">As of</span>
            <input type="date" value={draft.asOf} onChange={(e) => setDraft({ ...draft, asOf: e.target.value })} />
          </label>
          <label className="col">
            <span className="label">Source</span>
            <input
              value={draft.source}
              onChange={(e) => setDraft({ ...draft, source: e.target.value })}
              placeholder="optional (RBI, manual…)"
            />
          </label>
          <button className="primary" onClick={save}>Save rate</button>
        </div>
      </DashboardSection>

      <DashboardSection title="Configured rates">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="muted">No rates configured yet. Only INR→INR identity is present.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Rate</th>
                <th>As of</th>
                <th>Source</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.fromCcy}</td>
                  <td>{r.toCcy}</td>
                  <td>{r.rate}</td>
                  <td>{new Date(r.asOf).toISOString().slice(0, 10)}</td>
                  <td>{r.source ?? '—'}</td>
                  <td>
                    <button className="secondary" onClick={() => remove(r.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DashboardSection>

      <DashboardSection title="How this works">
        <ul className="muted" style={{ lineHeight: 1.6 }}>
          <li>Default base currency is <strong>₹ INR</strong>. Every company inherits INR + Crores by default.</li>
          <li>When a period or statement is entered in a non-INR currency, the snapshot builder uses the latest rate where <code>asOf ≤ periodEnd</code>.</li>
          <li>If no rate is found, value passes through at 1.0 and is flagged in the snapshot warnings.</li>
          <li>Storefront auto-picks the largest readable scale (Crores &gt; Lakhs &gt; Units).</li>
        </ul>
      </DashboardSection>
    </DashboardPage>
  );
}
