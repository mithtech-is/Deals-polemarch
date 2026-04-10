-- Scale enum
CREATE TYPE "scale_unit" AS ENUM ('units', 'thousands', 'lakhs', 'crores', 'millions', 'billions');

-- Company defaults
ALTER TABLE "companies"
  ADD COLUMN "default_currency" CHAR(3) NOT NULL DEFAULT 'INR',
  ADD COLUMN "default_scale" "scale_unit" NOT NULL DEFAULT 'crores';

-- Period overrides
ALTER TABLE "financial_periods"
  ADD COLUMN "currency" CHAR(3),
  ADD COLUMN "scale" "scale_unit";

-- Per (period, statement_type) override
CREATE TABLE "period_statement_value_in" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "period_id" UUID NOT NULL,
  "statement_type" "statement_type" NOT NULL,
  "currency" CHAR(3),
  "scale" "scale_unit",
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "period_statement_value_in_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "period_statement_value_in_period_id_fkey"
    FOREIGN KEY ("period_id") REFERENCES "financial_periods"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "period_statement_value_in_period_id_statement_type_key"
  ON "period_statement_value_in"("period_id", "statement_type");

-- Currency rates
CREATE TABLE "currency_rates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "from_ccy" CHAR(3) NOT NULL,
  "to_ccy" CHAR(3) NOT NULL,
  "rate" DECIMAL(20, 10) NOT NULL,
  "as_of" DATE NOT NULL,
  "source" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "currency_rates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "currency_rates_from_ccy_to_ccy_as_of_key"
  ON "currency_rates"("from_ccy", "to_ccy", "as_of");
CREATE INDEX "currency_rates_from_ccy_to_ccy_as_of_idx"
  ON "currency_rates"("from_ccy", "to_ccy", "as_of" DESC);

-- Seed identity rate so INR lookups never miss
INSERT INTO "currency_rates" ("from_ccy", "to_ccy", "rate", "as_of", "source", "updated_at")
VALUES ('INR', 'INR', 1, '1970-01-01', 'seed', CURRENT_TIMESTAMP);

-- Bump statements_version so Medusa re-snapshots with the new display hints
UPDATE "companies" SET "statements_version" = "statements_version" + 1;
