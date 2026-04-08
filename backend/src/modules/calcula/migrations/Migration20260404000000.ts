import { Migration } from "@mikro-orm/migrations"

export class Migration20260404000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "company_record" (
        "id" TEXT NOT NULL,
        "isin" TEXT NOT NULL DEFAULT '',
        "company_id" TEXT NOT NULL DEFAULT '',
        "company_name" TEXT NOT NULL DEFAULT '',
        "cin" TEXT NOT NULL DEFAULT '',
        "sector" TEXT NOT NULL DEFAULT '',
        "industry" TEXT NOT NULL DEFAULT '',
        "description" TEXT NOT NULL DEFAULT '',
        "listing_status" TEXT NOT NULL DEFAULT '',
        "overview_data" TEXT NOT NULL DEFAULT '',
        "ratios_data" TEXT NOT NULL DEFAULT '',
        "trends_data" TEXT NOT NULL DEFAULT '',
        "synced_at" TEXT NOT NULL DEFAULT '',
        "market_cap" TEXT NOT NULL DEFAULT '',
        "share_type" TEXT NOT NULL DEFAULT '',
        "lot_size" TEXT NOT NULL DEFAULT '',
        "face_value" TEXT NOT NULL DEFAULT '',
        "depository" TEXT NOT NULL DEFAULT '',
        "pan_number" TEXT NOT NULL DEFAULT '',
        "rta" TEXT NOT NULL DEFAULT '',
        "total_shares" TEXT NOT NULL DEFAULT '',
        "fifty_two_week_high" TEXT NOT NULL DEFAULT '',
        "fifty_two_week_low" TEXT NOT NULL DEFAULT '',
        "founded" TEXT NOT NULL DEFAULT '',
        "headquarters" TEXT NOT NULL DEFAULT '',
        "valuation" TEXT NOT NULL DEFAULT '',
        "pe_ratio" TEXT NOT NULL DEFAULT '',
        "pb_ratio" TEXT NOT NULL DEFAULT '',
        "roe_value" TEXT NOT NULL DEFAULT '',
        "debt_to_equity" TEXT NOT NULL DEFAULT '',
        "book_value" TEXT NOT NULL DEFAULT '',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "company_record_pkey" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_company_record_isin" ON "company_record" ("isin");
      CREATE INDEX IF NOT EXISTS "IDX_company_record_company_id" ON "company_record" ("company_id");
      CREATE INDEX IF NOT EXISTS "IDX_company_record_deleted_at" ON "company_record" ("deleted_at") WHERE "deleted_at" IS NOT NULL;
    `);
  }

  async down(): Promise<void> {
    this.addSql('DROP TABLE IF EXISTS "company_record" CASCADE;');
  }
}
