-- Editorial CMS: NewsEvent + CompanyOverview + ProsCons, plus news &
-- editorial version columns on `companies`.

ALTER TABLE "companies"
    ADD COLUMN IF NOT EXISTS "news_version" INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "editorial_version" INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "news_events" (
    "id"          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    "company_id"  UUID          NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "category"    VARCHAR(1)    NOT NULL,
    "title"       TEXT          NOT NULL,
    "body"        TEXT          NOT NULL,
    "source_url"  TEXT,
    "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "news_events_company_id_occurred_at_idx"
    ON "news_events" ("company_id", "occurred_at" DESC);

CREATE TABLE IF NOT EXISTS "company_overview" (
    "id"                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    "company_id"        UUID          NOT NULL UNIQUE REFERENCES "companies"("id") ON DELETE CASCADE,
    "summary"           TEXT          NOT NULL,
    "business_model"    TEXT,
    "competitive_moat"  TEXT,
    "risks"             TEXT,
    "created_at"        TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "pros_cons" (
    "id"         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    "company_id" UUID          NOT NULL UNIQUE REFERENCES "companies"("id") ON DELETE CASCADE,
    "pros"       TEXT          NOT NULL,
    "cons"       TEXT          NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
