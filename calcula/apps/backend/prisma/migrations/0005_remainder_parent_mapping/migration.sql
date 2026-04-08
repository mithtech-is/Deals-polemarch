CREATE TABLE IF NOT EXISTS financial_remainder_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_line_item_id UUID NOT NULL UNIQUE REFERENCES financial_line_items(id) ON DELETE CASCADE,
  remainder_line_item_id UUID NOT NULL REFERENCES financial_line_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_remainder_mapping_not_same CHECK (parent_line_item_id <> remainder_line_item_id)
);

CREATE INDEX IF NOT EXISTS idx_remainder_mapping_child ON financial_remainder_mappings(remainder_line_item_id);

INSERT INTO financial_remainder_mappings (parent_line_item_id, remainder_line_item_id, created_at, updated_at)
SELECT p.id, c.id, now(), now()
FROM financial_line_items p
JOIN financial_line_items c ON c.code = 'other_income'
WHERE p.code = 'revenue_section'
ON CONFLICT (parent_line_item_id) DO UPDATE
SET remainder_line_item_id = EXCLUDED.remainder_line_item_id,
    updated_at = now();
