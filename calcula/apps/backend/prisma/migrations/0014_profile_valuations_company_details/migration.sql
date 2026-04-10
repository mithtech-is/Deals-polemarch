-- Add profile_version column to companies
ALTER TABLE "companies" ADD COLUMN "profile_version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: company_details
CREATE TABLE "company_details" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "logo_url" TEXT,
    "website" TEXT,
    "linkedin_url" TEXT,
    "twitter_url" TEXT,
    "crunchbase_url" TEXT,
    "founded" TEXT,
    "incorporation_country" TEXT,
    "legal_entity_type" TEXT,
    "registered_office" TEXT,
    "headquarters" TEXT,
    "auditor" TEXT,
    "pan_number" TEXT,
    "rta" TEXT,
    "depository" TEXT,
    "employee_count" INTEGER,
    "subsidiaries_count" INTEGER,
    "fiscal_year_end" TEXT,
    "share_type" TEXT,
    "face_value" DECIMAL(18,4),
    "total_shares" TEXT,
    "lot_size" INTEGER,
    "availability_percent" DECIMAL(6,2),
    "fifty_two_week_high" DECIMAL(18,4),
    "fifty_two_week_low" DECIMAL(18,4),
    "last_round_type" TEXT,
    "last_round_date" TEXT,
    "last_round_raised" TEXT,
    "last_round_lead" TEXT,
    "last_round_valuation" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "company_details_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "company_details_company_id_key" ON "company_details"("company_id");

ALTER TABLE "company_details" ADD CONSTRAINT "company_details_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: company_valuations
CREATE TABLE "company_valuations" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "base_currency" TEXT NOT NULL DEFAULT 'INR',
    "as_of_date" TIMESTAMP(3),
    "summary" TEXT,
    "models" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "company_valuations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "company_valuations_company_id_key" ON "company_valuations"("company_id");

ALTER TABLE "company_valuations" ADD CONSTRAINT "company_valuations_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
