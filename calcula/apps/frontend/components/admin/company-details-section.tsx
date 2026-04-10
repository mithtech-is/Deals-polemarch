'use client';

import { useCallback, useEffect, useState } from 'react';
import { gql } from '@/lib/api';
import { useAuth } from '@/components/auth-context';
import {
  COMPANY_DETAILS_QUERY,
  UPSERT_COMPANY_DETAILS_MUTATION
} from '@/lib/queries';
import type { CompanyDetails } from '@/types/domain';

type Props = { companyId: string };

type FormState = {
  logoUrl: string;
  website: string;
  linkedinUrl: string;
  twitterUrl: string;
  crunchbaseUrl: string;
  founded: string;
  incorporationCountry: string;
  legalEntityType: string;
  registeredOffice: string;
  headquarters: string;
  auditor: string;
  panNumber: string;
  rta: string;
  depository: string;
  employeeCount: string;
  subsidiariesCount: string;
  fiscalYearEnd: string;
  shareType: string;
  faceValue: string;
  totalShares: string;
  lotSize: string;
  availabilityPercent: string;
  fiftyTwoWeekHigh: string;
  fiftyTwoWeekLow: string;
  lastRoundType: string;
  lastRoundDate: string;
  lastRoundRaised: string;
  lastRoundLead: string;
  lastRoundValuation: string;
};

const empty: FormState = {
  logoUrl: '',
  website: '',
  linkedinUrl: '',
  twitterUrl: '',
  crunchbaseUrl: '',
  founded: '',
  incorporationCountry: '',
  legalEntityType: '',
  registeredOffice: '',
  headquarters: '',
  auditor: '',
  panNumber: '',
  rta: '',
  depository: '',
  employeeCount: '',
  subsidiariesCount: '',
  fiscalYearEnd: '',
  shareType: '',
  faceValue: '',
  totalShares: '',
  lotSize: '',
  availabilityPercent: '',
  fiftyTwoWeekHigh: '',
  fiftyTwoWeekLow: '',
  lastRoundType: '',
  lastRoundDate: '',
  lastRoundRaised: '',
  lastRoundLead: '',
  lastRoundValuation: ''
};

function hydrate(row: CompanyDetails | null): FormState {
  if (!row) return { ...empty };
  return {
    logoUrl: row.logoUrl ?? '',
    website: row.website ?? '',
    linkedinUrl: row.linkedinUrl ?? '',
    twitterUrl: row.twitterUrl ?? '',
    crunchbaseUrl: row.crunchbaseUrl ?? '',
    founded: row.founded ?? '',
    incorporationCountry: row.incorporationCountry ?? '',
    legalEntityType: row.legalEntityType ?? '',
    registeredOffice: row.registeredOffice ?? '',
    headquarters: row.headquarters ?? '',
    auditor: row.auditor ?? '',
    panNumber: row.panNumber ?? '',
    rta: row.rta ?? '',
    depository: row.depository ?? '',
    employeeCount: row.employeeCount == null ? '' : String(row.employeeCount),
    subsidiariesCount: row.subsidiariesCount == null ? '' : String(row.subsidiariesCount),
    fiscalYearEnd: row.fiscalYearEnd ?? '',
    shareType: row.shareType ?? '',
    faceValue: row.faceValue ?? '',
    totalShares: row.totalShares ?? '',
    lotSize: row.lotSize == null ? '' : String(row.lotSize),
    availabilityPercent: row.availabilityPercent ?? '',
    fiftyTwoWeekHigh: row.fiftyTwoWeekHigh ?? '',
    fiftyTwoWeekLow: row.fiftyTwoWeekLow ?? '',
    lastRoundType: row.lastRoundType ?? '',
    lastRoundDate: row.lastRoundDate ?? '',
    lastRoundRaised: row.lastRoundRaised ?? '',
    lastRoundLead: row.lastRoundLead ?? '',
    lastRoundValuation: row.lastRoundValuation ?? ''
  };
}

function toInput(state: FormState, companyId: string) {
  const str = (v: string): string | null => {
    const t = v.trim();
    return t ? t : null;
  };
  const int = (v: string): number | null => {
    const t = v.trim();
    if (!t) return null;
    const n = parseInt(t, 10);
    return Number.isFinite(n) ? n : null;
  };
  return {
    companyId,
    logoUrl: str(state.logoUrl),
    website: str(state.website),
    linkedinUrl: str(state.linkedinUrl),
    twitterUrl: str(state.twitterUrl),
    crunchbaseUrl: str(state.crunchbaseUrl),
    founded: str(state.founded),
    incorporationCountry: str(state.incorporationCountry),
    legalEntityType: str(state.legalEntityType),
    registeredOffice: str(state.registeredOffice),
    headquarters: str(state.headquarters),
    auditor: str(state.auditor),
    panNumber: str(state.panNumber),
    rta: str(state.rta),
    depository: str(state.depository),
    employeeCount: int(state.employeeCount),
    subsidiariesCount: int(state.subsidiariesCount),
    fiscalYearEnd: str(state.fiscalYearEnd),
    shareType: str(state.shareType),
    faceValue: str(state.faceValue),
    totalShares: str(state.totalShares),
    lotSize: int(state.lotSize),
    availabilityPercent: str(state.availabilityPercent),
    fiftyTwoWeekHigh: str(state.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: str(state.fiftyTwoWeekLow),
    lastRoundType: str(state.lastRoundType),
    lastRoundDate: str(state.lastRoundDate),
    lastRoundRaised: str(state.lastRoundRaised),
    lastRoundLead: str(state.lastRoundLead),
    lastRoundValuation: str(state.lastRoundValuation)
  };
}

function Group({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3 style={{ margin: '0 0 8px 0' }}>{title}</h3>
      <div className="grid grid-2" style={{ gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text'
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: 'text' | 'number';
}) {
  return (
    <label className="col">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

/**
 * Calcula admin editor for CompanyDetails — the static corporate metadata
 * rendered on the storefront deal page. One row per company. Saving bumps
 * profileVersion and fires the Medusa webhook.
 */
export function CompanyDetailsSection({ companyId }: Props) {
  const { token } = useAuth();
  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const set = (k: keyof FormState) => (v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await gql<{ companyDetails: CompanyDetails | null }>(
        COMPANY_DETAILS_QUERY,
        { companyId },
        token
      );
      setForm(hydrate(res.companyDetails));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [companyId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await gql(
        UPSERT_COMPANY_DETAILS_MUTATION,
        { input: toInput(form, companyId) },
        token
      );
      setSuccess('Company details saved');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card col">
      <div>
        <h2 className="page-title">Company Details</h2>
        <p className="muted page-subtitle" style={{ margin: 0 }}>
          Static corporate metadata rendered on the storefront deal page. Use
          this form instead of hand-editing Medusa product metadata. Fields
          left blank fall back to the legacy Medusa values so partial rows are
          safe.
        </p>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      {loading && <p className="muted">Loading…</p>}

      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
        <button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save Company Details'}
        </button>
      </div>

      <Group title="Identity & branding">
        <Field label="Logo URL" value={form.logoUrl} onChange={set('logoUrl')} placeholder="https://…/logo.png" />
        <Field label="Website" value={form.website} onChange={set('website')} placeholder="https://company.com" />
        <Field label="LinkedIn URL" value={form.linkedinUrl} onChange={set('linkedinUrl')} />
        <Field label="Twitter / X URL" value={form.twitterUrl} onChange={set('twitterUrl')} />
        <Field label="Crunchbase URL" value={form.crunchbaseUrl} onChange={set('crunchbaseUrl')} />
        {form.logoUrl && (
          <div style={{ gridColumn: 'span 2' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={form.logoUrl}
              alt="Logo preview"
              style={{ maxHeight: 80, borderRadius: 8, border: '1px solid #e2e8f0', padding: 4 }}
            />
          </div>
        )}
      </Group>

      <Group title="Corporate">
        <Field label="Founded" value={form.founded} onChange={set('founded')} placeholder="e.g. 2015" />
        <Field label="Incorporation country" value={form.incorporationCountry} onChange={set('incorporationCountry')} placeholder="India" />
        <Field label="Legal entity type" value={form.legalEntityType} onChange={set('legalEntityType')} placeholder="Private Limited" />
        <Field label="Registered office" value={form.registeredOffice} onChange={set('registeredOffice')} />
        <Field label="Headquarters" value={form.headquarters} onChange={set('headquarters')} />
        <Field label="Auditor" value={form.auditor} onChange={set('auditor')} />
        <Field label="PAN" value={form.panNumber} onChange={set('panNumber')} />
        <Field label="RTA" value={form.rta} onChange={set('rta')} />
        <Field label="Depository" value={form.depository} onChange={set('depository')} placeholder="NSDL / CDSL / both" />
        <Field label="Employees" value={form.employeeCount} onChange={set('employeeCount')} type="number" />
        <Field label="Subsidiaries" value={form.subsidiariesCount} onChange={set('subsidiariesCount')} type="number" />
        <Field label="Fiscal year end" value={form.fiscalYearEnd} onChange={set('fiscalYearEnd')} placeholder="March 31" />
      </Group>

      <Group title="Share structure">
        <Field label="Share type" value={form.shareType} onChange={set('shareType')} placeholder="Equity" />
        <Field label="Face value" value={form.faceValue} onChange={set('faceValue')} type="number" />
        <Field label="Total shares" value={form.totalShares} onChange={set('totalShares')} />
        <Field label="Lot size" value={form.lotSize} onChange={set('lotSize')} type="number" />
        <Field label="Availability (%)" value={form.availabilityPercent} onChange={set('availabilityPercent')} type="number" />
      </Group>

      <Group title="Market data">
        <Field label="52 Week High (₹)" value={form.fiftyTwoWeekHigh} onChange={set('fiftyTwoWeekHigh')} type="number" />
        <Field label="52 Week Low (₹)" value={form.fiftyTwoWeekLow} onChange={set('fiftyTwoWeekLow')} type="number" />
      </Group>

      <Group title="Last funding round">
        <Field label="Round type" value={form.lastRoundType} onChange={set('lastRoundType')} placeholder="Series E / Rights issue" />
        <Field label="Round date" value={form.lastRoundDate} onChange={set('lastRoundDate')} placeholder="2023-06" />
        <Field label="Amount raised" value={form.lastRoundRaised} onChange={set('lastRoundRaised')} placeholder="₹3,500 Cr" />
        <Field label="Lead investor" value={form.lastRoundLead} onChange={set('lastRoundLead')} />
        <Field label="Post-money valuation" value={form.lastRoundValuation} onChange={set('lastRoundValuation')} placeholder="$5.6B" />
      </Group>
    </div>
  );
}
