-- TRBC (The Refinitiv Business Classification) taxonomy
--   trbc_sectors    → TRBC Economic Sector  (top level)
--   trbc_industries → TRBC Business Sector  (mid level)
--   trbc_activities → TRBC Industry Group   (leaf level)
-- Each level FK-references its parent; cascade on delete.

CREATE TABLE "trbc_sectors" (
    "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name"        TEXT NOT NULL,
    "code"        TEXT,
    "sort_order"  INTEGER NOT NULL DEFAULT 0,
    "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "trbc_sectors_name_key" ON "trbc_sectors" ("name");
CREATE UNIQUE INDEX "trbc_sectors_code_key" ON "trbc_sectors" ("code");

CREATE TABLE "trbc_industries" (
    "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "sector_id"   UUID NOT NULL REFERENCES "trbc_sectors" ("id") ON DELETE CASCADE,
    "name"        TEXT NOT NULL,
    "code"        TEXT,
    "sort_order"  INTEGER NOT NULL DEFAULT 0,
    "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "trbc_industries_code_key" ON "trbc_industries" ("code");
CREATE UNIQUE INDEX "trbc_industries_sector_id_name_key" ON "trbc_industries" ("sector_id", "name");
CREATE INDEX "trbc_industries_sector_id_idx" ON "trbc_industries" ("sector_id");

CREATE TABLE "trbc_activities" (
    "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "industry_id"  UUID NOT NULL REFERENCES "trbc_industries" ("id") ON DELETE CASCADE,
    "name"         TEXT NOT NULL,
    "code"         TEXT,
    "sort_order"   INTEGER NOT NULL DEFAULT 0,
    "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "trbc_activities_code_key" ON "trbc_activities" ("code");
CREATE UNIQUE INDEX "trbc_activities_industry_id_name_key" ON "trbc_activities" ("industry_id", "name");
CREATE INDEX "trbc_activities_industry_id_idx" ON "trbc_activities" ("industry_id");

-- Add nullable taxonomy FK columns + free-text activity column to companies.
ALTER TABLE "companies"
  ADD COLUMN "activity"    TEXT,
  ADD COLUMN "sector_id"   UUID REFERENCES "trbc_sectors"    ("id") ON DELETE SET NULL,
  ADD COLUMN "industry_id" UUID REFERENCES "trbc_industries" ("id") ON DELETE SET NULL,
  ADD COLUMN "activity_id" UUID REFERENCES "trbc_activities" ("id") ON DELETE SET NULL;

CREATE INDEX "companies_sector_id_idx"   ON "companies" ("sector_id");
CREATE INDEX "companies_industry_id_idx" ON "companies" ("industry_id");
CREATE INDEX "companies_activity_id_idx" ON "companies" ("activity_id");
