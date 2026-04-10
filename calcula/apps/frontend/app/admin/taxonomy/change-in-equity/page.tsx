'use client';

import { TaxonomyManager } from '@/components/admin/taxonomy-manager';

export default function ChangeInEquityTaxonomyPage() {
  return (
    <TaxonomyManager
      statementType="change_in_equity"
      title="SOCIE Taxonomy"
      subtitle="Maintain the SOCIE (Statement of Changes in Equity) line-item hierarchy and formulas."
    />
  );
}
