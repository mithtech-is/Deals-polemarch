'use client';

import { TaxonomyManager } from '@/components/admin/taxonomy-manager';

export default function PnlTaxonomyPage() {
  return (
    <TaxonomyManager
      statementType="pnl"
      title="P&L Taxonomy"
      subtitle="Maintain the Profit & Loss line-item hierarchy, formulas, and remainder mapping."
    />
  );
}
