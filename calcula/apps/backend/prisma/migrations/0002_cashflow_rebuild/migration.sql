-- Cashflow rebuild: indirect method canonical structure

-- 1) Rename legacy reconciliation block to canonical code
UPDATE financial_line_items
SET code = 'net_cash_reconciliation',
    name = 'Net Cash Reconciliation',
    updated_at = now()
WHERE code = 'net_cash_flow_section';

-- 2) Ensure derived subtotal nodes exist for investing/financing sections
INSERT INTO financial_line_items (
  id, code, name, parent_id, statement_type, order_code, display_order,
  is_calculated, formula, is_required, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  'net_cash_from_investing_activities',
  'Net Cash from Investing Activities',
  p.id,
  'cashflow',
  '020210',
  100,
  TRUE,
  '-purchase_of_property_plant_equipment + sale_of_property_plant_equipment - purchase_of_intangible_assets - purchase_of_investments + sale_of_investments - loans_given + loans_repaid + interest_received + dividend_received',
  FALSE,
  now(),
  now()
FROM financial_line_items p
WHERE p.code = 'investing_activities'
  AND NOT EXISTS (SELECT 1 FROM financial_line_items x WHERE x.code = 'net_cash_from_investing_activities');

INSERT INTO financial_line_items (
  id, code, name, parent_id, statement_type, order_code, display_order,
  is_calculated, formula, is_required, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  'net_cash_from_financing_activities',
  'Net Cash from Financing Activities',
  p.id,
  'cashflow',
  '020308',
  80,
  TRUE,
  'proceeds_from_borrowings - repayment_of_borrowings + proceeds_from_equity_issue - share_buyback - dividends_paid - interest_paid - lease_payments',
  FALSE,
  now(),
  now()
FROM financial_line_items p
WHERE p.code = 'financing_activities'
  AND NOT EXISTS (SELECT 1 FROM financial_line_items x WHERE x.code = 'net_cash_from_financing_activities');

-- 3) Move structure under canonical top-level sections
UPDATE financial_line_items
SET parent_id = (SELECT id FROM financial_line_items WHERE code = 'cf_root' LIMIT 1),
    statement_type = 'cashflow',
    updated_at = now()
WHERE code IN ('operating_activities', 'investing_activities', 'financing_activities', 'net_cash_reconciliation');

UPDATE financial_line_items
SET parent_id = (SELECT id FROM financial_line_items WHERE code = 'operating_activities' LIMIT 1),
    statement_type = 'cashflow',
    updated_at = now()
WHERE code IN ('working_capital_adjustments', 'cash_generated_from_operations', 'income_tax_paid', 'net_cash_from_operating_activities');

UPDATE financial_line_items
SET parent_id = (SELECT id FROM financial_line_items WHERE code = 'net_cash_reconciliation' LIMIT 1),
    statement_type = 'cashflow',
    updated_at = now()
WHERE code IN ('net_increase_in_cash', 'cash_at_beginning_of_period', 'effect_of_exchange_rate_on_cash', 'cash_at_end_of_period');

UPDATE financial_line_items
SET parent_id = (SELECT id FROM financial_line_items WHERE code = 'working_capital_adjustments' LIMIT 1),
    statement_type = 'cashflow',
    updated_at = now()
WHERE code IN (
  'change_in_trade_receivables',
  'change_in_inventories',
  'change_in_trade_payables',
  'change_in_other_current_assets',
  'change_in_other_current_liabilities',
  'change_in_contract_assets',
  'change_in_contract_liabilities'
);

-- Retire legacy group node from cashflow statement rendering
UPDATE financial_line_items
SET statement_type = 'derived',
    is_calculated = FALSE,
    formula = NULL,
    updated_at = now()
WHERE code = 'operating_cash_flow_section';

-- 4) Canonical formulas (indirect method, Ind AS default mapping)
UPDATE financial_line_items
SET is_calculated = TRUE,
    formula = 'cash_at_end_of_period',
    updated_at = now()
WHERE code = 'cf_root';

UPDATE financial_line_items
SET is_calculated = TRUE,
    formula = 'net_cash_from_operating_activities',
    updated_at = now()
WHERE code = 'operating_activities';

UPDATE financial_line_items
SET is_calculated = TRUE,
    formula = 'change_in_trade_receivables + change_in_inventories + change_in_trade_payables + change_in_other_current_assets + change_in_other_current_liabilities + change_in_contract_assets + change_in_contract_liabilities',
    updated_at = now()
WHERE code = 'working_capital_adjustments';

UPDATE financial_line_items
SET is_calculated = TRUE,
    formula = 'profit_before_tax + depreciation_amortization + impairment_adjustment + interest_expense - interest_income + share_based_payment - gain_loss_on_asset_sale - gain_loss_on_investment_sale + working_capital_adjustments',
    updated_at = now()
WHERE code = 'cash_generated_from_operations';

UPDATE financial_line_items
SET is_calculated = TRUE,
    formula = 'cash_generated_from_operations - income_tax_paid',
    updated_at = now()
WHERE code = 'net_cash_from_operating_activities';

UPDATE financial_line_items
SET is_calculated = TRUE,
    formula = 'net_cash_from_investing_activities',
    updated_at = now()
WHERE code = 'investing_activities';

UPDATE financial_line_items
SET is_calculated = TRUE,
    formula = '-purchase_of_property_plant_equipment + sale_of_property_plant_equipment - purchase_of_intangible_assets - purchase_of_investments + sale_of_investments - loans_given + loans_repaid + interest_received + dividend_received',
    updated_at = now()
WHERE code = 'net_cash_from_investing_activities';

UPDATE financial_line_items
SET is_calculated = TRUE,
    formula = 'net_cash_from_financing_activities',
    updated_at = now()
WHERE code = 'financing_activities';

UPDATE financial_line_items
SET is_calculated = TRUE,
    formula = 'proceeds_from_borrowings - repayment_of_borrowings + proceeds_from_equity_issue - share_buyback - dividends_paid - interest_paid - lease_payments',
    updated_at = now()
WHERE code = 'net_cash_from_financing_activities';

UPDATE financial_line_items
SET is_calculated = TRUE,
    formula = 'cash_at_end_of_period',
    updated_at = now()
WHERE code = 'net_cash_reconciliation';

UPDATE financial_line_items
SET is_calculated = TRUE,
    formula = 'net_cash_from_operating_activities + net_cash_from_investing_activities + net_cash_from_financing_activities',
    updated_at = now()
WHERE code = 'net_increase_in_cash';

UPDATE financial_line_items
SET is_calculated = TRUE,
    formula = 'cash_at_beginning_of_period + net_increase_in_cash + effect_of_exchange_rate_on_cash',
    updated_at = now()
WHERE code = 'cash_at_end_of_period';

-- 5) Canonical order code assignment for cashflow subtree
UPDATE financial_line_items SET order_code = '02', display_order = 2 WHERE code = 'cf_root';
UPDATE financial_line_items SET order_code = '0201', display_order = 10 WHERE code = 'operating_activities';
UPDATE financial_line_items SET order_code = '0202', display_order = 20 WHERE code = 'investing_activities';
UPDATE financial_line_items SET order_code = '0203', display_order = 30 WHERE code = 'financing_activities';
UPDATE financial_line_items SET order_code = '0204', display_order = 40 WHERE code = 'net_cash_reconciliation';

UPDATE financial_line_items SET order_code = '020101', display_order = 10 WHERE code = 'profit_before_tax';
UPDATE financial_line_items SET order_code = '020102', display_order = 20 WHERE code = 'depreciation_amortization';
UPDATE financial_line_items SET order_code = '020103', display_order = 30 WHERE code = 'impairment_adjustment';
UPDATE financial_line_items SET order_code = '020104', display_order = 40 WHERE code = 'interest_expense';
UPDATE financial_line_items SET order_code = '020105', display_order = 50 WHERE code = 'interest_income';
UPDATE financial_line_items SET order_code = '020106', display_order = 60 WHERE code = 'share_based_payment';
UPDATE financial_line_items SET order_code = '020107', display_order = 70 WHERE code = 'foreign_exchange_adjustment';
UPDATE financial_line_items SET order_code = '020108', display_order = 80 WHERE code = 'gain_loss_on_asset_sale';
UPDATE financial_line_items SET order_code = '020109', display_order = 90 WHERE code = 'gain_loss_on_investment_sale';
UPDATE financial_line_items SET order_code = '020110', display_order = 100 WHERE code = 'working_capital_adjustments';
UPDATE financial_line_items SET order_code = '020111', display_order = 110 WHERE code = 'cash_generated_from_operations';
UPDATE financial_line_items SET order_code = '020112', display_order = 120 WHERE code = 'income_tax_paid';
UPDATE financial_line_items SET order_code = '020113', display_order = 130 WHERE code = 'net_cash_from_operating_activities';

UPDATE financial_line_items SET order_code = '02011001', display_order = 10 WHERE code = 'change_in_trade_receivables';
UPDATE financial_line_items SET order_code = '02011002', display_order = 20 WHERE code = 'change_in_inventories';
UPDATE financial_line_items SET order_code = '02011003', display_order = 30 WHERE code = 'change_in_trade_payables';
UPDATE financial_line_items SET order_code = '02011004', display_order = 40 WHERE code = 'change_in_other_current_assets';
UPDATE financial_line_items SET order_code = '02011005', display_order = 50 WHERE code = 'change_in_other_current_liabilities';
UPDATE financial_line_items SET order_code = '02011006', display_order = 60 WHERE code = 'change_in_contract_assets';
UPDATE financial_line_items SET order_code = '02011007', display_order = 70 WHERE code = 'change_in_contract_liabilities';

UPDATE financial_line_items SET order_code = '020201', display_order = 10 WHERE code = 'purchase_of_property_plant_equipment';
UPDATE financial_line_items SET order_code = '020202', display_order = 20 WHERE code = 'sale_of_property_plant_equipment';
UPDATE financial_line_items SET order_code = '020203', display_order = 30 WHERE code = 'purchase_of_intangible_assets';
UPDATE financial_line_items SET order_code = '020204', display_order = 40 WHERE code = 'purchase_of_investments';
UPDATE financial_line_items SET order_code = '020205', display_order = 50 WHERE code = 'sale_of_investments';
UPDATE financial_line_items SET order_code = '020206', display_order = 60 WHERE code = 'loans_given';
UPDATE financial_line_items SET order_code = '020207', display_order = 70 WHERE code = 'loans_repaid';
UPDATE financial_line_items SET order_code = '020208', display_order = 80 WHERE code = 'interest_received';
UPDATE financial_line_items SET order_code = '020209', display_order = 90 WHERE code = 'dividend_received';
UPDATE financial_line_items SET order_code = '020210', display_order = 100 WHERE code = 'net_cash_from_investing_activities';

UPDATE financial_line_items SET order_code = '020301', display_order = 10 WHERE code = 'proceeds_from_borrowings';
UPDATE financial_line_items SET order_code = '020302', display_order = 20 WHERE code = 'repayment_of_borrowings';
UPDATE financial_line_items SET order_code = '020303', display_order = 30 WHERE code = 'proceeds_from_equity_issue';
UPDATE financial_line_items SET order_code = '020304', display_order = 40 WHERE code = 'share_buyback';
UPDATE financial_line_items SET order_code = '020305', display_order = 50 WHERE code = 'dividends_paid';
UPDATE financial_line_items SET order_code = '020306', display_order = 60 WHERE code = 'interest_paid';
UPDATE financial_line_items SET order_code = '020307', display_order = 70 WHERE code = 'lease_payments';
UPDATE financial_line_items SET order_code = '020308', display_order = 80 WHERE code = 'net_cash_from_financing_activities';

UPDATE financial_line_items SET order_code = '020401', display_order = 10 WHERE code = 'net_increase_in_cash';
UPDATE financial_line_items SET order_code = '020402', display_order = 20 WHERE code = 'cash_at_beginning_of_period';
UPDATE financial_line_items SET order_code = '020403', display_order = 30 WHERE code = 'effect_of_exchange_rate_on_cash';
UPDATE financial_line_items SET order_code = '020404', display_order = 40 WHERE code = 'cash_at_end_of_period';
