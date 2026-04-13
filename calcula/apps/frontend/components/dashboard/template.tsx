'use client';

type DashboardPageProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function DashboardPage({ title, subtitle, actions, children }: DashboardPageProps) {
  return (
    <div className="col" style={{ gap: 20 }}>
      <section className="dashboard-header-inline" style={{ marginBottom: 4 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="col" style={{ gap: 4 }}>
            <h1 className="page-title" style={{ margin: 0 }}>{title}</h1>
            {subtitle && <p className="muted page-subtitle" style={{ margin: 0 }}>{subtitle}</p>}
          </div>
          {actions && <div className="row" style={{ flexWrap: 'wrap' }}>{actions}</div>}
        </div>
      </section>
      {children}
    </div>
  );
}

type DashboardSectionProps = {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function DashboardSection({ title, actions, children }: DashboardSectionProps) {
  return (
    <section className="card col" style={{ gap: 16 }}>
      {(title || actions) && (
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12 }}>
          {title ? <h3 className="page-title">{title}</h3> : <span />}
          {actions}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        {children}
      </div>
    </section>
  );
}

export function DashboardKpiGrid({ children }: { children: React.ReactNode }) {
  return <section className="grid grid-3">{children}</section>;
}
