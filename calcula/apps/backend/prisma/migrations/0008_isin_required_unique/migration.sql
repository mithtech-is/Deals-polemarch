-- Back-fill missing ISINs with the company UUID so NOT NULL + UNIQUE can apply.
-- These placeholders must be replaced by the admin with real ISINs afterwards.
UPDATE companies
SET isin = id::text
WHERE isin IS NULL OR isin = '';

-- Enforce NOT NULL + UNIQUE on isin
ALTER TABLE companies ALTER COLUMN isin SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS companies_isin_key ON companies(isin);

-- New table: company_price_history
-- Calcula is the single source of truth for price data. Medusa will proxy reads/writes here.
CREATE TABLE "company_price_history" (
    "id" BIGSERIAL NOT NULL,
    "company_id" UUID NOT NULL,
    "datetime" TIMESTAMPTZ(6) NOT NULL,
    "price" DECIMAL(18, 4) NOT NULL,
    "note" TEXT,
    "link" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_price_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "company_price_history_company_id_datetime_key"
    ON "company_price_history"("company_id", "datetime");

CREATE INDEX "company_price_history_company_id_datetime_idx"
    ON "company_price_history"("company_id", "datetime" DESC);

ALTER TABLE "company_price_history"
    ADD CONSTRAINT "company_price_history_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
