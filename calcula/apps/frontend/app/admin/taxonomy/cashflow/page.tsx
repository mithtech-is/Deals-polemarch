'use client';

import { TaxonomyManager } from '@/components/admin/taxonomy-manager';

export default function CashflowTaxonomyPage() {
  return (
    <TaxonomyManager
      statementType="cashflow"
      title="Cashflow Taxonomy"
      subtitle="Maintain the Cashflow line-item hierarchy, formulas, and remainder mapping."
    />
  );
}
