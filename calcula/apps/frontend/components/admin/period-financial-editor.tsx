'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { gql } from '@/lib/api';
import { useAuth } from '@/components/auth-context';
import { formatReadOnlyFinancialValue, parseFinancialInput } from '@/lib/financial-number';
import {
  COMPANY_MULTI_PERIOD_FINANCIALS_QUERY,
  LINE_ITEMS_QUERY,
  REMAINDER_MAPPINGS_QUERY,
  UPSERT_FINANCIAL_VALUES_MUTATION
} from '@/lib/queries';
import type {
  FinancialLineItem,
  FinancialPeriod,
  FinancialRemainderMapping,
  FinancialValue
} from '@/types/domain';

type StatementType = 'balance_sheet' | 'pnl' | 'cashflow' | 'derived';
type DraftsByPeriod = Record<string, Record<string, string>>;
// Fields that admins can manually override on the Derived tab.
//
// `market_price_per_share` was historically here too, but it duplicates the
// price-history section (which is the authoritative source for prices per
// company). Entering the same value in two places was drift-prone — editors
// would update one and forget the other. Now prices live only in the Price
// History section; this set only covers values the price history can't
// express (share count, manual enterprise-value override).
const DERIVED_MANUAL_INPUT_CODES = new Set([
  'shares_outstanding',
  'enterprise_value_manual'
]);

function comparePeriodsAsc(a: FinancialPeriod, b: FinancialPeriod) {
  if (a.fiscalYear !== b.fiscalYear) return a.fiscalYear - b.fiscalYear;
  return (a.fiscalQuarter ?? 0) - (b.fiscalQuarter ?? 0);
}

function periodLabel(period?: FinancialPeriod) {
  if (!period) return '-';
  return period.fiscalQuarter ? `Q${period.fiscalQuarter} ${period.fiscalYear}` : `${period.fiscalYear}`;
}

function toIndented(items: FinancialLineItem[]) {
  const byParent = new Map<string | null, FinancialLineItem[]>();
  for (const item of items) {
    const key = item.parentId ?? null;
    const rows = byParent.get(key) ?? [];
    rows.push(item);
    byParent.set(key, rows);
  }
  for (const rows of byParent.values()) {
    rows.sort((a, b) => {
      if (a.orderCode !== b.orderCode) return a.orderCode.localeCompare(b.orderCode);
      return a.code.localeCompare(b.code);
    });
  }
  const out: Array<FinancialLineItem & { depth: number }> = [];
  const seen = new Set<string>();
  const walk = (parentId: string | null, depth: number) => {
    const children = byParent.get(parentId) ?? [];
    for (const child of children) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      out.push({ ...child, depth });
      walk(child.id, depth + 1);
    }
  };
  walk(null, 0);
  for (const item of items) {
    if (!seen.has(item.id)) out.push({ ...item, depth: 0 });
  }
  return out;
}

function evaluateFormula(formula: string, codeToValue: Map<string, number>): number | null {
  if (!formula.trim()) return null;
  const ids = Array.from(new Set(formula.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) ?? []));
  const hasAnyInput = ids.some((id) => codeToValue.has(id));
  if (!hasAnyInput) return null;
  const replaced = formula.replace(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g, (code) => String(codeToValue.get(code) ?? 0));
  if (/[^0-9+\-*/().\s]/.test(replaced)) return null;
  try {
    const value = Function(`"use strict"; return (${replaced});`)() as number;
    if (!Number.isFinite(value)) return null;
    return value;
  } catch {
    return null;
  }
}

type Props = {
  companyId: string;
  periods: FinancialPeriod[];
};

export function PeriodFinancialEditor({ companyId, periods }: Props) {
  const { token } = useAuth();
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<string[]>([]);
  const [statementType, setStatementType] = useState<StatementType>('pnl');
  const [lineItems, setLineItems] = useState<FinancialLineItem[]>([]);
  const [values, setValues] = useState<FinancialValue[]>([]);
  const [remainderMappings, setRemainderMappings] = useState<FinancialRemainderMapping[]>([]);
  const [drafts, setDrafts] = useState<DraftsByPeriod>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [activeCellKey, setActiveCellKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sortedPeriods = useMemo(() => [...periods].sort(comparePeriodsAsc), [periods]);
  const periodById = useMemo(() => new Map(periods.map((p) => [p.id, p])), [periods]);

  // Default to last 2 periods whenever the period list changes and nothing valid is selected
  useEffect(() => {
    setSelectedPeriodIds((prev) => {
      const available = new Set(periods.map((p) => p.id));
      const retained = prev.filter((id) => available.has(id));
      if (retained.length) return retained.sort((a, b) => {
        const pA = periodById.get(a);
        const pB = periodById.get(b);
        if (!pA || !pB) return 0;
        return comparePeriodsAsc(pA, pB);
      });
      return sortedPeriods.slice(-2).map((p) => p.id);
    });
  }, [periods, sortedPeriods, periodById]);

  // Load line items + remainder mappings when statement type changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [li, rm] = await Promise.all([
          gql<{ financialLineItems: FinancialLineItem[] }>(LINE_ITEMS_QUERY, { statementType }, token),
          gql<{ financialRemainderMappings: FinancialRemainderMapping[] }>(REMAINDER_MAPPINGS_QUERY, { statementType }, token)
        ]);
        if (cancelled) return;
        setLineItems(li.financialLineItems ?? []);
        setRemainderMappings(rm.financialRemainderMappings ?? []);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [statementType, token]);

  // Load values whenever company / selected periods / statement change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!companyId || !selectedPeriodIds.length) {
        setValues([]);
        return;
      }
      try {
        const res = await gql<{ companyMultiPeriodFinancials: FinancialValue[] }>(
          COMPANY_MULTI_PERIOD_FINANCIALS_QUERY,
          { companyId, periodIds: selectedPeriodIds, statementType },
          token
        );
        if (!cancelled) setValues(res.companyMultiPeriodFinancials ?? []);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, selectedPeriodIds, statementType, token]);

  const selectedPeriods = useMemo(
    () =>
      selectedPeriodIds
        .map((id) => periodById.get(id))
        .filter((p): p is FinancialPeriod => Boolean(p))
        .sort(comparePeriodsAsc),
    [selectedPeriodIds, periodById]
  );
  const flatItems = useMemo(() => toIndented(lineItems), [lineItems]);

  const persistedByKey = useMemo(
    () => new Map(values.map((v) => [`${v.periodId}:${v.lineItemId}`, v.value])),
    [values]
  );
  const persistedRowByKey = useMemo(
    () => new Map(values.map((v) => [`${v.periodId}:${v.lineItemId}`, v])),
    [values]
  );
  const calculatedLineItemIds = useMemo(
    () => new Set(flatItems.filter((item) => item.isCalculated).map((item) => item.id)),
    [flatItems]
  );
  const lineItemById = useMemo(() => new Map(flatItems.map((item) => [item.id, item])), [flatItems]);
  const remainderMappingByParentId = useMemo(
    () => new Map(remainderMappings.map((m) => [m.parentLineItemId, m.remainderLineItemId])),
    [remainderMappings]
  );
  const mappedParentIds = useMemo(
    () => new Set(remainderMappings.map((m) => m.parentLineItemId)),
    [remainderMappings]
  );
  const childrenByParentId = useMemo(() => {
    const out = new Map<string, string[]>();
    for (const item of flatItems) {
      if (!item.parentId) continue;
      const kids = out.get(item.parentId) ?? [];
      kids.push(item.id);
      out.set(item.parentId, kids);
    }
    return out;
  }, [flatItems]);

  const isEditableItem = (item: FinancialLineItem) =>
    mappedParentIds.has(item.id) ||
    (!item.isCalculated && (statementType !== 'derived' || DERIVED_MANUAL_INPUT_CODES.has(item.code)));

  const editableRows = useMemo(
    () => flatItems.filter((item) => isEditableItem(item)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flatItems, statementType, mappedParentIds]
  );
  const editableRowIndexById = useMemo(
    () => new Map(editableRows.map((item, idx) => [item.id, idx])),
    [editableRows]
  );

  const livePreviewByPeriod = useMemo(() => {
    const idToCode = new Map(flatItems.map((item) => [item.id, item.code]));
    const calculatedItems = flatItems.filter((item) => item.isCalculated && item.formula);
    const out = new Map<
      string,
      {
        calculated: Map<string, number>;
        reconciledParents: Set<string>;
        autoRemainders: Set<string>;
      }
    >();

    for (const periodId of selectedPeriodIds) {
      const codeToValue = new Map<string, number>();
      const valueByLineItemId = new Map<string, number>();
      const reconciledParents = new Set<string>();
      const autoRemainders = new Set<string>();

      for (const item of flatItems) {
        const persisted = persistedByKey.get(`${periodId}:${item.id}`);
        if (persisted !== undefined) {
          codeToValue.set(item.code, Number(persisted));
          valueByLineItemId.set(item.id, Number(persisted));
        }
      }

      const draftsForPeriod = drafts[periodId] ?? {};
      for (const [lineItemId, raw] of Object.entries(draftsForPeriod)) {
        if (calculatedLineItemIds.has(lineItemId)) continue;
        const code = idToCode.get(lineItemId);
        if (!code) continue;
        const n = parseFinancialInput(raw);
        if (n !== null) {
          codeToValue.set(code, n);
          valueByLineItemId.set(lineItemId, n);
        }
      }

      for (const [parentId, remainderId] of remainderMappingByParentId.entries()) {
        const parentDraftRaw = draftsForPeriod[parentId];
        const parentDraftParsed = parentDraftRaw !== undefined ? parseFinancialInput(parentDraftRaw) : null;
        const parentPersisted = persistedRowByKey.get(`${periodId}:${parentId}`);
        const parentValueFromDraft =
          parentDraftRaw !== undefined && parentDraftRaw.trim() !== '' && parentDraftParsed !== null;
        const parentManualPersisted = parentPersisted?.valueSource === 'manual';
        const parentEntered = parentValueFromDraft || parentManualPersisted;

        if (parentEntered) {
          const parentValue = parentValueFromDraft
            ? (parentDraftParsed as number)
            : parentPersisted
              ? Number(parentPersisted.value)
              : null;
          if (parentValue === null || Number.isNaN(parentValue)) continue;
          const childIds = (childrenByParentId.get(parentId) ?? []).filter((id) => id !== remainderId);
          let childTotal = 0;
          for (const childId of childIds) {
            const childItem = lineItemById.get(childId);
            if (!childItem || childItem.isCalculated) continue;
            const v = valueByLineItemId.get(childId);
            if (v === undefined || !Number.isFinite(v)) continue;
            childTotal += v;
          }
          const remainder = parentValue - childTotal;
          const remainderCode = idToCode.get(remainderId);
          const parentCode = idToCode.get(parentId);
          if (remainderCode) codeToValue.set(remainderCode, remainder);
          if (parentCode) codeToValue.set(parentCode, parentValue);
          valueByLineItemId.set(parentId, parentValue);
          valueByLineItemId.set(remainderId, remainder);
          autoRemainders.add(remainderId);
          reconciledParents.add(parentId);
          continue;
        }

        const children = childrenByParentId.get(parentId) ?? [];
        let hasAnyChild = false;
        let sumChildren = 0;
        for (const childId of children) {
          const childItem = lineItemById.get(childId);
          if (!childItem || childItem.isCalculated) continue;
          const v = valueByLineItemId.get(childId);
          if (v === undefined || !Number.isFinite(v)) continue;
          hasAnyChild = true;
          sumChildren += v;
        }
        if (!hasAnyChild) continue;
        const parentCode = idToCode.get(parentId);
        if (parentCode) codeToValue.set(parentCode, sumChildren);
        valueByLineItemId.set(parentId, sumChildren);
        reconciledParents.add(parentId);
      }

      const byLineItemId = new Map<string, number>(valueByLineItemId);
      for (let pass = 0; pass < calculatedItems.length; pass += 1) {
        let changed = false;
        for (const item of calculatedItems) {
          const next = evaluateFormula(item.formula ?? '', codeToValue);
          if (next === null) continue;
          const prev = codeToValue.get(item.code);
          if (prev === undefined || Math.abs(prev - next) > 1e-9) {
            codeToValue.set(item.code, next);
            byLineItemId.set(item.id, next);
            changed = true;
          }
        }
        if (!changed) break;
      }

      out.set(periodId, { calculated: byLineItemId, reconciledParents, autoRemainders });
    }

    return out;
  }, [
    flatItems,
    selectedPeriodIds,
    persistedByKey,
    drafts,
    calculatedLineItemIds,
    remainderMappingByParentId,
    childrenByParentId,
    lineItemById,
    persistedRowByKey
  ]);

  const togglePeriod = (periodId: string) => {
    setSelectedPeriodIds((prev) => {
      if (prev.includes(periodId)) return prev.filter((id) => id !== periodId);
      return [...new Set([...prev, periodId])].sort((a, b) => {
        const pA = periodById.get(a);
        const pB = periodById.get(b);
        if (!pA || !pB) return 0;
        return comparePeriodsAsc(pA, pB);
      });
    });
  };

  const setDraftValue = (periodId: string, lineItemId: string, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [periodId]: { ...(prev[periodId] ?? {}), [lineItemId]: value }
    }));
  };

  const focusCell = (rowIndex: number, colIndex: number) => {
    const period = selectedPeriods[colIndex];
    const row = editableRows[rowIndex];
    if (!period || !row) return;
    const key = `${period.id}:${row.id}`;
    const node = inputRefs.current[key];
    if (node) {
      node.focus();
      node.select();
    }
  };

  const onCellKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    const key = event.key;
    if (key === 'Enter' || key === 'ArrowDown') {
      event.preventDefault();
      focusCell(rowIndex + 1, colIndex);
    } else if (key === 'ArrowUp') {
      event.preventDefault();
      focusCell(rowIndex - 1, colIndex);
    } else if (key === 'Tab' || key === 'ArrowRight') {
      event.preventDefault();
      focusCell(rowIndex, colIndex + (event.shiftKey && key === 'Tab' ? -1 : 1));
    } else if (key === 'ArrowLeft') {
      event.preventDefault();
      focusCell(rowIndex, colIndex - 1);
    }
  };

  const downloadCsvTemplate = () => {
    if (!selectedPeriodIds.length) {
      setError('Select periods to download CSV template');
      return;
    }
    const headerRow = ['Line Item Code', 'Line Item Name'];
    for (const period of selectedPeriods) {
      headerRow.push(`${periodLabel(period)} [${period.id}]`);
    }
    const rows: string[][] = [headerRow];
    for (const item of editableRows) {
      const row = [item.code, item.name];
      for (const periodId of selectedPeriodIds) {
        let valStr = '';
        const draft = drafts[periodId]?.[item.id];
        if (draft !== undefined) {
          valStr = draft;
        } else {
          const persisted = persistedByKey.get(`${periodId}:${item.id}`);
          if (persisted !== undefined) valStr = persisted.toString();
        }
        row.push(valStr);
      }
      rows.push(row);
    }
    const escapeCsv = (str: string) =>
      str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
    const csv = rows.map((r) => r.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `financials_${companyId}_${statementType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCsvText = (text: string) => {
    const arr: string[][] = [];
    let quote = false;
    let row: string[] = [];
    let col = '';
    for (let c = 0; c < text.length; c++) {
      const cc = text[c];
      const nc = text[c + 1];
      if (cc === '"' && quote && nc === '"') {
        col += '"';
        c++;
      } else if (cc === '"') {
        quote = !quote;
      } else if (cc === ',' && !quote) {
        row.push(col);
        col = '';
      } else if (cc === '\n' && !quote) {
        row.push(col);
        arr.push(row);
        col = '';
        row = [];
      } else if (cc === '\r' && nc === '\n' && !quote) {
        row.push(col);
        arr.push(row);
        col = '';
        row = [];
        c++;
      } else {
        col += cc;
      }
    }
    if (col || row.length) {
      row.push(col);
      arr.push(row);
    }
    return arr;
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCsvText(text);
        if (rows.length < 2) throw new Error('CSV is empty or missing data rows');
        const headerRow = rows[0];
        const periodIdsInCsv: string[] = [];
        for (let i = 2; i < headerRow.length; i++) {
          const match = headerRow[i].match(/\[([^[\]]+)\]$/);
          if (match && match[1]) periodIdsInCsv.push(match[1]);
          else throw new Error(`Invalid header column format for period column: ${headerRow[i]}`);
        }
        const codeToLineItemId = new Map(flatItems.map((i) => [i.code, i.id]));
        setDrafts((prev) => {
          const next = { ...prev };
          for (const pid of periodIdsInCsv) {
            next[pid] = { ...(next[pid] ?? {}) };
          }
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const code = row[0]?.trim();
            if (!code) continue;
            const lineItemId = codeToLineItemId.get(code);
            if (!lineItemId) continue;
            const item = lineItemById.get(lineItemId);
            if (item && !isEditableItem(item)) continue;
            for (let j = 0; j < periodIdsInCsv.length; j++) {
              const val = row[2 + j]?.trim();
              if (val !== undefined && val !== '') next[periodIdsInCsv[j]][lineItemId] = val;
            }
          }
          return next;
        });
        const newSelected = new Set(selectedPeriodIds);
        periodIdsInCsv.forEach((id) => newSelected.add(id));
        setSelectedPeriodIds(Array.from(newSelected));
        setSuccess('CSV imported to drafts. Review highlighted cells and press Save All Changes.');
      } catch (err) {
        setError((err as Error).message);
      } finally {
        if (csvInputRef.current) csvInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const saveFinancials = async () => {
    if (!companyId || !selectedPeriodIds.length) return;
    setError(null);
    setSuccess(null);

    const items = selectedPeriodIds.flatMap((periodId) => {
      const base = Object.entries(drafts[periodId] ?? {})
        .map(([lineItemId, raw]) => ({ lineItemId, parsed: parseFinancialInput(raw) }))
        .filter((row) => {
          if (calculatedLineItemIds.has(row.lineItemId) || row.parsed === null) return false;
          const item = lineItemById.get(row.lineItemId);
          return item ? isEditableItem(item) : false;
        })
        .map((row) => ({
          companyId,
          periodId,
          lineItemId: row.lineItemId,
          value: row.parsed as number,
          currency: 'INR',
          valueSource: 'manual' as const
        }));

      const live = livePreviewByPeriod.get(periodId);
      if (!live) return base;
      const extra: Array<{
        companyId: string;
        periodId: string;
        lineItemId: string;
        value: number;
        currency: string;
        valueSource: 'manual' | 'derived';
      }> = [];
      for (const parentId of live.reconciledParents) {
        const parentValue = live.calculated.get(parentId);
        if (parentValue !== undefined) {
          extra.push({
            companyId,
            periodId,
            lineItemId: parentId,
            value: parentValue,
            currency: 'INR',
            valueSource: 'derived'
          });
        }
      }
      for (const remainderId of live.autoRemainders) {
        const remainderValue = live.calculated.get(remainderId);
        if (remainderValue !== undefined) {
          extra.push({
            companyId,
            periodId,
            lineItemId: remainderId,
            value: remainderValue,
            currency: 'INR',
            valueSource: 'manual'
          });
        }
      }
      const byKey = new Map<string, (typeof extra)[number]>();
      for (const row of [...base, ...extra]) {
        byKey.set(`${row.companyId}:${row.periodId}:${row.lineItemId}`, row);
      }
      return Array.from(byKey.values());
    });

    if (!items.length) {
      setError('No valid numeric draft values to save');
      return;
    }

    try {
      await gql(UPSERT_FINANCIAL_VALUES_MUTATION, { input: { items } }, token);
      setSuccess(`Financial values saved (${items.length} cells)`);
      setDrafts({});
      // Reload values
      const res = await gql<{ companyMultiPeriodFinancials: FinancialValue[] }>(
        COMPANY_MULTI_PERIOD_FINANCIALS_QUERY,
        { companyId, periodIds: selectedPeriodIds, statementType },
        token
      );
      setValues(res.companyMultiPeriodFinancials ?? []);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const invalidCellKeys = useMemo(() => {
    const out = new Set<string>();
    for (const period of selectedPeriods) {
      const periodDrafts = drafts[period.id] ?? {};
      for (const [lineItemId, raw] of Object.entries(periodDrafts)) {
        if (calculatedLineItemIds.has(lineItemId)) continue;
        const item = lineItemById.get(lineItemId);
        if (!item || !isEditableItem(item)) continue;
        if (!raw.trim()) continue;
        if (parseFinancialInput(raw) === null) out.add(`${period.id}:${lineItemId}`);
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts, selectedPeriods, calculatedLineItemIds, lineItemById, mappedParentIds]);

  const dirtyCellCount = useMemo(() => {
    let count = 0;
    for (const period of selectedPeriods) {
      const periodDrafts = drafts[period.id] ?? {};
      for (const [lineItemId, raw] of Object.entries(periodDrafts)) {
        if (calculatedLineItemIds.has(lineItemId)) continue;
        const item = lineItemById.get(lineItemId);
        if (!item || !isEditableItem(item)) continue;
        if (!raw.trim()) continue;
        count += 1;
      }
    }
    return count;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts, selectedPeriods, calculatedLineItemIds, lineItemById, statementType, mappedParentIds]);

  const autoBalancedCount = useMemo(() => {
    let count = 0;
    for (const periodId of selectedPeriodIds) {
      const live = livePreviewByPeriod.get(periodId);
      if (!live) continue;
      count += live.autoRemainders.size;
    }
    return count;
  }, [selectedPeriodIds, livePreviewByPeriod]);

  const mappingWarnings = useMemo(() => {
    const warnings: string[] = [];
    for (const mapping of remainderMappings) {
      const parent = lineItemById.get(mapping.parentLineItemId);
      const childIds = childrenByParentId.get(mapping.parentLineItemId) ?? [];
      if (!parent) {
        warnings.push(`Mapping parent is missing from this statement view: ${mapping.parentCode}`);
        continue;
      }
      if (!childIds.includes(mapping.remainderLineItemId)) {
        warnings.push(`Invalid mapping: ${mapping.remainderCode} is not a child of ${mapping.parentCode}.`);
      }
    }
    return warnings;
  }, [remainderMappings, lineItemById, childrenByParentId]);

  return (
    <div className="card col">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 className="page-title">Period Financial Editor</h2>
      </div>
      <p className="muted page-subtitle">Selected periods: {selectedPeriodIds.length}</p>
      <p className="muted page-subtitle">
        Select multiple periods to compare/edit side-by-side. Calculated rows stay read-only and update live.
      </p>
      <p className="muted page-subtitle">
        For mapped groups, entering a 2nd-level parent auto-balances its mapped Others child.
      </p>
      {autoBalancedCount > 0 && <p className="success">Auto-balanced cells: {autoBalancedCount}</p>}
      {mappingWarnings.map((warning) => (
        <p key={warning} className="error">
          {warning}
        </p>
      ))}

      <div className="grid company-editor-controls">
        <label className="col">
          <span>Statement</span>
          <select value={statementType} onChange={(e) => setStatementType(e.target.value as StatementType)}>
            <option value="balance_sheet">Balance Sheet</option>
            <option value="pnl">P&amp;L</option>
            <option value="cashflow">Cashflow</option>
            <option value="derived">Derived</option>
          </select>
        </label>
        <div className="col">
          <span>Periods</span>
          {sortedPeriods.length > 0 ? (
            <div className="period-picker">
              {sortedPeriods.map((period) => (
                <label key={period.id} className="row period-option">
                  <input
                    type="checkbox"
                    checked={selectedPeriodIds.includes(period.id)}
                    onChange={() => togglePeriod(period.id)}
                  />
                  {periodLabel(period)}
                </label>
              ))}
            </div>
          ) : (
            <div className="period-empty">
              <p className="muted page-subtitle">No periods for this company. Create one in the Periods section.</p>
            </div>
          )}
        </div>
        <div className="row" style={{ alignItems: 'end' }}>
          <input type="file" accept=".csv" ref={csvInputRef} style={{ display: 'none' }} onChange={handleCsvUpload} />
          <button
            className="secondary"
            onClick={downloadCsvTemplate}
            disabled={!selectedPeriodIds.length || !editableRows.length}
          >
            Download CSV
          </button>
          <button className="secondary" onClick={() => csvInputRef.current?.click()} disabled={!selectedPeriodIds.length}>
            Import CSV
          </button>
          <button
            onClick={saveFinancials}
            disabled={selectedPeriodIds.length === 0 || dirtyCellCount === 0 || invalidCellKeys.size > 0}
          >
            Save All Changes
          </button>
        </div>
      </div>

      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <p className="muted page-subtitle">Edited cells: {dirtyCellCount}</p>
        {invalidCellKeys.size > 0 && <p className="error-inline">Invalid cells: {invalidCellKeys.size}</p>}
      </div>
      {selectedPeriodIds.length === 0 && (
        <p className="muted page-subtitle">Select at least one period to enter financial values.</p>
      )}

      <div className="row" style={{ flexWrap: 'wrap' }}>
        {selectedPeriods.map((period) => (
          <span className="chip" key={period.id}>
            {periodLabel(period)}
            <button
              className="chip-close"
              onClick={() => togglePeriod(period.id)}
              aria-label={`Remove ${periodLabel(period)}`}
            >
              x
            </button>
          </span>
        ))}
      </div>

      <div className="table-wrap">
        <table className="table-wide">
          <thead>
            <tr>
              <th className="sticky-col">Line Item</th>
              <th className="sticky-col-2">Code</th>
              <th className="sticky-col-3">Formula</th>
              {selectedPeriods.map((period) => (
                <th key={period.id}>{periodLabel(period)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {flatItems.map((item) => (
              <tr key={item.id}>
                <td className="sticky-col" style={{ paddingLeft: `${8 + item.depth * 16}px` }}>
                  {item.name}
                </td>
                <td className="sticky-col-2">{item.code}</td>
                <td className="sticky-col-3">{item.formula ?? '-'}</td>
                {selectedPeriods.map((period) => {
                  const persisted = persistedByKey.get(`${period.id}:${item.id}`);
                  const live = livePreviewByPeriod.get(period.id);
                  const calculated = live?.calculated.get(item.id);
                  const draft = drafts[period.id]?.[item.id] ?? '';
                  const cellKey = `${period.id}:${item.id}`;
                  const isAutoManagedRemainder = !!(
                    live?.autoRemainders.has(item.id) &&
                    remainderMappings.some((mapping) => mapping.remainderLineItemId === item.id)
                  );
                  const isEditable = isEditableItem(item) && !isAutoManagedRemainder;
                  const rowIndex = editableRowIndexById.get(item.id) ?? -1;
                  const value = item.isCalculated
                    ? (calculated ?? persisted ?? null) === null
                      ? ''
                      : formatReadOnlyFinancialValue(calculated ?? persisted ?? null)
                    : draft ||
                      (calculated !== undefined
                        ? String(calculated)
                        : persisted !== undefined
                          ? String(persisted)
                          : '');

                  return (
                    <td key={`${item.id}:${period.id}`}>
                      <input
                        type="text"
                        value={value}
                        disabled={!isEditable}
                        className={
                          isEditable && invalidCellKeys.has(cellKey)
                            ? 'cell-invalid'
                            : isEditable && activeCellKey === cellKey
                              ? 'cell-active'
                              : ''
                        }
                        placeholder={
                          item.isCalculated
                            ? 'Auto calculated'
                            : isAutoManagedRemainder
                              ? 'Auto-balanced'
                              : isEditable
                                ? ''
                                : 'Read only'
                        }
                        ref={(el) => {
                          if (isEditable) inputRefs.current[cellKey] = el;
                        }}
                        onFocus={() => {
                          if (isEditable) setActiveCellKey(cellKey);
                        }}
                        onBlur={() => {
                          if (isEditable && activeCellKey === cellKey) setActiveCellKey(null);
                        }}
                        onKeyDown={(e) => {
                          if (isEditable && rowIndex >= 0) {
                            const colIndex = selectedPeriods.findIndex((p) => p.id === period.id);
                            onCellKeyDown(e, rowIndex, colIndex);
                          }
                        }}
                        onChange={(e) => {
                          if (isEditable) setDraftValue(period.id, item.id, e.target.value);
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
    </div>
  );
}
