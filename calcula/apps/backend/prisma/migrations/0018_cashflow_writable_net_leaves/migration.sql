-- Make the three "Net Cash from X Activities" cashflow nodes writable.
--
-- Migration 0002_cashflow_rebuild turned the entire cashflow subtree into
-- formula-driven calculated leaves that depend on a granular set of input
-- codes (purchase_of_property_plant_equipment, proceeds_from_borrowings,
-- etc.). Seeds for API Holdings — and every other company that reports at
-- the consolidated "net cash from operating/investing/financing" granularity
-- rather than the disaggregated Ind-AS schedule — write directly to
-- net_cash_from_{operating,investing,financing}_activities. Those writes are
-- ignored because the derived-value engine re-evaluates the formula and the
-- granular inputs are all zero, so Investing and Financing sections render
-- as 0 on the storefront (see the Cash Flow tab on a deal page).
--
-- Fix: flip these three nodes back to regular (non-calculated) leaves so the
-- stored FinancialMetric value flows through unchanged. The parent section
-- nodes (operating_activities / investing_activities / financing_activities)
-- keep their one-line aggregation formulas, so totals still resolve and the
-- @SUM_CHILDREN pattern at higher levels is unaffected.

UPDATE financial_line_items
SET is_calculated = FALSE,
    formula = NULL,
    updated_at = now()
WHERE code IN (
  'net_cash_from_operating_activities',
  'net_cash_from_investing_activities',
  'net_cash_from_financing_activities'
);

-- Also flip net_increase_in_cash and cash_at_end_of_period to writable. These
-- rows were previously formula-calculated from leaves (cash_at_beginning_of_period,
-- effect_of_exchange_rate_on_cash) that API Holdings (and many other curated
-- companies) never populated, so the chain collapsed to partial values.
-- Making them writable lets the seed's explicit values flow through.
UPDATE financial_line_items
SET is_calculated = FALSE,
    formula = NULL,
    updated_at = now()
WHERE code IN ('net_increase_in_cash', 'cash_at_end_of_period');
