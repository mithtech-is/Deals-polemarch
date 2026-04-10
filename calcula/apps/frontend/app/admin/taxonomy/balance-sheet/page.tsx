'use client';

import { TaxonomyManager } from '@/components/admin/taxonomy-manager';

export default function BalanceSheetTaxonomyPage() {
  return (
    <TaxonomyManager
      statementType="balance_sheet"
      title="Balance Sheet Taxonomy"
      subtitle="Maintain the Balance Sheet line-item hierarchy, formulas, and remainder mapping."
    />
  );
}
