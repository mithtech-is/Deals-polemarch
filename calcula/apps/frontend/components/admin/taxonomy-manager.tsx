'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import type { FinancialLineItem, FinancialRemainderMapping } from '@/types/domain';

type StatementType = 'balance_sheet' | 'pnl' | 'cashflow' | 'change_in_equity' | 'ratios_valuations';
type LineItemNode = Omit<FinancialLineItem, 'children'> & { children: LineItemNode[] };

function buildTree(items: FinancialLineItem[]): LineItemNode[] {
  const byParent = new Map<string | null, FinancialLineItem[]>();
  for (const item of items) {
    const key = item.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(item);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => {
      if (a.orderCode !== b.orderCode) return a.orderCode.localeCompare(b.orderCode);
      return a.code.localeCompare(b.code);
    });
  }
  const seen = new Set<string>();
  const walk = (parentId: string | null): LineItemNode[] => {
    const rows = byParent.get(parentId) ?? [];
    return rows
      .filter((r) => !seen.has(r.id))
      .map((r) => {
        seen.add(r.id);
        return { ...r, children: walk(r.id) };
      });
  };
  return walk(null);
}

const emptyForm = {
  id: '',
  code: '',
  name: '',
  parentId: '',
  statementType: 'balance_sheet' as StatementType,
  orderCode: '01',
  displayOrder: 10,
  isRequired: false,
  isCalculated: false,
  formula: ''
};

type FormState = typeof emptyForm;

export function TaxonomyManager({
  statementType,
  title,
  subtitle
}: {
  statementType: StatementType;
  title: string;
  subtitle?: string;
}) {
  const { token } = useAuth();
  const [items, setItems] = useState<FinancialLineItem[]>([]);
  const [remainderMappings, setRemainderMappings] = useState<FinancialRemainderMapping[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [form, setForm] = useState<FormState>({ ...emptyForm, statementType });

  const load = useCallback(async () => {
    setError(null);
    try {
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
    } catch (e) {
      setError((e as Error).message);
    }
  }, [statementType, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const tree = useMemo(() => buildTree(items), [items]);
  const byId = useMemo(() => new Map(items.map((r) => [r.id, r])), [items]);
  const flat = useMemo(() => {
    const out: Array<FinancialLineItem & { depth: number }> = [];
    const walk = (nodes: LineItemNode[], depth: number) => {
      for (const n of nodes) {
        out.push({ ...n, depth });
        walk(n.children, depth + 1);
      }
    };
    walk(tree, 0);
    return out;
  }, [tree]);

  const mappingByParentId = useMemo(() => {
    const m = new Map<string, FinancialRemainderMapping>();
    for (const row of remainderMappings) m.set(row.parentLineItemId, row);
    return m;
  }, [remainderMappings]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const withBusy = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const openCreateRoot = () => {
    setError(null);
    setSuccess(null);
    setModalMode('create');
    setForm({ ...emptyForm, statementType });
    setModalOpen(true);
  };

  const openEditExisting = (item: FinancialLineItem) => {
    setError(null);
    setSuccess(null);
    setModalMode('edit');
    setForm({
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
    setModalOpen(true);
  };

  const saveModal = async () => {
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
      setSuccess(modalMode === 'edit' ? 'Updated line item' : 'Saved line item');
      setModalOpen(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const renameInline = (item: FinancialLineItem, newName: string) =>
    withBusy(() =>
      gql(
        UPSERT_LINE_ITEM_MUTATION,
        {
          input: {
            id: item.id,
            code: item.code,
            name: newName,
            parentId: item.parentId ?? undefined,
            statementType: item.statementType,
            orderCode: item.orderCode,
            displayOrder: item.displayOrder,
            isRequired: item.isRequired,
            isCalculated: item.isCalculated,
            formula: item.formula ?? undefined
          }
        },
        token
      )
    );

  const deleteItem = (id: string) => {
    if (!confirm('Delete this line item and all its children?')) return;
    void withBusy(() => gql(DELETE_LINE_ITEM_MUTATION, { id }, token));
  };

  const addChild = async (parent: FinancialLineItem, name: string) => {
    const siblings = items.filter((r) => r.parentId === parent.id);
    const placeholder = `NEW_${Date.now()}`;
    try {
      await gql(
        UPSERT_LINE_ITEM_MUTATION,
        {
          input: {
            code: placeholder,
            name,
            parentId: parent.id,
            statementType,
            orderCode: '99',
            displayOrder: 900 + siblings.length,
            isRequired: false,
            isCalculated: false
          }
        },
        token
      );
      // Reload and locate the new row to open the modal.
      const res = await gql<{ financialLineItems: FinancialLineItem[] }>(
        LINE_ITEMS_QUERY,
        { statementType },
        token
      );
      setItems(res.financialLineItems ?? []);
      const created = (res.financialLineItems ?? []).find((r) => r.code === placeholder);
      setExpanded((prev) => new Set(prev).add(parent.id));
      if (created) openEditExisting(created);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const setRemainder = async (parent: FinancialLineItem, remainderChildId: string) => {
    if (!remainderChildId) {
      const existing = mappingByParentId.get(parent.id);
      if (existing) await withBusy(() => gql(DELETE_REMAINDER_MAPPING_MUTATION, { id: existing.id }, token));
      return;
    }
    await withBusy(() =>
      gql(
        UPSERT_REMAINDER_MAPPING_MUTATION,
        { input: { parentLineItemId: parent.id, remainderLineItemId: remainderChildId } },
        token
      )
    );
  };

  const repairRemainder = (parent: FinancialLineItem) =>
    withBusy(() =>
      gql(REPAIR_REMAINDER_MAPPING_MUTATION, { input: { parentLineItemId: parent.id } }, token)
    );

  const insertTemplate = (token: string) => {
    setForm((p) => ({
      ...p,
      formula: (p.formula ? `${p.formula} ` : '') + token,
      isCalculated: true
    }));
  };

  const formulaChildren = useMemo(() => {
    if (!form.id) return [] as FinancialLineItem[];
    return items.filter((r) => r.parentId === form.id);
  }, [form.id, items]);

  const sectorCount = tree.length;
  const totalCount = items.length;

  return (
    <RequireAuth adminOnly>
      <DashboardPage title={title} subtitle={subtitle}>
        <DashboardSection>
          <div className="row" style={{ gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
            <div className="muted"><strong>{sectorCount}</strong> roots</div>
            <div className="muted"><strong>{totalCount}</strong> total line items</div>
          </div>
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <h3 className="page-title">Line Items</h3>
            <div className="row" style={{ gap: 8 }}>
              <button
                className="secondary"
                onClick={() =>
                  setExpanded(
                    new Set(items.filter((r) => items.some((c) => c.parentId === r.id)).map((r) => r.id))
                  )
                }
              >
                Expand All
              </button>
              <button className="secondary" onClick={() => setExpanded(new Set())}>
                Collapse All
              </button>
              <button onClick={openCreateRoot}>Add Root Line Item</button>
            </div>
          </div>
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {tree.map((node) => (
              <LineItemRow
                key={node.id}
                node={node}
                expanded={expanded}
                onToggle={toggle}
                busy={busy}
                onRename={renameInline}
                onDelete={deleteItem}
                onAddChild={addChild}
                onEdit={openEditExisting}
                mappingByParentId={mappingByParentId}
                onSetRemainder={setRemainder}
                onRepairRemainder={repairRemainder}
              />
            ))}
            {!tree.length && <p className="muted">No line items yet. Add one above.</p>}
          </div>
        </DashboardSection>

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={modalMode === 'edit' ? 'Edit Line Item' : 'Create Line Item'}
        >
          <div className="grid grid-2">
            <label className="col"><span>Code</span><input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} /></label>
            <label className="col"><span>Name</span><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></label>
            <label className="col">
              <span>Parent</span>
              <select value={form.parentId} onChange={(e) => setForm((p) => ({ ...p, parentId: e.target.value }))}>
                <option value="">(root)</option>
                {flat
                  .filter((node) => !form.id || node.id !== form.id)
                  .map((node) => (
                    <option key={node.id} value={node.id}>
                      {`${'-- '.repeat(node.depth)}${node.code} - ${node.name}`}
                    </option>
                  ))}
              </select>
            </label>
            <label className="col"><span>Order Code</span><input value={form.orderCode} onChange={(e) => setForm((p) => ({ ...p, orderCode: e.target.value.replace(/[^0-9]/g, '') }))} /></label>
            <label className="col"><span>Display Order</span><input type="number" value={form.displayOrder} onChange={(e) => setForm((p) => ({ ...p, displayOrder: Number(e.target.value) }))} /></label>
            <label className="row"><input type="checkbox" checked={form.isRequired} onChange={(e) => setForm((p) => ({ ...p, isRequired: e.target.checked }))} /> Required</label>
            <label className="row"><input type="checkbox" checked={form.isCalculated} onChange={(e) => setForm((p) => ({ ...p, isCalculated: e.target.checked }))} /> Calculated</label>
            <div className="col" style={{ gridColumn: '1 / -1' }}>
              <span>Formula templates</span>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                <button type="button" className="secondary" onClick={() => insertTemplate('@SUM_CHILDREN')}>
                  Σ Sum of children
                </button>
                <button type="button" className="secondary" onClick={() => insertTemplate('@SUM_DESCENDANTS')}>
                  Σ Sum of descendants
                </button>
                {formulaChildren.length > 0 && (
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const code = e.target.value;
                      if (!code) return;
                      insertTemplate(`@SUM_CHILDREN_EXCEPT(${code})`);
                      e.target.value = '';
                    }}
                  >
                    <option value="">Σ Children except…</option>
                    {formulaChildren.map((c) => (
                      <option key={c.id} value={c.code}>{c.code}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <label className="col" style={{ gridColumn: '1 / -1' }}>
              <span>Formula</span>
              <textarea
                rows={3}
                value={form.formula}
                onChange={(e) => setForm((p) => ({ ...p, formula: e.target.value }))}
              />
              <small className="muted">@SUM_CHILDREN stays live — adding a new child row automatically updates this parent, no re-edit needed.</small>
            </label>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button className="secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button onClick={() => void saveModal()}>Save</button>
          </div>
        </Modal>
      </DashboardPage>
    </RequireAuth>
  );
}

function LineItemRow({
  node,
  depth = 0,
  expanded,
  onToggle,
  busy,
  onRename,
  onDelete,
  onAddChild,
  onEdit,
  mappingByParentId,
  onSetRemainder,
  onRepairRemainder
}: {
  node: LineItemNode;
  depth?: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  busy: boolean;
  onRename: (item: FinancialLineItem, name: string) => Promise<void>;
  onDelete: (id: string) => void;
  onAddChild: (parent: FinancialLineItem, name: string) => Promise<void>;
  onEdit: (item: FinancialLineItem) => void;
  mappingByParentId: Map<string, FinancialRemainderMapping>;
  onSetRemainder: (parent: FinancialLineItem, childId: string) => Promise<void>;
  onRepairRemainder: (parent: FinancialLineItem) => Promise<void>;
}) {
  const isOpen = expanded.has(node.id);
  const [name, setName] = useState(node.name);
  const [newChild, setNewChild] = useState('');

  useEffect(() => setName(node.name), [node.name]);

  const hasChildren = node.children.length > 0;
  const isParentOfChildren = hasChildren && !!node.parentId;
  const mapping = mappingByParentId.get(node.id);

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 12,
        marginLeft: depth ? 0 : 0
      }}
    >
      <div className="row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div className="row" style={{ gap: 8, flex: 1, minWidth: 240 }}>
          <button
            className="secondary"
            onClick={() => onToggle(node.id)}
            style={{ minWidth: 32, visibility: hasChildren ? 'visible' : 'hidden' }}
          >
            {isOpen ? '▾' : '▸'}
          </button>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1 }} />
          <code className="muted" style={{ fontFamily: 'monospace', fontSize: 12 }}>{node.code}</code>
          {node.isCalculated && <span className="muted" style={{ fontSize: 11 }}>ƒ</span>}
          {hasChildren && <span className="muted">{node.children.length}</span>}
        </div>
        {isParentOfChildren && (
          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: 12 }}>Remainder →</span>
            <select
              value={mapping?.remainderLineItemId ?? ''}
              onChange={(e) => void onSetRemainder(node, e.target.value)}
              disabled={busy}
            >
              <option value="">—</option>
              {node.children.map((c) => (
                <option key={c.id} value={c.id}>{c.code}</option>
              ))}
            </select>
            {mapping ? (
              mapping.isValid ? (
                <span style={{ color: '#16a34a', fontSize: 12 }}>Valid</span>
              ) : (
                <>
                  <span style={{ color: '#dc2626', fontSize: 12 }}>{mapping.validationMessage ?? 'Invalid'}</span>
                  <button className="secondary" onClick={() => void onRepairRemainder(node)} disabled={busy}>
                    Repair
                  </button>
                </>
              )
            ) : (
              <span className="muted" style={{ fontSize: 12 }}>Missing</span>
            )}
          </div>
        )}
        <div className="row" style={{ gap: 8 }}>
          <button
            className="secondary"
            disabled={busy || name === node.name || !name.trim()}
            onClick={() => void onRename(node, name.trim())}
          >
            Save
          </button>
          <button className="secondary" onClick={() => onEdit(node)} disabled={busy}>
            Edit…
          </button>
          <button onClick={() => onDelete(node.id)} disabled={busy}>
            Delete
          </button>
        </div>
      </div>
      {isOpen && (
        <div style={{ marginTop: 12, paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {node.children.map((child) => (
            <LineItemRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              busy={busy}
              onRename={onRename}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onEdit={onEdit}
              mappingByParentId={mappingByParentId}
              onSetRemainder={onSetRemainder}
              onRepairRemainder={onRepairRemainder}
            />
          ))}
          <div className="row" style={{ gap: 8 }}>
            <input
              placeholder="New child line item name"
              value={newChild}
              onChange={(e) => setNewChild(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              className="secondary"
              disabled={busy || !newChild.trim()}
              onClick={() => {
                const n = newChild.trim();
                if (!n) return;
                void onAddChild(node, n).then(() => setNewChild(''));
              }}
            >
              Add Child
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
