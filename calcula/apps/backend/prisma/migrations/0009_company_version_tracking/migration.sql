-- Version tracking columns for the Medusa snapshot pipeline.
-- Bumped inside the transactions that write financials / prices so
-- Medusa can tell what's stale with a single integer comparison.

ALTER TABLE "companies"
    ADD COLUMN IF NOT EXISTS "statements_version" INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "price_version" INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "content_updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "companies_content_updated_at_idx"
    ON "companies"("content_updated_at");
