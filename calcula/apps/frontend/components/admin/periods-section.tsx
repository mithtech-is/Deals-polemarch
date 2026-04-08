'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { gql } from '@/lib/api';
import { useAuth } from '@/components/auth-context';
import { Modal } from '@/components/ui/modal';
import { DELETE_PERIOD_MUTATION, UPSERT_PERIOD_MUTATION } from '@/lib/queries';
import type { FinancialPeriod } from '@/types/domain';

const VisTableShell = dynamic(
  () => import('@/components/vis/vis-table-shell').then((m) => ({ default: m.VisTableShell })),
  { ssr: false, loading: () => <div style={{ height: 260 }} /> }
);

function comparePeriodsAsc(a: FinancialPeriod, b: FinancialPeriod) {
  if (a.fiscalYear !== b.fiscalYear) return a.fiscalYear - b.fiscalYear;
  return (a.fiscalQuarter ?? 0) - (b.fiscalQuarter ?? 0);
}

function periodLabel(period: FinancialPeriod) {
  return period.fiscalQuarter ? `Q${period.fiscalQuarter} ${period.fiscalYear}` : `${period.fiscalYear}`;
}

function periodInputLabel(fiscalYear: number, fiscalQuarter?: number | null) {
  return fiscalQuarter ? `FY${fiscalYear} Q${fiscalQuarter}` : `FY${fiscalYear}`;
}

type Props = {
  companyId: string;
  periods: FinancialPeriod[];
  onPeriodsChanged: (newPeriods: FinancialPeriod[], newlyUpsertedPeriodId?: string) => void;
};

export function PeriodsSection({ companyId, periods, onPeriodsChanged }: Props) {
  const { token } = useAuth();
  const [selectedPeriodRowId, setSelectedPeriodRowId] = useState<string | null>(null);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [newPeriod, setNewPeriod] = useState({
    fiscalYear: new Date().getFullYear(),
    fiscalQuarter: '',
    periodStart: '',
    periodEnd: '',
    isAudited: false
  });
  const [periodModalError, setPeriodModalError] = useState<string | null>(null);
  const [periodSubmitAttempted, setPeriodSubmitAttempted] = useState(false);
  const [periodActionStatus, setPeriodActionStatus] = useState<string | null>(null);
  const [periodActionError, setPeriodActionError] = useState<string | null>(null);
  const [isUpsertingPeriod, setIsUpsertingPeriod] = useState(false);

  const sortedPeriods = useMemo(() => [...periods].sort(comparePeriodsAsc), [periods]);

  const normalizedQuarter = newPeriod.fiscalQuarter.trim() ? Number(newPeriod.fiscalQuarter) : null;
  const normalizedFiscalYear = Number(newPeriod.fiscalYear);

  const periodFormValidationError = useMemo(() => {
    if (!companyId) return 'Select a company before upserting a period.';
    if (!Number.isInteger(normalizedFiscalYear) || normalizedFiscalYear <= 0) return 'Fiscal year is required.';
    if (newPeriod.fiscalQuarter.trim()) {
      if (!Number.isInteger(normalizedQuarter) || (normalizedQuarter ?? 0) < 1 || (normalizedQuarter ?? 0) > 4) {
        return 'Quarter must be between 1 and 4.';
      }
    }
    if (!newPeriod.periodStart) return 'Period start date is required.';
    if (!newPeriod.periodEnd) return 'Period end date is required.';
    if (new Date(newPeriod.periodStart) > new Date(newPeriod.periodEnd)) {
      return 'Period start must be earlier than or equal to period end.';
    }
    return null;
  }, [companyId, normalizedFiscalYear, normalizedQuarter, newPeriod.fiscalQuarter, newPeriod.periodStart, newPeriod.periodEnd]);

  // Auto-fill start/end dates for new periods based on Indian fiscal year
  useEffect(() => {
    if (!isPeriodModalOpen || selectedPeriodRowId) return;
    const year = Number(newPeriod.fiscalYear);
    if (!year || Number.isNaN(year)) return;
    const quarter = newPeriod.fiscalQuarter.trim() ? Number(newPeriod.fiscalQuarter) : null;
    let startStr = '';
    let endStr = '';
    if (quarter === null) {
      startStr = `${year - 1}-04-01`;
      endStr = `${year}-03-31`;
    } else if (quarter === 1) {
      startStr = `${year - 1}-04-01`;
      endStr = `${year - 1}-06-30`;
    } else if (quarter === 2) {
      startStr = `${year - 1}-07-01`;
      endStr = `${year - 1}-09-30`;
    } else if (quarter === 3) {
      startStr = `${year - 1}-10-01`;
      endStr = `${year - 1}-12-31`;
    } else if (quarter === 4) {
      startStr = `${year}-01-01`;
      endStr = `${year}-03-31`;
    }
    setNewPeriod((prev) => {
      if (prev.periodStart === startStr && prev.periodEnd === endStr) return prev;
      return { ...prev, periodStart: startStr, periodEnd: endStr };
    });
  }, [newPeriod.fiscalYear, newPeriod.fiscalQuarter, isPeriodModalOpen, selectedPeriodRowId]);

  const openNewPeriodModal = () => {
    setSelectedPeriodRowId(null);
    setPeriodModalError(null);
    setPeriodSubmitAttempted(false);
    setNewPeriod({ fiscalYear: new Date().getFullYear(), fiscalQuarter: '', periodStart: '', periodEnd: '', isAudited: false });
    setIsPeriodModalOpen(true);
  };

  const openEditPeriodModal = () => {
    if (!selectedPeriodRowId) return;
    const period = periods.find((p) => p.id === selectedPeriodRowId);
    if (!period) return;
    setPeriodModalError(null);
    setPeriodSubmitAttempted(false);
    setNewPeriod({
      fiscalYear: period.fiscalYear,
      fiscalQuarter: period.fiscalQuarter ? String(period.fiscalQuarter) : '',
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      isAudited: period.isAudited
    });
    setIsPeriodModalOpen(true);
  };

  const createPeriod = async () => {
    setPeriodSubmitAttempted(true);
    if (!companyId || periodFormValidationError) {
      setPeriodModalError(periodFormValidationError ?? 'Select a company before upserting a period.');
      return;
    }
    setPeriodModalError(null);
    setPeriodActionStatus(null);
    setPeriodActionError(null);
    setIsUpsertingPeriod(true);
    try {
      const quarter = normalizedQuarter;
      const res = await gql<{ upsertPeriod: FinancialPeriod }>(
        UPSERT_PERIOD_MUTATION,
        {
          input: {
            companyId,
            fiscalYear: normalizedFiscalYear,
            fiscalQuarter: quarter === null ? undefined : quarter,
            periodStart: new Date(newPeriod.periodStart).toISOString(),
            periodEnd: new Date(newPeriod.periodEnd).toISOString(),
            isAudited: newPeriod.isAudited
          }
        },
        token
      );
      const upserted = res.upsertPeriod;
      // Merge locally: add or update
      const merged = (() => {
        const existingIdx = periods.findIndex((p) => p.id === upserted.id);
        if (existingIdx >= 0) {
          const next = [...periods];
          next[existingIdx] = upserted;
          return next;
        }
        return [...periods, upserted];
      })();
      onPeriodsChanged(merged, upserted.id);
      const friendlyLabel = periodInputLabel(upserted.fiscalYear, upserted.fiscalQuarter);
      setPeriodActionStatus(`Upserted period: ${friendlyLabel}`);
      setPeriodActionError(null);
      setPeriodSubmitAttempted(false);
      setIsPeriodModalOpen(false);
      setNewPeriod({ fiscalYear: new Date().getFullYear(), fiscalQuarter: '', periodStart: '', periodEnd: '', isAudited: false });
    } catch (e) {
      const message = (e as Error).message;
      setPeriodModalError(message);
      setPeriodActionError(message);
    } finally {
      setIsUpsertingPeriod(false);
    }
  };

  const deletePeriod = async () => {
    if (!companyId || !selectedPeriodRowId) return;
    if (!confirm('Are you sure you want to delete this period and all its financial data? This cannot be undone.')) return;
    setPeriodActionError(null);
    setPeriodActionStatus(null);
    try {
      await gql(DELETE_PERIOD_MUTATION, { id: selectedPeriodRowId }, token);
      const filtered = periods.filter((p) => p.id !== selectedPeriodRowId);
      onPeriodsChanged(filtered);
      setSelectedPeriodRowId(null);
      setPeriodActionStatus('Period deleted.');
    } catch (e) {
      setPeriodActionError((e as Error).message);
    }
  };

  const periodColumns = useMemo(
    () => [
      { key: 'label', title: 'Period', width: 180 },
      { key: 'start', title: 'Start', width: 140 },
      { key: 'end', title: 'End', width: 140 },
      { key: 'audited', title: 'Audited', width: 120 }
    ],
    []
  );
  const periodRecords = useMemo(
    () =>
      sortedPeriods.map((period) => ({
        id: period.id,
        label: periodLabel(period),
        start: period.periodStart,
        end: period.periodEnd,
        audited: period.isAudited ? 'yes' : 'no'
      })),
    [sortedPeriods]
  );

  return (
    <div className="card col">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 className="page-title">Periods</h2>
        <div className="row">
          <button className="secondary" onClick={openNewPeriodModal}>
            New
          </button>
          <button className="secondary" onClick={openEditPeriodModal} disabled={!selectedPeriodRowId}>
            Edit Selected
          </button>
          <button
            className="secondary"
            onClick={deletePeriod}
            disabled={!selectedPeriodRowId}
            style={{ color: '#ef4444', borderColor: '#ef4444' }}
          >
            Delete Selected
          </button>
        </div>
      </div>

      <Modal isOpen={isPeriodModalOpen} onClose={() => setIsPeriodModalOpen(false)} title="Upsert Period">
        {(periodModalError || (periodSubmitAttempted && periodFormValidationError)) && (
          <p className="error" style={{ marginBottom: 16 }}>
            {periodModalError ?? periodFormValidationError}
          </p>
        )}
        <div className="grid grid-2" style={{ marginBottom: 20 }}>
          <label className="col">
            <span>Fiscal Year</span>
            <input
              type="number"
              value={newPeriod.fiscalYear}
              onChange={(e) => {
                setNewPeriod((p) => ({ ...p, fiscalYear: Number(e.target.value) }));
                setPeriodModalError(null);
                setPeriodSubmitAttempted(false);
              }}
            />
          </label>
          <label className="col">
            <span>Quarter (empty = yearly)</span>
            <input
              type="number"
              min={1}
              max={4}
              value={newPeriod.fiscalQuarter}
              onChange={(e) => {
                setNewPeriod((p) => ({ ...p, fiscalQuarter: e.target.value }));
                setPeriodModalError(null);
                setPeriodSubmitAttempted(false);
              }}
            />
          </label>
          <label className="col">
            <span>Period Start</span>
            <input
              type="date"
              value={newPeriod.periodStart}
              onChange={(e) => {
                setNewPeriod((p) => ({ ...p, periodStart: e.target.value }));
                setPeriodModalError(null);
                setPeriodSubmitAttempted(false);
              }}
            />
          </label>
          <label className="col">
            <span>Period End</span>
            <input
              type="date"
              value={newPeriod.periodEnd}
              onChange={(e) => {
                setNewPeriod((p) => ({ ...p, periodEnd: e.target.value }));
                setPeriodModalError(null);
                setPeriodSubmitAttempted(false);
              }}
            />
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={newPeriod.isAudited}
              onChange={(e) => {
                setNewPeriod((p) => ({ ...p, isAudited: e.target.checked }));
                setPeriodModalError(null);
                setPeriodSubmitAttempted(false);
              }}
            />{' '}
            Audited
          </label>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <button
            className="secondary"
            onClick={() => {
              setPeriodModalError(null);
              setPeriodSubmitAttempted(false);
              setNewPeriod({
                fiscalYear: new Date().getFullYear(),
                fiscalQuarter: '',
                periodStart: '',
                periodEnd: '',
                isAudited: false
              });
            }}
          >
            Reset
          </button>
          <button onClick={createPeriod} disabled={isUpsertingPeriod || Boolean(periodFormValidationError)}>
            {isUpsertingPeriod ? 'Upserting...' : 'Upsert Period'}
          </button>
        </div>
      </Modal>

      {periodActionStatus && <p className="success">{periodActionStatus}</p>}
      {periodActionError && <p className="error">{periodActionError}</p>}

      <VisTableShell
        columns={periodColumns}
        records={periodRecords}
        height={260}
        onClickRow={(_, record) => {
          if (!record?.id) return;
          setSelectedPeriodRowId(String(record.id));
        }}
      />
    </div>
  );
}
