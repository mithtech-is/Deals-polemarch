CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform_role') THEN
    CREATE TYPE platform_role AS ENUM ('ADMIN', 'COMPANY_UPLOAD_AGENT', 'ANALYST');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statement_type') THEN
    CREATE TYPE statement_type AS ENUM ('balance_sheet', 'pnl', 'cashflow', 'derived');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'metric_value_source') THEN
    CREATE TYPE metric_value_source AS ENUM ('xbrl', 'manual', 'derived');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS platform_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role platform_role NOT NULL DEFAULT 'ANALYST',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  isin TEXT,
  cin TEXT,
  sector TEXT,
  industry TEXT,
  listing_status TEXT NOT NULL DEFAULT 'unlisted',
  country TEXT NOT NULL DEFAULT 'IN',
  description TEXT,
  uploaded_by_user_id UUID REFERENCES platform_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

CREATE TABLE IF NOT EXISTS financial_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  fiscal_year INT NOT NULL,
  fiscal_quarter INT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  is_audited BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_period_quarter CHECK (fiscal_quarter IS NULL OR fiscal_quarter BETWEEN 1 AND 4),
  CONSTRAINT uq_company_period UNIQUE (company_id, fiscal_year, fiscal_quarter)
);

CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  statement_type statement_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  parent_id UUID NULL REFERENCES financial_line_items(id) ON DELETE SET NULL,
  statement_type statement_type NOT NULL,
  order_code TEXT NOT NULL DEFAULT '01',
  display_order INT NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  is_calculated BOOLEAN NOT NULL DEFAULT FALSE,
  formula TEXT NULL,
  metric_id UUID NULL REFERENCES metrics(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_line_items_statement_order ON financial_line_items(statement_type, order_code);
CREATE INDEX IF NOT EXISTS idx_line_items_parent_order ON financial_line_items(parent_id, order_code);

CREATE TABLE IF NOT EXISTS financial_metrics (
  id BIGSERIAL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES financial_periods(id) ON DELETE CASCADE,
  line_item_id UUID NOT NULL REFERENCES financial_line_items(id) ON DELETE CASCADE,
  value NUMERIC(28,8) NOT NULL,
  currency CHAR(3),
  value_source metric_value_source NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, id),
  CONSTRAINT uq_company_period_line UNIQUE (company_id, period_id, line_item_id)
) PARTITION BY HASH (company_id);

DO $$
DECLARE i INT;
BEGIN
  FOR i IN 0..31 LOOP
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS financial_metrics_p%s PARTITION OF financial_metrics FOR VALUES WITH (MODULUS 32, REMAINDER %s)',
      lpad(i::text, 2, '0'),
      i::text
    );
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_financial_metrics_company_period ON financial_metrics(company_id, period_id);
CREATE INDEX IF NOT EXISTS idx_financial_metrics_line_item_period ON financial_metrics(line_item_id, period_id);
