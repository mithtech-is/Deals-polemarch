import { Migration } from "@mikro-orm/migrations"

/**
 * Adds the Phase 6 "profile" snapshot columns (company details + valuation
 * models) to company_record.
 */
export class Migration20260409000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "company_record"
        ADD COLUMN IF NOT EXISTS "profile_snapshot" TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS "profile_version"  TEXT NOT NULL DEFAULT '0';
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "company_record"
        DROP COLUMN IF EXISTS "profile_snapshot",
        DROP COLUMN IF EXISTS "profile_version";
    `)
  }
}
