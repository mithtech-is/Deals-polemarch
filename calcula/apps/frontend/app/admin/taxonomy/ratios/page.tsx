'use client';

import { TaxonomyManager } from '@/components/admin/taxonomy-manager';

export default function RatiosValuationsTaxonomyPage() {
  return (
    <TaxonomyManager
      statementType="ratios_valuations"
      title="Ratios & Valuations Taxonomy"
      subtitle="Maintain derived ratios, per-share metrics, and valuation models."
    />
  );
}
