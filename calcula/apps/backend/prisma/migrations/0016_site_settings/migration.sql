-- Site-wide settings key-value store (default currency, default display
-- scale, etc.). Managed from the Calcula admin Currency page.
CREATE TABLE "site_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);
