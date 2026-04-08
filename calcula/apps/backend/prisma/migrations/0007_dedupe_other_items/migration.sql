-- Remove duplicate auto-created "*_others" line items when an equivalent sibling already exists
-- Keeps the canonical sibling and removes only auto-generated duplicates.

WITH candidate_pairs AS (
  SELECT
    d.id AS duplicate_id,
    k.id AS keep_id,
    d.parent_id
  FROM financial_line_items d
  JOIN financial_line_items p ON p.id = d.parent_id
  JOIN financial_line_items k
    ON k.parent_id = d.parent_id
   AND k.id <> d.id
   AND lower(trim(k.name)) = lower(trim(d.name))
  WHERE d.parent_id IS NOT NULL
    AND d.code ~ ('^' || regexp_replace(p.code, '([\\.\\-])', '\\\\1', 'g') || '_others(_[0-9]+)?$')
), resolved_pairs AS (
  SELECT DISTINCT ON (duplicate_id)
    duplicate_id,
    keep_id,
    parent_id
  FROM candidate_pairs
  ORDER BY duplicate_id, keep_id
)
-- 1) Remap remainder mappings to canonical keep item
UPDATE financial_remainder_mappings m
SET remainder_line_item_id = rp.keep_id,
    updated_at = now()
FROM resolved_pairs rp
WHERE m.remainder_line_item_id = rp.duplicate_id;

WITH candidate_pairs AS (
  SELECT
    d.id AS duplicate_id,
    k.id AS keep_id,
    d.parent_id
  FROM financial_line_items d
  JOIN financial_line_items p ON p.id = d.parent_id
  JOIN financial_line_items k
    ON k.parent_id = d.parent_id
   AND k.id <> d.id
   AND lower(trim(k.name)) = lower(trim(d.name))
  WHERE d.parent_id IS NOT NULL
    AND d.code ~ ('^' || regexp_replace(p.code, '([\\.\\-])', '\\\\1', 'g') || '_others(_[0-9]+)?$')
), resolved_pairs AS (
  SELECT DISTINCT ON (duplicate_id)
    duplicate_id,
    keep_id,
    parent_id
  FROM candidate_pairs
  ORDER BY duplicate_id, keep_id
)
-- 2) Move metrics only where canonical metric row does not already exist
INSERT INTO financial_metrics (
  company_id,
  period_id,
  line_item_id,
  value,
  currency,
  value_source,
  created_at,
  updated_at
)
SELECT
  dm.company_id,
  dm.period_id,
  rp.keep_id,
  dm.value,
  dm.currency,
  dm.value_source,
  dm.created_at,
  dm.updated_at
FROM financial_metrics dm
JOIN resolved_pairs rp ON rp.duplicate_id = dm.line_item_id
LEFT JOIN financial_metrics km
  ON km.company_id = dm.company_id
 AND km.period_id = dm.period_id
 AND km.line_item_id = rp.keep_id
WHERE km.id IS NULL;

WITH candidate_pairs AS (
  SELECT
    d.id AS duplicate_id,
    k.id AS keep_id,
    d.parent_id
  FROM financial_line_items d
  JOIN financial_line_items p ON p.id = d.parent_id
  JOIN financial_line_items k
    ON k.parent_id = d.parent_id
   AND k.id <> d.id
   AND lower(trim(k.name)) = lower(trim(d.name))
  WHERE d.parent_id IS NOT NULL
    AND d.code ~ ('^' || regexp_replace(p.code, '([\\.\\-])', '\\\\1', 'g') || '_others(_[0-9]+)?$')
), resolved_pairs AS (
  SELECT DISTINCT ON (duplicate_id)
    duplicate_id,
    keep_id,
    parent_id
  FROM candidate_pairs
  ORDER BY duplicate_id, keep_id
)
-- 3) Delete metrics on duplicate line items
DELETE FROM financial_metrics fm
USING resolved_pairs rp
WHERE fm.line_item_id = rp.duplicate_id;

WITH candidate_pairs AS (
  SELECT
    d.id AS duplicate_id,
    k.id AS keep_id,
    d.parent_id
  FROM financial_line_items d
  JOIN financial_line_items p ON p.id = d.parent_id
  JOIN financial_line_items k
    ON k.parent_id = d.parent_id
   AND k.id <> d.id
   AND lower(trim(k.name)) = lower(trim(d.name))
  WHERE d.parent_id IS NOT NULL
    AND d.code ~ ('^' || regexp_replace(p.code, '([\\.\\-])', '\\\\1', 'g') || '_others(_[0-9]+)?$')
), resolved_pairs AS (
  SELECT DISTINCT ON (duplicate_id)
    duplicate_id,
    keep_id,
    parent_id
  FROM candidate_pairs
  ORDER BY duplicate_id, keep_id
)
-- 4) Delete duplicate line items
DELETE FROM financial_line_items li
USING resolved_pairs rp
WHERE li.id = rp.duplicate_id;
