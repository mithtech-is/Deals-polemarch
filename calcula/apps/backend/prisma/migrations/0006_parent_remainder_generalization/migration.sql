-- 1) P&L hierarchy correction: move expense subsections under expense_section
UPDATE financial_line_items child
SET parent_id = expense.id,
    updated_at = now()
FROM financial_line_items expense
WHERE expense.code = 'expense_section'
  AND child.code IN ('operating_expenses_section', 'administrative_expenses_section', 'other_expenses_section');

-- 2) Normalize order-code prefixes for moved P&L sections
-- operating_expenses_section: 0304* -> 030301*
UPDATE financial_line_items
SET order_code = '030301' || substr(order_code, 5),
    updated_at = now()
WHERE statement_type = 'pnl'::statement_type
  AND order_code LIKE '0304%';

-- administrative_expenses_section: 0305* -> 030302*
UPDATE financial_line_items
SET order_code = '030302' || substr(order_code, 5),
    updated_at = now()
WHERE statement_type = 'pnl'::statement_type
  AND order_code LIKE '0305%';

-- other_expenses_section: 0307* -> 030303*
UPDATE financial_line_items
SET order_code = '030303' || substr(order_code, 5),
    updated_at = now()
WHERE statement_type = 'pnl'::statement_type
  AND order_code LIKE '0307%';

-- 3) Ensure mapping for all non-leaf non-root parents and auto-create Others child when missing
DO $$
DECLARE
  parent_row RECORD;
  child_row RECORD;
  created_child_id UUID;
  base_code TEXT;
  candidate_code TEXT;
  suffix_n INT;
  max_display INT;
  max_order BIGINT;
  parent_statement statement_type;
BEGIN
  FOR parent_row IN
    SELECT p.id, p.code, p.name, p.order_code, p.statement_type
    FROM financial_line_items p
    WHERE p.parent_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM financial_line_items c WHERE c.parent_id = p.id)
  LOOP
    IF EXISTS (
      SELECT 1 FROM financial_remainder_mappings m
      WHERE m.parent_line_item_id = parent_row.id
    ) THEN
      CONTINUE;
    END IF;

    SELECT c.id, c.statement_type
    INTO child_row
    FROM financial_line_items c
    WHERE c.parent_id = parent_row.id
      AND (
        c.code ~* '(^|_)others?$'
        OR c.name ~* '^other\\s+'
      )
    ORDER BY c.order_code ASC, c.name ASC
    LIMIT 1;

    IF child_row.id IS NULL THEN
      base_code := parent_row.code || '_others';
      candidate_code := base_code;
      suffix_n := 2;

      WHILE EXISTS (SELECT 1 FROM financial_line_items WHERE code = candidate_code) LOOP
        candidate_code := base_code || '_' || suffix_n::text;
        suffix_n := suffix_n + 1;
      END LOOP;

      SELECT COALESCE(MAX(display_order), 0), COALESCE(MAX(NULLIF(regexp_replace(order_code, '[^0-9]', '', 'g'), '')::bigint), 0)
      INTO max_display, max_order
      FROM financial_line_items
      WHERE parent_id = parent_row.id;

      parent_statement := parent_row.statement_type;

      INSERT INTO financial_line_items (
        id, code, name, parent_id, statement_type, order_code, display_order,
        is_required, is_calculated, formula, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(),
        candidate_code,
        'Other ' || parent_row.name,
        parent_row.id,
        parent_statement,
        (max_order + 1)::text,
        max_display + 1,
        FALSE,
        FALSE,
        NULL,
        now(),
        now()
      )
      RETURNING id, statement_type INTO child_row;
    END IF;

    INSERT INTO financial_remainder_mappings (id, parent_line_item_id, remainder_line_item_id, created_at, updated_at)
    VALUES (gen_random_uuid(), parent_row.id, child_row.id, now(), now())
    ON CONFLICT (parent_line_item_id) DO UPDATE
    SET remainder_line_item_id = EXCLUDED.remainder_line_item_id,
        updated_at = now();
  END LOOP;
END $$;

-- 4) Required policy: all parent nodes required, leaf nodes optional
WITH parent_nodes AS (
  SELECT DISTINCT parent_id AS id
  FROM financial_line_items
  WHERE parent_id IS NOT NULL
)
UPDATE financial_line_items li
SET is_required = (li.id IN (SELECT id FROM parent_nodes)),
    updated_at = now();
