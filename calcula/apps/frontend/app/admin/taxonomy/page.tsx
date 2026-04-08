'use client';

import { useEffect, useMemo, useState } from 'react';
import { gql } from '@/lib/api';
import {
  DELETE_LINE_ITEM_MUTATION,
  DELETE_REMAINDER_MAPPING_MUTATION,
  LINE_ITEMS_QUERY,
  REPAIR_REMAINDER_MAPPING_MUTATION,
  REMAINDER_MAPPINGS_QUERY,
  UPSERT_LINE_ITEM_MUTATION,
  UPSERT_REMAINDER_MAPPING_MUTATION
} from '@/lib/queries';
import { useAuth } from '@/components/auth-context';
import { DashboardPage, DashboardSection } from '@/components/dashboard/template';
import { RequireAuth } from '@/components/require-auth';
import { Modal } from '@/components/ui/modal';
import dynamic from 'next/dynamic';

const VisTableShell = dynamic(
  () => import('@/components/vis/vis-table-shell').then((m) => ({ default: m.VisTableShell })),
  { ssr: false, loading: () => <div style={{ height: 420 }} /> }
);
import type { FinancialLineItem, FinancialRemainderMapping } from '@/types/domain';

function toIndented(items: FinancialLineItem[]) {
  const byId = new Map(items.map((item) => [item.id, item]));
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
    if (!seen.has(item.id)) {
      out.push({ ...item, depth: byId.get(item.parentId ?? '') ? 1 : 0 });
    }
  }
  return out;
}

export default function AdminTaxonomyPage() {
  const { token } = useAuth();
  const [statementType, setStatementType] = useState<'balance_sheet' | 'pnl' | 'cashflow' | 'derived'>('balance_sheet');
  const [items, setItems] = useState<FinancialLineItem[]>([]);
  const [remainderMappings, setRemainderMappings] = useState<FinancialRemainderMapping[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLineItemModalOpen, setIsLineItemModalOpen] = useState(false);
  const [lineItemModalMode, setLineItemModalMode] = useState<'create' | 'edit'>('create');
  const [selectedLineItemId, setSelectedLineItemId] = useState<string | null>(null);
  const [selectedMappingId, setSelectedMappingId] = useState<string | null>(null);

  const emptyForm = {
    id: '',
    code: '',
    name: '',
    parentId: '',
    statementType: 'balance_sheet' as 'balance_sheet' | 'pnl' | 'cashflow' | 'derived',
    orderCode: '01',
    displayOrder: 10,
    isRequired: false,
    isCalculated: false,
    formula: ''
  };

  const [form, setForm] = useState({
    ...emptyForm
  });

  const buildFormFromItem = (item: FinancialLineItem) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    parentId: item.parentId ?? '',
    statementType: item.statementType,
    orderCode: item.orderCode,
    displayOrder: item.displayOrder,
    isRequired: item.isRequired,
    isCalculated: item.isCalculated,
    formula: item.formula ?? ''
  });

  const load = async () => {
    setError(null);
    const [lineItemsRes, mappingsRes] = await Promise.all([
      gql<{ financialLineItems: FinancialLineItem[] }>(LINE_ITEMS_QUERY, { statementType }, token),
      gql<{ financialRemainderMappings: FinancialRemainderMapping[] }>(
        REMAINDER_MAPPINGS_QUERY,
        { statementType },
        token
      )
    ]);
    setItems(lineItemsRes.financialLineItems ?? []);
    setRemainderMappings(mappingsRes.financialRemainderMappings ?? []);
  };

  useEffect(() => {
    void load();
  }, [statementType]);

  const allNodes = useMemo(() => toIndented(items), [items]);
  const byId = useMemo(() => new Map(items.map((row) => [row.id, row])), [items]);
  const selectedLineItem = useMemo(
    () => allNodes.find((item) => item.id === selectedLineItemId) ?? null,
    [allNodes, selectedLineItemId]
  );
  const [mappingForm, setMappingForm] = useState({ parentLineItemId: '', remainderLineItemId: '' });
  const taxonomyColumns = useMemo(
    () => [
      { key: 'code', title: 'Code', width: 240 },
      { key: 'name', title: 'Name', width: 360 },
      { key: 'parent', title: 'Parent', width: 220 },
      { key: 'statement', title: 'Statement', width: 180 },
      { key: 'orderCode', title: 'Order Code', width: 140 },
      { key: 'required', title: 'Required', width: 110 },
      { key: 'calculated', title: 'Calculated', width: 120 },
      { key: 'formula', title: 'Formula', width: 320 }
    ],
    []
  );
  const taxonomyRecords = useMemo(
    () =>
      allNodes.map((node) => ({
        id: node.id,
        code: node.code,
        name: `${'-- '.repeat(node.depth)}${node.name}`,
        parent: node.parentId ? (byId.get(node.parentId)?.code ?? node.parentId) : '-',
        statement: node.statementType,
        orderCode: node.orderCode,
        required: node.isRequired ? 'yes' : 'no',
        calculated: node.isCalculated ? 'yes' : 'no',
        formula: node.formula ?? '-'
      })),
    [allNodes, byId]
  );
  const childrenByParentId = useMemo(() => {
    const out = new Map<string, number>();
    for (const row of items) {
      if (!row.parentId) continue;
      out.set(row.parentId, (out.get(row.parentId) ?? 0) + 1);
    }
    return out;
  }, [items]);
  const mappingParentOptions = useMemo(
    () =>
      allNodes.filter((node) => {
        const hasChildren = (childrenByParentId.get(node.id) ?? 0) > 0;
        const isRoot = !node.parentId;
        return hasChildren && !isRoot;
      }),
    [allNodes, childrenByParentId]
  );
  const mappingRemainderOptions = useMemo(() => {
    if (!mappingForm.parentLineItemId) return [];
    const parent = byId.get(mappingForm.parentLineItemId);
    if (!parent) return [];
    return allNodes.filter((node) => node.parentId === parent.id);
  }, [mappingForm.parentLineItemId, allNodes, byId]);

  const selectedMapping = useMemo(
    () => remainderMappings.find((mapping) => mapping.id === selectedMappingId) ?? null,
    [remainderMappings, selectedMappingId]
  );
  const mappingRows = useMemo(() => {
    const byParent = new Map(remainderMappings.map((mapping) => [mapping.parentLineItemId, mapping]));
    return mappingParentOptions.map((parent) => {
      const mapping = byParent.get(parent.id);
      if (!mapping) {
        return {
          id: `missing:${parent.id}`,
          parentLineItemId: parent.id,
          parentCode: parent.code,
          parentName: parent.name,
          remainderCode: '-',
          remainderName: '-',
          isValid: false,
          validationMessage: 'Missing mapping',
          mappingId: null as string | null
        };
      }
      return {
        id: mapping.id,
        parentLineItemId: mapping.parentLineItemId,
        parentCode: mapping.parentCode,
        parentName: mapping.parentName,
        remainderCode: mapping.remainderCode,
        remainderName: mapping.remainderName,
        isValid: mapping.isValid,
        validationMessage: mapping.validationMessage ?? null,
        mappingId: mapping.id
      };
    });
  }, [mappingParentOptions, remainderMappings]);

  const onSave = async () => {
    setError(null);
    setSuccess(null);
    try {
      await gql(
        UPSERT_LINE_ITEM_MUTATION,
        {
          input: {
            id: form.id || undefined,
            code: form.code,
            name: form.name,
            parentId: form.parentId || undefined,
            statementType: form.statementType,
            orderCode: form.orderCode,
            displayOrder: Number(form.displayOrder),
            isRequired: form.isRequired,
            isCalculated: form.isCalculated,
            formula: form.formula || undefined
          }
        },
        token
      );
      setSuccess(lineItemModalMode === 'edit' ? 'Updated line item' : 'Saved line item');
      setForm({ ...emptyForm, statementType });
      setLineItemModalMode('create');
      setIsLineItemModalOpen(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onDelete = async (id: string) => {
    setError(null);
    setSuccess(null);
    try {
      await gql(DELETE_LINE_ITEM_MUTATION, { id }, token);
      setSuccess('Deleted line item');
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onSaveMapping = async () => {
    setError(null);
    setSuccess(null);
    if (!mappingForm.parentLineItemId || !mappingForm.remainderLineItemId) {
      setError('Select both parent and remainder line item');
      return;
    }
    try {
      await gql(
        UPSERT_REMAINDER_MAPPING_MUTATION,
        {
          input: {
            parentLineItemId: mappingForm.parentLineItemId,
            remainderLineItemId: mappingForm.remainderLineItemId
          }
        },
        token
      );
      setSuccess('Saved remainder mapping');
      setSelectedMappingId(null);
      setMappingForm({ parentLineItemId: '', remainderLineItemId: '' });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onEditMapping = (id: string) => {
    const row = remainderMappings.find((mapping) => mapping.id === id);
    if (!row) return;
    setSelectedMappingId(row.id);
    setMappingForm({
      parentLineItemId: row.parentLineItemId,
      remainderLineItemId: row.remainderLineItemId
    });
  };

  const onDeleteMapping = async (id: string) => {
    setError(null);
    setSuccess(null);
    try {
      await gql(DELETE_REMAINDER_MAPPING_MUTATION, { id }, token);
      setSuccess('Deleted remainder mapping');
      if (selectedMappingId === id) {
        setSelectedMappingId(null);
        setMappingForm({ parentLineItemId: '', remainderLineItemId: '' });
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onRepairMapping = async (parentLineItemId: string) => {
    setError(null);
    setSuccess(null);
    try {
      await gql(
        REPAIR_REMAINDER_MAPPING_MUTATION,
        { input: { parentLineItemId } },
        token
      );
      setSuccess('Repaired mapping and ensured Others child');
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const openCreateModal = () => {
    setError(null);
    setSuccess(null);
    setLineItemModalMode('create');
    setForm({ ...emptyForm, statementType });
    setIsLineItemModalOpen(true);
  };

  const openEditModal = (item: FinancialLineItem) => {
    setError(null);
    setSuccess(null);
    setLineItemModalMode('edit');
    setForm(buildFormFromItem(item));
    setSelectedLineItemId(item.id);
    setIsLineItemModalOpen(true);
  };

  const resetModalForm = () => {
    if (lineItemModalMode === 'edit' && selectedLineItem) {
      setForm(buildFormFromItem(selectedLineItem));
      return;
    }
    setForm({ ...emptyForm, statementType });
  };

  return (
    <RequireAuth adminOnly>
      <DashboardPage
        title="Taxonomy Manager"
        subtitle="Maintain statement line-item hierarchy, formulas, and ordering."
      >
        <DashboardSection>
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <h3 className="page-title">Current Line Items</h3>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <label className="row">
                <span>Statement</span>
                <select value={statementType} onChange={(e) => setStatementType(e.target.value as typeof statementType)}>
                  <option value="balance_sheet">Balance Sheet</option>
                  <option value="pnl">P&amp;L</option>
                  <option value="cashflow">Cashflow</option>
                  <option value="derived">Derived</option>
                </select>
              </label>
              <button onClick={openCreateModal}>Add Line Item</button>
              <button className="secondary" onClick={() => selectedLineItem && openEditModal(selectedLineItem)} disabled={!selectedLineItem}>
                Edit Selected
              </button>
              <button onClick={() => selectedLineItem && void onDelete(selectedLineItem.id)} disabled={!selectedLineItem}>
                Delete Selected
              </button>
            </div>
          </div>
          <p className="muted page-subtitle">Click any row to select it. Child rows are shown with `--` prefixes.</p>
          <VisTableShell
            columns={taxonomyColumns}
            records={taxonomyRecords}
            height={620}
            onClickRow={(_, record) => {
              const id = String(record.id ?? '');
              setSelectedLineItemId(id || null);
            }}
          />
          {selectedLineItem && (
            <p className="muted page-subtitle">
              Selected: {selectedLineItem.code} - {selectedLineItem.name}
            </p>
          )}
        </DashboardSection>
        <DashboardSection>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3 className="page-title">Remainder Mapping (Parent -&gt; Others)</h3>
            <button
              className="secondary"
              onClick={() => {
                setSelectedMappingId(null);
                setMappingForm({ parentLineItemId: '', remainderLineItemId: '' });
              }}
            >
              New Mapping
            </button>
          </div>
          <p className="muted page-subtitle">Configure which child receives the auto-balance remainder when parent is manually entered.</p>
          <div className="grid grid-2">
            <label className="col">
              <span>2nd-level Parent</span>
              <select
                value={mappingForm.parentLineItemId}
                onChange={(e) =>
                  setMappingForm({
                    parentLineItemId: e.target.value,
                    remainderLineItemId: ''
                  })
                }
              >
                <option value="">Select parent</option>
                {mappingParentOptions.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.code} - {node.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="col">
              <span>Remainder Child</span>
              <select
                value={mappingForm.remainderLineItemId}
                onChange={(e) => setMappingForm((prev) => ({ ...prev, remainderLineItemId: e.target.value }))}
                disabled={!mappingForm.parentLineItemId}
              >
                <option value="">Select child</option>
                {mappingRemainderOptions.map((node) => (
                  <option key={node.id} value={node.id}>
                    -- {node.code} - {node.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <button
              className="secondary"
              onClick={() => setMappingForm({ parentLineItemId: '', remainderLineItemId: '' })}
            >
              Reset
            </button>
            <button onClick={onSaveMapping}>Save Mapping</button>
          </div>

          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="table-wide">
              <thead>
                <tr>
                  <th>Parent</th>
                  <th>Remainder Child</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mappingRows.map((mapping) => (
                  <tr key={mapping.id} className={selectedMapping?.id === mapping.mappingId ? 'row-selected' : ''}>
                    <td>{mapping.parentCode} - {mapping.parentName}</td>
                    <td>{mapping.remainderCode} {mapping.remainderName !== '-' ? `- ${mapping.remainderName}` : ''}</td>
                    <td>{mapping.isValid ? 'Valid' : (mapping.validationMessage ?? 'Invalid')}</td>
                    <td>
                      <div className="row">
                        {mapping.mappingId && (
                          <button className="secondary" onClick={() => onEditMapping(mapping.mappingId!)}>
                            Edit
                          </button>
                        )}
                        {!mapping.isValid && (
                          <button className="secondary" onClick={() => void onRepairMapping(mapping.parentLineItemId)}>
                            Repair
                          </button>
                        )}
                        {mapping.mappingId && (
                          <button onClick={() => void onDeleteMapping(mapping.mappingId!)}>Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!mappingRows.length && (
                  <tr>
                    <td colSpan={4} className="muted">No mappings configured for this statement.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DashboardSection>
        <Modal
          isOpen={isLineItemModalOpen}
          onClose={() => setIsLineItemModalOpen(false)}
          title={lineItemModalMode === 'edit' ? 'Edit Line Item' : 'Create Line Item'}
        >
          <div className="grid grid-2">
            <label className="col">
              <span>Statement</span>
              <select value={form.statementType} onChange={(e) => setForm((p) => ({ ...p, statementType: e.target.value as typeof form.statementType }))}>
                <option value="balance_sheet">Balance Sheet</option>
                <option value="pnl">P&amp;L</option>
                <option value="cashflow">Cashflow</option>
                <option value="derived">Derived</option>
              </select>
            </label>
            <label className="col"><span>Code</span><input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} /></label>
            <label className="col"><span>Name</span><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></label>
            <label className="col">
              <span>Parent</span>
              <select value={form.parentId} onChange={(e) => setForm((p) => ({ ...p, parentId: e.target.value }))}>
                <option value="">(root)</option>
                {allNodes
                  .filter((node) => !form.id || node.id !== form.id)
                  .map((node) => (
                    <option key={node.id} value={node.id}>
                      {`${'-- '.repeat(node.depth)}${node.code} - ${node.name}`}
                    </option>
                  ))}
              </select>
            </label>
            <label className="col"><span>Order Code</span><input value={form.orderCode} onChange={(e) => setForm((p) => ({ ...p, orderCode: e.target.value.replace(/[^0-9]/g, '') }))} /></label>
            <label className="col"><span>Display Order (legacy)</span><input type="number" value={form.displayOrder} onChange={(e) => setForm((p) => ({ ...p, displayOrder: Number(e.target.value) }))} /></label>
            <label className="row"><input type="checkbox" checked={form.isRequired} onChange={(e) => setForm((p) => ({ ...p, isRequired: e.target.checked }))} /> Required</label>
            <label className="row"><input type="checkbox" checked={form.isCalculated} onChange={(e) => setForm((p) => ({ ...p, isCalculated: e.target.checked }))} /> Calculated</label>
            <label className="col" style={{ gridColumn: '1 / -1' }}>
              <span>Formula</span>
              <textarea
                rows={3}
                value={form.formula}
                onChange={(e) => setForm((p) => ({ ...p, formula: e.target.value }))}
              />
            </label>
          </div>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
            <button className="secondary" onClick={resetModalForm}>Reset</button>
            <div className="row">
              <button className="secondary" onClick={() => setIsLineItemModalOpen(false)}>Cancel</button>
              <button onClick={() => void onSave()}>Save Row</button>
            </div>
          </div>
        </Modal>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </DashboardPage>
    </RequireAuth>
  );
}
