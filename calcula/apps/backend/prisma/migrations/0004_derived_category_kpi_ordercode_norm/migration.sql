UPDATE financial_line_items
SET
  is_calculated = true,
  formula = 'current_ratio',
  updated_at = now()
WHERE code = 'liquidity_ratios';

UPDATE financial_line_items
SET
  is_calculated = true,
  formula = 'debt_to_equity',
  updated_at = now()
WHERE code = 'leverage_ratios';

UPDATE financial_line_items
SET
  is_calculated = true,
  formula = 'net_margin',
  updated_at = now()
WHERE code = 'profitability_ratios';

UPDATE financial_line_items
SET
  is_calculated = true,
  formula = 'asset_turnover',
  updated_at = now()
WHERE code = 'efficiency_ratios';

UPDATE financial_line_items
SET
  is_calculated = true,
  formula = 'free_cashflow_margin',
  updated_at = now()
WHERE code = 'cashflow_ratios';

UPDATE financial_line_items
SET
  is_calculated = true,
  formula = 'pe_ratio',
  updated_at = now()
WHERE code = 'valuation_models';

UPDATE financial_line_items
SET
  is_calculated = true,
  formula = 'eps_basic',
  updated_at = now()
WHERE code = 'per_share_metrics';

UPDATE financial_line_items
SET
  is_calculated = false,
  formula = NULL,
  updated_at = now()
WHERE code IN ('market_price_per_share', 'shares_outstanding', 'enterprise_value_manual');

WITH canonical AS (
  SELECT * FROM (VALUES
    ('derived_root','04'),
    ('liquidity_ratios','0401'),
    ('leverage_ratios','0402'),
    ('profitability_ratios','0403'),
    ('efficiency_ratios','0404'),
    ('cashflow_ratios','0405'),
    ('valuation_models','0406'),
    ('per_share_metrics','0407'),
    ('working_capital','040101'),
    ('current_ratio','040102'),
    ('quick_assets','040103'),
    ('quick_ratio','040104'),
    ('cash_ratio','040105'),
    ('working_capital_to_sales','040106'),
    ('defensive_interval_ratio','040107'),
    ('total_debt','040201'),
    ('net_debt','040202'),
    ('debt_to_equity','040203'),
    ('debt_to_assets','040204'),
    ('debt_to_capital','040205'),
    ('equity_ratio','040206'),
    ('financial_leverage','040207'),
    ('interest_coverage','040208'),
    ('ebitda_interest_coverage','040209'),
    ('net_debt_to_ebitda','040210'),
    ('tax_rate_effective','040301'),
    ('nopat','040302'),
    ('invested_capital','040303'),
    ('gross_margin','040304'),
    ('ebitda_margin','040305'),
    ('ebit_margin','040306'),
    ('pretax_margin','040307'),
    ('net_margin','040308'),
    ('roa','040309'),
    ('roe','040310'),
    ('roce','040311'),
    ('roic','040312'),
    ('asset_turnover','040401'),
    ('fixed_asset_turnover','040402'),
    ('inventory_turnover','040403'),
    ('receivables_turnover','040404'),
    ('payables_turnover','040405'),
    ('working_capital_turnover','040406'),
    ('days_inventory_outstanding','040407'),
    ('days_sales_outstanding','040408'),
    ('days_payables_outstanding','040409'),
    ('cash_conversion_cycle','040410'),
    ('operating_cashflow_to_sales','040501'),
    ('operating_cashflow_to_net_income','040502'),
    ('free_cash_flow','040503'),
    ('free_cashflow_margin','040504'),
    ('cash_flow_to_debt','040505'),
    ('cash_interest_coverage','040506'),
    ('fcf_to_net_income','040507'),
    ('market_price_per_share','040601'),
    ('shares_outstanding','040602'),
    ('enterprise_value_manual','040603'),
    ('market_cap','040604'),
    ('enterprise_value_calc','040605'),
    ('pe_ratio','040606'),
    ('pb_ratio','040607'),
    ('ps_ratio','040608'),
    ('ev_to_ebitda','040609'),
    ('ev_to_sales','040610'),
    ('ev_to_ebit','040611'),
    ('earnings_yield','040612'),
    ('fcf_yield','040613'),
    ('price_to_ocf','040614'),
    ('eps_basic','040701'),
    ('book_value_per_share','040702'),
    ('sales_per_share','040703'),
    ('operating_cashflow_per_share','040704'),
    ('fcf_per_share','040705')
  ) AS t(code, order_code)
)
UPDATE financial_line_items li
SET
  order_code = canonical.order_code,
  updated_at = now()
FROM canonical
WHERE li.code = canonical.code
  AND li.statement_type = 'derived'::statement_type;
