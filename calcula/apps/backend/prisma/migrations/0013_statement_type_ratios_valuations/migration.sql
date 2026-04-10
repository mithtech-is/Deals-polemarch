-- Rename the statement_type enum value `derived` to `ratios_valuations`.
-- This renames in place, so existing rows in financial_line_items keep working.
-- Note: the metric_value_source enum ALSO has a `derived` value — that one is
-- unrelated (it means "calculated value") and is NOT renamed.
ALTER TYPE statement_type RENAME VALUE 'derived' TO 'ratios_valuations';
