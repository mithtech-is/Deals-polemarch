'use client';

type Tab = {
  key: string;
  label: string;
};

type Props = {
  tabs: Tab[];
  active: string;
  onChange: (next: string) => void;
};

export function VisDashboardTabs({ tabs, active, onChange }: Props) {
  return (
    <div className="row" style={{ flexWrap: 'wrap' }}>
      {tabs.map((tab) => (
        <button key={tab.key} className={active === tab.key ? '' : 'secondary'} onClick={() => onChange(tab.key)}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
