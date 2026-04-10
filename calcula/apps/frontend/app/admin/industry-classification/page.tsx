'use client';

import { useCallback, useEffect, useState } from 'react';
import { rest } from '@/lib/api';
import { useAuth } from '@/components/auth-context';
import { DashboardPage, DashboardSection } from '@/components/dashboard/template';
import { RequireAuth } from '@/components/require-auth';

type TrbcActivity = { id: string; name: string; code: string | null; sortOrder: number };
type TrbcIndustry = {
  id: string;
  name: string;
  code: string | null;
  sortOrder: number;
  activities: TrbcActivity[];
};
type TrbcSector = {
  id: string;
  name: string;
  code: string | null;
  sortOrder: number;
  industries: TrbcIndustry[];
};

export default function AdminIndustryClassificationPage() {
  const { token } = useAuth();
  const [tree, setTree] = useState<TrbcSector[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newSector, setNewSector] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await rest<TrbcSector[]>('/industry-classification/tree', {}, token);
      setTree(data);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  const addSector = () => {
    const name = newSector.trim();
    if (!name) return;
    void withBusy(async () => {
      await rest(
        '/industry-classification/sectors',
        { method: 'POST', body: JSON.stringify({ name, sortOrder: tree.length }) },
        token
      );
      setNewSector('');
    });
  };

  const renameSector = (id: string, name: string) =>
    withBusy(() =>
      rest(
        '/industry-classification/sectors',
        { method: 'POST', body: JSON.stringify({ id, name }) },
        token
      )
    );

  const deleteSector = (id: string) => {
    if (!confirm('Delete this sector and all its industries/activities?')) return;
    void withBusy(() =>
      rest(`/industry-classification/sectors/${id}`, { method: 'DELETE' }, token)
    );
  };

  const addIndustry = (sectorId: string, name: string, sortOrder: number) =>
    withBusy(() =>
      rest(
        '/industry-classification/industries',
        { method: 'POST', body: JSON.stringify({ sectorId, name, sortOrder }) },
        token
      )
    );

  const renameIndustry = (id: string, sectorId: string, name: string) =>
    withBusy(() =>
      rest(
        '/industry-classification/industries',
        { method: 'POST', body: JSON.stringify({ id, sectorId, name }) },
        token
      )
    );

  const deleteIndustry = (id: string) => {
    if (!confirm('Delete this industry and all its activities?')) return;
    void withBusy(() =>
      rest(`/industry-classification/industries/${id}`, { method: 'DELETE' }, token)
    );
  };

  const addActivity = (industryId: string, name: string, sortOrder: number) =>
    withBusy(() =>
      rest(
        '/industry-classification/activities',
        { method: 'POST', body: JSON.stringify({ industryId, name, sortOrder }) },
        token
      )
    );

  const renameActivity = (id: string, industryId: string, name: string) =>
    withBusy(() =>
      rest(
        '/industry-classification/activities',
        { method: 'POST', body: JSON.stringify({ id, industryId, name }) },
        token
      )
    );

  const deleteActivity = (id: string) => {
    if (!confirm('Delete this activity?')) return;
    void withBusy(() =>
      rest(`/industry-classification/activities/${id}`, { method: 'DELETE' }, token)
    );
  };

  return (
    <RequireAuth adminOnly>
      <DashboardPage
        title="Industry Classification"
        subtitle="Maintain the TRBC Sector → Industry → Activity taxonomy used by company metadata."
      >
        <DashboardSection>
          {(() => {
            const sectorCount = tree.length;
            const industryCount = tree.reduce((n, s) => n + s.industries.length, 0);
            const activityCount = tree.reduce(
              (n, s) => n + s.industries.reduce((m, i) => m + i.activities.length, 0),
              0
            );
            return (
              <div className="row" style={{ gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                <div className="muted">
                  <strong>{sectorCount}</strong> sectors
                </div>
                <div className="muted">
                  <strong>{industryCount}</strong> industries
                </div>
                <div className="muted">
                  <strong>{activityCount}</strong> activities
                </div>
              </div>
            );
          })()}
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <h3 className="page-title">Sectors</h3>
            <div className="row" style={{ gap: 8 }}>
              <input
                placeholder="New sector name"
                value={newSector}
                onChange={(e) => setNewSector(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addSector();
                }}
              />
              <button onClick={addSector} disabled={busy || !newSector.trim()}>
                Add Sector
              </button>
            </div>
          </div>
          {error && <p className="error">{error}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {tree.map((sector) => (
              <SectorRow
                key={sector.id}
                sector={sector}
                expanded={expanded}
                onToggle={toggle}
                busy={busy}
                onRenameSector={renameSector}
                onDeleteSector={deleteSector}
                onAddIndustry={addIndustry}
                onRenameIndustry={renameIndustry}
                onDeleteIndustry={deleteIndustry}
                onAddActivity={addActivity}
                onRenameActivity={renameActivity}
                onDeleteActivity={deleteActivity}
              />
            ))}
            {!tree.length && <p className="muted">No sectors yet. Add one above, or run the TRBC seed.</p>}
          </div>
        </DashboardSection>
      </DashboardPage>
    </RequireAuth>
  );
}

function SectorRow({
  sector,
  expanded,
  onToggle,
  busy,
  onRenameSector,
  onDeleteSector,
  onAddIndustry,
  onRenameIndustry,
  onDeleteIndustry,
  onAddActivity,
  onRenameActivity,
  onDeleteActivity
}: {
  sector: TrbcSector;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  busy: boolean;
  onRenameSector: (id: string, name: string) => Promise<void>;
  onDeleteSector: (id: string) => void;
  onAddIndustry: (sectorId: string, name: string, sortOrder: number) => Promise<void>;
  onRenameIndustry: (id: string, sectorId: string, name: string) => Promise<void>;
  onDeleteIndustry: (id: string) => void;
  onAddActivity: (industryId: string, name: string, sortOrder: number) => Promise<void>;
  onRenameActivity: (id: string, industryId: string, name: string) => Promise<void>;
  onDeleteActivity: (id: string) => void;
}) {
  const isOpen = expanded.has(sector.id);
  const [name, setName] = useState(sector.name);
  const [newIndustry, setNewIndustry] = useState('');

  useEffect(() => setName(sector.name), [sector.name]);

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div className="row" style={{ gap: 8, flex: 1, minWidth: 240 }}>
          <button className="secondary" onClick={() => onToggle(sector.id)} style={{ minWidth: 32 }}>
            {isOpen ? '▾' : '▸'}
          </button>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1 }} />
          <span className="muted">{sector.industries.length} industries</span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button
            className="secondary"
            disabled={busy || name === sector.name || !name.trim()}
            onClick={() => void onRenameSector(sector.id, name.trim())}
          >
            Save
          </button>
          <button onClick={() => onDeleteSector(sector.id)} disabled={busy}>
            Delete
          </button>
        </div>
      </div>
      {isOpen && (
        <div style={{ marginTop: 12, paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sector.industries.map((ind) => (
            <IndustryRow
              key={ind.id}
              sectorId={sector.id}
              industry={ind}
              expanded={expanded}
              onToggle={onToggle}
              busy={busy}
              onRenameIndustry={onRenameIndustry}
              onDeleteIndustry={onDeleteIndustry}
              onAddActivity={onAddActivity}
              onRenameActivity={onRenameActivity}
              onDeleteActivity={onDeleteActivity}
            />
          ))}
          <div className="row" style={{ gap: 8 }}>
            <input
              placeholder="New industry name"
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              className="secondary"
              disabled={busy || !newIndustry.trim()}
              onClick={() => {
                const n = newIndustry.trim();
                if (!n) return;
                void onAddIndustry(sector.id, n, sector.industries.length).then(() => setNewIndustry(''));
              }}
            >
              Add Industry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function IndustryRow({
  sectorId,
  industry,
  expanded,
  onToggle,
  busy,
  onRenameIndustry,
  onDeleteIndustry,
  onAddActivity,
  onRenameActivity,
  onDeleteActivity
}: {
  sectorId: string;
  industry: TrbcIndustry;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  busy: boolean;
  onRenameIndustry: (id: string, sectorId: string, name: string) => Promise<void>;
  onDeleteIndustry: (id: string) => void;
  onAddActivity: (industryId: string, name: string, sortOrder: number) => Promise<void>;
  onRenameActivity: (id: string, industryId: string, name: string) => Promise<void>;
  onDeleteActivity: (id: string) => void;
}) {
  const isOpen = expanded.has(industry.id);
  const [name, setName] = useState(industry.name);
  const [newActivity, setNewActivity] = useState('');

  useEffect(() => setName(industry.name), [industry.name]);

  return (
    <div style={{ border: '1px solid #f1f5f9', borderRadius: 6, padding: 10 }}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div className="row" style={{ gap: 8, flex: 1, minWidth: 220 }}>
          <button className="secondary" onClick={() => onToggle(industry.id)} style={{ minWidth: 32 }}>
            {isOpen ? '▾' : '▸'}
          </button>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1 }} />
          <span className="muted">{industry.activities.length} activities</span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button
            className="secondary"
            disabled={busy || name === industry.name || !name.trim()}
            onClick={() => void onRenameIndustry(industry.id, sectorId, name.trim())}
          >
            Save
          </button>
          <button onClick={() => onDeleteIndustry(industry.id)} disabled={busy}>
            Delete
          </button>
        </div>
      </div>
      {isOpen && (
        <div style={{ marginTop: 10, paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {industry.activities.map((act) => (
            <ActivityRow
              key={act.id}
              industryId={industry.id}
              activity={act}
              busy={busy}
              onRenameActivity={onRenameActivity}
              onDeleteActivity={onDeleteActivity}
            />
          ))}
          <div className="row" style={{ gap: 8 }}>
            <input
              placeholder="New activity name"
              value={newActivity}
              onChange={(e) => setNewActivity(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              className="secondary"
              disabled={busy || !newActivity.trim()}
              onClick={() => {
                const n = newActivity.trim();
                if (!n) return;
                void onAddActivity(industry.id, n, industry.activities.length).then(() =>
                  setNewActivity('')
                );
              }}
            >
              Add Activity
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityRow({
  industryId,
  activity,
  busy,
  onRenameActivity,
  onDeleteActivity
}: {
  industryId: string;
  activity: TrbcActivity;
  busy: boolean;
  onRenameActivity: (id: string, industryId: string, name: string) => Promise<void>;
  onDeleteActivity: (id: string) => void;
}) {
  const [name, setName] = useState(activity.name);
  useEffect(() => setName(activity.name), [activity.name]);
  return (
    <div className="row" style={{ gap: 8 }}>
      <input value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1 }} />
      <button
        className="secondary"
        disabled={busy || name === activity.name || !name.trim()}
        onClick={() => void onRenameActivity(activity.id, industryId, name.trim())}
      >
        Save
      </button>
      <button onClick={() => onDeleteActivity(activity.id)} disabled={busy}>
        Delete
      </button>
    </div>
  );
}
