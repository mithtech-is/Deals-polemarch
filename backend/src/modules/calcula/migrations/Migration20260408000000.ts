import { Migration } from "@mikro-orm/migrations"

/**
 * Adds snapshot cache columns to company_record. Medusa stores the full
 * columnar statements snapshot and prices snapshot fetched from Calcula,
 * along with the version integers and timestamps used to detect drift.
 */
export class Migration20260408000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "company_record"
        ADD COLUMN IF NOT EXISTS "statements_snapshot"  TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS "statements_version"   TEXT NOT NULL DEFAULT '0',
        ADD COLUMN IF NOT EXISTS "price_snapshot"       TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS "price_version"        TEXT NOT NULL DEFAULT '0',
        ADD COLUMN IF NOT EXISTS "content_updated_at"   TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS "last_accessed_at"     TEXT NOT NULL DEFAULT '';
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "company_record"
        DROP COLUMN IF EXISTS "statements_snapshot",
        DROP COLUMN IF EXISTS "statements_version",
        DROP COLUMN IF EXISTS "price_snapshot",
        DROP COLUMN IF EXISTS "price_version",
        DROP COLUMN IF EXISTS "content_updated_at",
        DROP COLUMN IF EXISTS "last_accessed_at";
    `)
  }
}
