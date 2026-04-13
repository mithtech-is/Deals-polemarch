-- CompanyFaq: author-curated FAQ stored as JSON array, folded into
-- the editorial snapshot alongside CompanyOverview and ProsCons.
-- One row per company.

CREATE TABLE IF NOT EXISTS "company_faqs" (
    "id"         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    "company_id" UUID           NOT NULL UNIQUE REFERENCES "companies"("id") ON DELETE CASCADE,
    "items"      JSONB          NOT NULL DEFAULT '[]'::jsonb,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
