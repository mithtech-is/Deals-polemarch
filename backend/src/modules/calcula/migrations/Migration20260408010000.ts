import { Migration } from "@mikro-orm/migrations"

/**
 * Adds the Phase 3 + Phase 4/5 snapshot columns to company_record:
 *   - news_snapshot + news_version: NewsEvent blob
 *   - editorial_snapshot + editorial_version: bundled CompanyOverview + ProsCons
 *
 * Mikro-ORM default '' matches the existing statements_snapshot / price_snapshot
 * columns, so the new columns are readable even on rows that pre-date them.
 */
export class Migration20260408010000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "company_record"
        ADD COLUMN IF NOT EXISTS "news_snapshot"      TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS "news_version"       TEXT NOT NULL DEFAULT '0',
        ADD COLUMN IF NOT EXISTS "editorial_snapshot" TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS "editorial_version"  TEXT NOT NULL DEFAULT '0';
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "company_record"
        DROP COLUMN IF EXISTS "news_snapshot",
        DROP COLUMN IF EXISTS "news_version",
        DROP COLUMN IF EXISTS "editorial_snapshot",
        DROP COLUMN IF EXISTS "editorial_version";
    `)
  }
}
