#!/usr/bin/env python3.14
"""
PDF-to-Calcula Financial Import Pipeline
=========================================
Extracts financial data from PDF statements (text-line parsing), classifies
them (BS / P&L / CF / SCE), maps Ind-AS labels to Calcula canonical codes,
validates cross-checks, and optionally uploads via the Calcula import API.

Usage:
    python3.14 cli.py --dir /path/to/pdfs/ --isin INE03AV01027 --name "Company Name" [--upload] [--force]

Requirements:
    pdfplumber, PyJWT, requests
    Optional: pytesseract (for scanned PDFs)
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import subprocess
import sys
import textwrap
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

import pdfplumber

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("pdf-import")


# ===========================================================================
# 1. LABEL-TO-CODE DICTIONARY  (200+ entries)
# ===========================================================================

# Context-independent mappings (label -> code).
# For context-dependent items (borrowings, investments, loans, provisions, etc.)
# there is a separate CONTEXT_DEPENDENT_LABELS dict keyed by (label, section).

LABEL_TO_CODE: dict[str, str] = {
    # ---- P&L: Revenue ----
    "revenue from operations": "revenue_from_operations",
    "revenue from operation": "revenue_from_operations",
    "income from operations": "revenue_from_operations",
    "sale of products": "product_sales",
    "sale of product": "product_sales",
    "sales of products": "product_sales",
    "sale of services": "service_revenue",
    "sales of services": "service_revenue",
    "income from services": "service_revenue",
    "service income": "service_revenue",
    "domestic sales": "domestic_sales",
    "export sales": "export_sales",
    "product sales": "product_sales",
    "service revenue": "service_revenue",
    "other income": "other_income",
    "other operating income": "other_income",
    "other operating revenue": "other_income",
    "interest income": "interest_income",
    "dividend income": "dividend_income",
    "commission income": "commission_income",
    "royalty income": "royalty_income",
    "net gain on fair value changes": "other_income",
    "gain on sale of investments": "other_income",
    "profit on sale of investments": "other_income",
    "gain on foreign currency transactions": "foreign_exchange_gain",
    "foreign exchange gain/(loss)": "foreign_exchange_gain",
    "foreign exchange gain": "foreign_exchange_gain",
    "foreign exchange gain (net)": "foreign_exchange_gain",
    "net gain/(loss) on foreign currency transactions": "foreign_exchange_gain",

    # ---- P&L: Expenses ----
    "cost of materials consumed": "cost_of_materials_consumed",
    "cost of material consumed": "cost_of_materials_consumed",
    "consumption of raw materials": "cost_of_materials_consumed",
    "raw materials consumed": "cost_of_materials_consumed",
    "purchase of stock-in-trade": "purchase_of_stock_in_trade",
    "purchases of stock-in-trade": "purchase_of_stock_in_trade",
    "purchase of traded goods": "purchase_of_stock_in_trade",
    "purchases of traded goods": "purchase_of_stock_in_trade",
    "changes in inventories of finished goods work-in-progress and stock-in-trade": "changes_in_inventory",
    "changes in inventories of finished goods, work-in-progress and stock-in-trade": "changes_in_inventory",
    "changes in inventories of stock-in-trade": "changes_in_inventory",
    "changes in inventories of finished goods and work-in-progress": "changes_in_inventory",
    "changes in inventories": "changes_in_inventory",
    "(increase)/decrease in inventories": "changes_in_inventory",
    "increase/(decrease) in inventories": "changes_in_inventory",
    "change in inventories of finished goods and work-in-progress": "changes_in_inventory",
    "employee benefits expense": "employee_benefits_expense",
    "employee benefit expense": "employee_benefits_expense",
    "employee benefit expenses": "employee_benefits_expense",
    "employee benefits expenses": "employee_benefits_expense",
    "salaries and wages": "salaries",
    "salaries, wages and bonus": "salaries",
    "salaries wages and bonus": "salaries",
    "salary and wages": "salaries",
    "salaries": "salaries",
    "wages": "wages",
    "bonus": "bonus",
    "contribution to provident and other funds": "provident_fund_contribution",
    "contribution to provident fund": "provident_fund_contribution",
    "provident fund contribution": "provident_fund_contribution",
    "gratuity expense": "gratuity_expense",
    "gratuity": "gratuity_expense",
    "staff welfare expenses": "staff_welfare_expense",
    "staff welfare expense": "staff_welfare_expense",
    "employee stock option expense": "employee_stock_compensation",
    "employee stock compensation expense": "employee_stock_compensation",
    "share-based payment expense": "employee_stock_compensation",
    "share based payment expense": "employee_stock_compensation",
    "finance costs": "finance_cost_section_others",
    "finance cost": "finance_cost_section_others",
    "interest expense": "interest_on_loans",
    "interest on borrowings": "interest_on_loans",
    "interest on loans": "interest_on_loans",
    "interest on term loans": "interest_on_loans",
    "interest on bonds": "interest_on_bonds",
    "interest on debentures": "interest_on_bonds",
    "interest on lease liabilities": "interest_on_leases",
    "interest cost on lease liabilities": "interest_on_leases",
    "interest on leases": "interest_on_leases",
    "bank charges": "bank_charges",
    "other borrowing costs": "finance_cost_section_others",
    "depreciation and amortisation expense": "depreciation_expense",
    "depreciation and amortization expense": "depreciation_expense",
    "depreciation and amortisation": "depreciation_expense",
    "depreciation and amortization": "depreciation_expense",
    "depreciation": "depreciation_expense",
    "amortisation expense": "amortization_expense",
    "amortization expense": "amortization_expense",
    "amortisation": "amortization_expense",
    "amortization": "amortization_expense",
    "depreciation on right-of-use assets": "depreciation_right_of_use_assets",
    "depreciation of right-of-use assets": "depreciation_right_of_use_assets",
    "other expenses": "miscellaneous_expenses",
    "other expenditure": "miscellaneous_expenses",
    "miscellaneous expenses": "miscellaneous_expenses",
    "rent": "rent_expense",
    "rent expense": "rent_expense",
    "rates and taxes": "miscellaneous_expenses",
    "repairs and maintenance": "repairs_and_maintenance",
    "repair and maintenance": "repairs_and_maintenance",
    "insurance expense": "insurance_expense",
    "insurance": "insurance_expense",
    "power and fuel": "power_and_fuel",
    "power & fuel": "power_and_fuel",
    "electricity expenses": "power_and_fuel",
    "travelling and conveyance": "travel_expense",
    "travelling expense": "travel_expense",
    "travel expense": "travel_expense",
    "travel and conveyance": "travel_expense",
    "communication expense": "communication_expense",
    "communication expenses": "communication_expense",
    "telephone expenses": "communication_expense",
    "legal and professional fees": "legal_and_professional_fees",
    "legal and professional charges": "legal_and_professional_fees",
    "legal & professional fees": "legal_and_professional_fees",
    "professional fees": "legal_and_professional_fees",
    "payment to auditors": "audit_fees",
    "audit fees": "audit_fees",
    "auditors' remuneration": "audit_fees",
    "auditor's remuneration": "audit_fees",
    "advertising expense": "advertising_expense",
    "advertising expenses": "advertising_expense",
    "advertisement expenses": "advertising_expense",
    "advertisement expense": "advertising_expense",
    "marketing expense": "marketing_expense",
    "marketing expenses": "marketing_expense",
    "sales promotion expenses": "promotion_expense",
    "promotion expense": "promotion_expense",
    "freight outward": "freight_outward",
    "freight and forwarding": "freight_outward",
    "freight and forwarding charges": "freight_outward",
    "distribution expenses": "distribution_expense",
    "distribution expense": "distribution_expense",
    "consulting expense": "consulting_expense",
    "consultancy charges": "consulting_expense",
    "research and development expenses": "research_and_development",
    "research and development expense": "research_and_development",
    "research and development": "research_and_development",
    "office expenses": "office_expenses",
    "factory expenses": "factory_expenses",
    "manufacturing expenses": "manufacturing_overheads",
    "manufacturing overheads": "manufacturing_overheads",
    "direct labor": "direct_labor",
    "impairment loss": "impairment_loss",
    "impairment of financial assets": "bad_debt_expense",
    "expected credit loss on financial assets": "bad_debt_expense",
    "expected credit loss": "bad_debt_expense",
    "allowance for expected credit loss": "bad_debt_expense",
    "provision for doubtful debts": "bad_debt_expense",
    "bad debts written off": "bad_debt_expense",
    "bad debts": "bad_debt_expense",
    "loss on disposal of property, plant and equipment": "loss_on_asset_sale",
    "loss on disposal of assets": "loss_on_asset_sale",
    "loss on sale of fixed assets": "loss_on_asset_sale",
    "loss on sale of investments": "loss_on_investment",
    "sales commission": "sales_commission",
    "commission expense": "sales_commission",
    "corporate social responsibility expenditure": "miscellaneous_expenses",
    "corporate social responsibility expenses": "miscellaneous_expenses",
    "csr expenditure": "miscellaneous_expenses",
    "donations": "miscellaneous_expenses",

    # ---- P&L: Tax ----
    "current tax": "current_tax_expense",
    "current tax charge": "current_tax_expense",
    "current tax expense": "current_tax_expense",
    "tax expense for current year": "current_tax_expense",
    "income tax expense - current": "current_tax_expense",
    "mat credit entitlement": "current_tax_expense",
    "deferred tax": "deferred_tax_expense",
    "deferred tax charge/(credit)": "deferred_tax_expense",
    "deferred tax credit": "deferred_tax_expense",
    "deferred tax expense/(benefit)": "deferred_tax_expense",
    "deferred tax expense": "deferred_tax_expense",
    "deferred tax expense/(credit)": "deferred_tax_expense",
    "income tax expense - deferred": "deferred_tax_expense",
    "tax expense pertaining to prior periods": "current_tax_expense",
    "earlier years tax": "current_tax_expense",
    "tax adjustment for earlier years": "current_tax_expense",

    # ---- P&L: Totals (for validation, prefixed with _) ----
    "total income": "_total_income",
    "total revenue": "_total_income",
    "total expenses": "_total_expenses",
    "profit before tax": "_pbt",
    "profit/(loss) before tax": "_pbt",
    "(loss) before tax": "_pbt",
    "loss before tax": "_pbt",
    "(loss)/profit before tax": "_pbt",
    "profit before exceptional items and tax": "_pbt",
    "profit before tax and exceptional items": "_pbt",
    "tax expense": "_total_tax",
    "income tax expense": "_total_tax",
    "total tax expense": "_total_tax",
    "total tax expense/(credit)": "_total_tax",
    "profit after tax": "_pat",
    "profit/(loss) after tax": "_pat",
    "(loss)/profit after tax": "_pat",
    "profit for the year": "_pat",
    "profit/(loss) for the year": "_pat",
    "(loss)/profit for the year": "_pat",
    "profit for the period": "_pat",
    "net profit for the year": "_pat",
    "net profit/(loss) for the year": "_pat",
    "loss for the year": "_pat",
    "total comprehensive income for the year": "_total_comprehensive",
    "total comprehensive income/(loss) for the year": "_total_comprehensive",
    "total comprehensive income for the year (a+b)": "_total_comprehensive",
    "other comprehensive income": "_oci",
    "other comprehensive income/(loss)": "_oci",
    "other comprehensive income for the year, net of tax": "_oci",
    "other comprehensive income for the year, net of tax (b)": "_oci",
    "earnings per share (basic)": "_eps_basic",
    "basic earnings per share": "_eps_basic",
    "basic eps": "_eps_basic",
    "basic (rs.)": "_eps_basic",
    "earnings per share (diluted)": "_eps_diluted",
    "diluted earnings per share": "_eps_diluted",
    "diluted eps": "_eps_diluted",
    "diluted (rs.)": "_eps_diluted",

    # ---- Balance Sheet: Non-current Assets ----
    "property, plant and equipment": "property_plant_equipment",
    "property plant and equipment": "property_plant_equipment",
    "tangible assets": "property_plant_equipment",
    "fixed assets": "property_plant_equipment",
    "capital work-in-progress": "capital_work_in_progress",
    "capital work in progress": "capital_work_in_progress",
    "cwip": "capital_work_in_progress",
    "goodwill": "goodwill",
    "other intangible assets": "other_intangible_assets",
    "intangible assets": "other_intangible_assets",
    "intangible assets under development": "intangible_assets_under_development",
    "right-of-use assets": "right_of_use_assets",
    "right of use assets": "right_of_use_assets",
    "investment property": "investment_property",
    "biological assets": "biological_assets",
    "deferred tax assets (net)": "deferred_tax_assets",
    "deferred tax assets": "deferred_tax_assets",
    "income tax assets (net)": "non_current_tax_assets",
    "income tax assets": "non_current_tax_assets",
    "non-current tax assets (net)": "non_current_tax_assets",
    "non-current tax assets": "non_current_tax_assets",
    "advance tax": "non_current_tax_assets",
    "other non-current assets": "other_non_current_assets",

    # ---- Balance Sheet: Current Assets ----
    "inventories": "inventories_stock_in_trade",
    "inventory": "inventories_stock_in_trade",
    "raw materials": "inventories_raw_materials",
    "work-in-progress": "inventories_work_in_progress",
    "finished goods": "inventories_finished_goods",
    "stock-in-trade": "inventories_stock_in_trade",
    "consumables": "inventories_consumables",
    "stores and spares": "inventories_consumables",
    "trade receivables": "trade_receivables",
    "sundry debtors": "trade_receivables",
    "cash and cash equivalents": "cash_and_cash_equivalents",
    "cash & cash equivalents": "cash_and_cash_equivalents",
    "cash and bank balances": "cash_and_cash_equivalents",
    "other bank balances": "bank_balances_other_than_cash",
    "bank balances other than cash and cash equivalents": "bank_balances_other_than_cash",
    "bank balances other than above": "bank_balances_other_than_cash",
    "other current assets": "other_current_assets",
    "prepaid expenses": "prepaid_expenses",
    "advances": "advances_to_suppliers",
    "advances to suppliers": "advances_to_suppliers",
    "contract assets": "contract_assets",
    "unbilled revenue": "unbilled_revenue",

    # ---- Balance Sheet: Equity ----
    "equity share capital": "equity_share_capital",
    "share capital": "equity_share_capital",
    "authorised capital": "_authorised_capital",
    "issued, subscribed and paid up capital": "equity_share_capital",
    "issued, subscribed and fully paid-up": "equity_share_capital",
    "other equity": "other_equity",
    "reserves and surplus": "retained_earnings",
    "retained earnings": "retained_earnings",
    "surplus in statement of profit and loss": "retained_earnings",
    "surplus in the statement of profit and loss": "retained_earnings",
    "securities premium": "share_premium",
    "securities premium reserve": "share_premium",
    "securities premium account": "share_premium",
    "share premium": "share_premium",
    "general reserve": "general_reserve",
    "capital reserve": "capital_reserve",
    "capital redemption reserve": "capital_reserve",
    "revaluation reserve": "revaluation_reserve",
    "foreign currency translation reserve": "foreign_currency_translation_reserve",
    "foreign currency monetary item translation difference account": "foreign_currency_translation_reserve",
    "other comprehensive income reserve": "other_comprehensive_income_reserve",
    "share options outstanding account": "other_equity",
    "employee stock options outstanding": "other_equity",
    "treasury shares": "treasury_shares",
    "money received against share warrants": "other_equity",
    "instruments entirely equity in nature": "other_equity",

    # ---- Balance Sheet: Non-current Liabilities ----
    "deferred tax liabilities (net)": "deferred_tax_liabilities",
    "deferred tax liabilities": "deferred_tax_liabilities",
    "other non-current liabilities": "other_non_current_liabilities",
    "long term trade payables": "long_term_trade_payables",
    "long-term trade payables": "long_term_trade_payables",
    "derivative liabilities": "derivative_liabilities_non_current",
    "employee benefit obligations": "employee_benefit_obligations",

    # ---- Balance Sheet: Current Liabilities ----
    "trade payables": "trade_payables_other",
    "sundry creditors": "trade_payables_other",
    "trade payables - micro and small enterprises": "trade_payables_micro_small",
    "total outstanding dues of micro enterprises and small enterprises": "trade_payables_micro_small",
    "trade payables - other than micro and small enterprises": "trade_payables_other",
    "total outstanding dues of creditors other than micro enterprises and small enterprises": "trade_payables_other",
    "other current liabilities": "other_current_liabilities",
    "current tax liabilities (net)": "current_tax_liabilities",
    "current tax liabilities": "current_tax_liabilities",
    "income tax liabilities": "current_tax_liabilities",
    "provision for tax": "current_tax_liabilities",
    "contract liabilities": "contract_liabilities",
    "customer advances": "customer_advances",
    "advance from customers": "customer_advances",
    "advances from customers": "customer_advances",
    "dividends payable": "dividends_payable",
    "dividend payable": "dividends_payable",
    "interest payable": "interest_payable",
    "accrued expenses": "accrued_expenses",
    "accrued liabilities": "accrued_expenses",
    "other financial liabilities": "other_current_liabilities",
    "current portion of long-term debt": "current_portion_long_term_debt",
    "current maturities of long-term borrowings": "current_portion_long_term_debt",
    "current maturities of long term borrowings": "current_portion_long_term_debt",
    "current maturities of long-term debt": "current_portion_long_term_debt",

    # ---- BS: Totals (for validation) ----
    "total non-current assets": "_total_non_current_assets",
    "total non current assets": "_total_non_current_assets",
    "total current assets": "_total_current_assets",
    "total assets": "_total_assets",
    "total equity": "_total_equity",
    "total equity and liabilities": "_total_equity_liabilities",
    "total non-current liabilities": "_total_non_current_liabilities",
    "total non current liabilities": "_total_non_current_liabilities",
    "total current liabilities": "_total_current_liabilities",
    "total liabilities": "_total_liabilities",

    # ---- Cash Flow Statement ----
    # Adjustments to PBT (mapped to CF codes)
    "loss/(gain) on disposal of property, plant and equipment": "gain_loss_on_asset_sale",
    "profit/(loss) on sale of property, plant and equipment": "gain_loss_on_asset_sale",
    "(profit)/loss on sale of property, plant and equipment": "gain_loss_on_asset_sale",
    "gain on sale of property, plant and equipment": "gain_loss_on_asset_sale",
    "loss on sale of property, plant and equipment": "gain_loss_on_asset_sale",
    "loss on sale/disposal of tangible and intangible assets (net)": "gain_loss_on_asset_sale",
    "profit on sale of fixed assets": "gain_loss_on_asset_sale",
    "(profit)/loss on sale of investments": "gain_loss_on_investment_sale",
    "profit/(loss) on sale of investments": "gain_loss_on_investment_sale",
    "gain/(loss) on sale of investments": "gain_loss_on_investment_sale",
    "loss/(gain) on sale of investments": "gain_loss_on_investment_sale",
    "impairment of assets": "impairment_adjustment",
    "impairment loss on financial assets": "impairment_adjustment",
    "provision for doubtful debts and advances": "impairment_adjustment",
    "unrealised foreign exchange loss/(gain)": "foreign_exchange_adjustment",
    "unrealised foreign exchange (gain)/loss": "foreign_exchange_adjustment",
    "unrealised foreign exchange loss/(gain) (net)": "foreign_exchange_adjustment",

    # Working capital changes
    "(increase)/decrease in trade receivables": "change_in_trade_receivables",
    "increase/(decrease) in trade receivables": "change_in_trade_receivables",
    "decrease/(increase) in trade receivables": "change_in_trade_receivables",
    "(increase)/decrease in inventories": "change_in_inventories",
    "increase/(decrease) in inventories": "change_in_inventories",
    "decrease/(increase) in inventories": "change_in_inventories",
    "(increase)/decrease in other current assets": "change_in_other_current_assets",
    "decrease/(increase) in other current assets": "change_in_other_current_assets",
    "(increase)/decrease in other assets": "change_in_other_current_assets",
    "decrease in other current assets": "change_in_other_current_assets",
    "increase/(decrease) in trade payables": "change_in_trade_payables",
    "(increase)/decrease in trade payables": "change_in_trade_payables",
    "increase/(decrease) in other current liabilities": "change_in_other_current_liabilities",
    "(increase)/decrease in other current liabilities": "change_in_other_current_liabilities",
    "increase/(decrease) in other liabilities": "change_in_other_current_liabilities",
    "change in contract assets": "change_in_contract_assets",
    "change in contract liabilities": "change_in_contract_liabilities",

    "income taxes paid (net)": "income_tax_paid",
    "income tax paid": "income_tax_paid",
    "income taxes paid": "income_tax_paid",
    "taxes paid": "income_tax_paid",
    "taxes paid (net of refunds)": "income_tax_paid",
    "net cash generated from operating activities": "net_cash_from_operating_activities",
    "net cash from operating activities": "net_cash_from_operating_activities",
    "net cash used in operating activities": "net_cash_from_operating_activities",
    "net cash generated from/(used in) operating activities": "net_cash_from_operating_activities",
    "net cash flows from operating activities": "net_cash_from_operating_activities",
    "net cash flows generated from operating activities": "net_cash_from_operating_activities",
    "net cash flows generated from operating activities (a)": "net_cash_from_operating_activities",

    # Investing
    "purchase of property, plant and equipment": "purchase_of_property_plant_equipment",
    "purchase of property plant and equipment": "purchase_of_property_plant_equipment",
    "acquisition of property, plant & equipments": "purchase_of_property_plant_equipment",
    "acquisition of property, plant and equipment": "purchase_of_property_plant_equipment",
    "capital expenditure on property, plant and equipment": "purchase_of_property_plant_equipment",
    "purchase of intangible assets": "purchase_of_intangible_assets",
    "acquisition of intangible assets including expenditure on internally generated intangible assets": "purchase_of_intangible_assets",
    "purchase of investments": "purchase_of_investments",
    "investment in subsidiaries": "purchase_of_investments",
    "investment in associates": "purchase_of_investments",
    "investments in mutual funds": "purchase_of_investments",
    "purchase of mutual funds": "purchase_of_investments",
    "investment made in equity shares of subsidiaries and joint venture": "purchase_of_investments",
    "(investment) in/redemption of mutual funds (net)": "purchase_of_investments",
    "proceeds from sale of property, plant and equipment": "sale_of_property_plant_equipment",
    "proceeds from sale of property, plant & equipments": "sale_of_property_plant_equipment",
    "sale of property, plant and equipment": "sale_of_property_plant_equipment",
    "proceeds from sale of investments": "sale_of_investments",
    "sale of investments": "sale_of_investments",
    "proceeds from sale of mutual funds": "sale_of_investments",
    "redemption of mutual funds": "sale_of_investments",
    "interest received": "interest_received",
    "interest on fixed deposits from banks": "interest_received",
    "interest on fixed deposits and others": "interest_received",
    "interest income from others": "interest_received",
    "dividend received": "dividend_received",
    "dividend received from joint venture": "dividend_received",
    "dividends received": "dividend_received",
    "loans given": "loans_given",
    "loan given to subsidiaries": "loans_given",
    "loans and advances given": "loans_given",
    "loans repaid": "loans_repaid",
    "loans and advances repaid": "loans_repaid",
    "investment in fixed deposits": "investing_activities_others",
    "investment in fixed deposits*": "investing_activities_others",
    "redemption of fixed deposits": "investing_activities_others",
    "redemption of fixed deposits*": "investing_activities_others",
    "net cash used in investing activities": "net_cash_from_investing_activities",
    "net cash from investing activities": "net_cash_from_investing_activities",
    "net cash generated from/(used in) investing activities": "net_cash_from_investing_activities",
    "net cash flows from/(used in) investing activities": "net_cash_from_investing_activities",
    "net cash flows used in investing activities": "net_cash_from_investing_activities",
    "net cash flows used in investing activities (b)": "net_cash_from_investing_activities",

    # Financing
    "proceeds from borrowings": "proceeds_from_borrowings",
    "proceeds from long-term borrowings": "proceeds_from_borrowings",
    "proceeds from short-term borrowings": "proceeds_from_borrowings",
    "repayment of borrowings": "repayment_of_borrowings",
    "repayment of long-term borrowings": "repayment_of_borrowings",
    "repayment of short-term borrowings": "repayment_of_borrowings",
    "repayment of short-term borrowings (net)": "repayment_of_borrowings",
    "proceeds from issue of equity shares": "proceeds_from_equity_issue",
    "proceeds from issue of equity shares, including securities premium": "proceeds_from_equity_issue",
    "proceeds from issue of shares": "proceeds_from_equity_issue",
    "proceeds from equity issue": "proceeds_from_equity_issue",
    "dividends paid": "dividends_paid",
    "dividend paid": "dividends_paid",
    "payment of dividends": "dividends_paid",
    "interest paid": "interest_paid",
    "finance costs paid": "interest_paid",
    "interest and other finance charges paid": "interest_paid",
    "lease payments": "lease_payments",
    "payment of lease liabilities": "lease_payments",
    "repayment of lease liabilities": "lease_payments",
    "principal payment of lease liabilities": "lease_payments",
    "principal repayment of lease liabilities": "lease_payments",
    "interest repayment of lease liabilities": "interest_paid",
    "net cash used in financing activities": "net_cash_from_financing_activities",
    "net cash from financing activities": "net_cash_from_financing_activities",
    "net cash generated from/(used in) financing activities": "net_cash_from_financing_activities",
    "net cash flows from/(used in) financing activities": "net_cash_from_financing_activities",
    "net cash flows used in financing activities": "net_cash_from_financing_activities",
    "net cash flows used in financing activities (c)": "net_cash_from_financing_activities",

    # Cash reconciliation
    "net increase/(decrease) in cash and cash equivalents": "net_increase_in_cash",
    "net increase in cash and cash equivalents": "net_increase_in_cash",
    "net decrease in cash and cash equivalents": "net_increase_in_cash",
    "net increase/(decrease) in cash and cash equivalents (a+b+c)": "net_increase_in_cash",
    "cash and cash equivalents at the beginning of the year": "cash_at_beginning_of_period",
    "cash and cash equivalents at beginning of the year": "cash_at_beginning_of_period",
    "opening balance of cash and cash equivalents": "cash_at_beginning_of_period",
    "cash and cash equivalents at the end of the year": "cash_at_end_of_period",
    "cash and cash equivalents at end of the year": "cash_at_end_of_period",
    "closing balance of cash and cash equivalents": "cash_at_end_of_period",
    "effect of exchange rate changes on cash and cash equivalents": "effect_of_exchange_rate_on_cash",
    "effect of exchange rate changes": "effect_of_exchange_rate_on_cash",

    # ---- Statement of Changes in Equity ----
    "balance at the beginning of the year": "opening_equity",
    "opening balance": "opening_equity",
    "balance as at beginning": "opening_equity",
    "profit for the year": "_sce_profit",
    "other comprehensive income for the year": "other_comprehensive_income",
    "total comprehensive income for the year": "_sce_total_ci",
    "dividends": "dividends_declared_equity",
    "dividends declared": "dividends_declared_equity",
    "securities premium received during the year": "securities_premium_added",
    "issue of share capital": "share_capital_issued",
    "shares issued during the year": "share_capital_issued",
    "share-based payment": "share_based_payment_reserve",
    "share buyback": "share_buyback",
    "buy-back of equity shares": "share_buyback",
    "transfer to general reserve": "transfer_to_reserves",
    "transfer to retained earnings": "transfer_to_reserves",
    "transfer from retained earnings": "transfer_to_reserves",
    "treasury shares acquired": "treasury_shares_movement",
    "balance at the end of the year": "_sce_closing",
    "closing balance": "_sce_closing",
}

# Context-dependent labels: items that map to different codes based on their section
CONTEXT_DEPENDENT_LABELS: dict[str, dict[str, str]] = {
    "borrowings": {
        "non_current": "long_term_borrowings",
        "current": "short_term_borrowings",
    },
    "investments": {
        "non_current": "financial_assets_investments_non_current",
        "current": "short_term_investments",
    },
    "investments in subsidiaries and joint venture": {
        "non_current": "financial_assets_investments_non_current",
        "current": "short_term_investments",
    },
    "loans": {
        "non_current": "financial_assets_loans_non_current",
        "current": "short_term_loans",
    },
    "other financial assets": {
        "non_current": "financial_assets_other_non_current",
        "current": "other_current_assets",
    },
    "lease liabilities": {
        "non_current": "lease_liabilities_non_current",
        "current": "other_current_liabilities",
    },
    "provisions": {
        "non_current": "long_term_provisions",
        "current": "short_term_provisions",
    },
    "contract liabilities": {
        "non_current": "contract_liabilities_non_current",
        "current": "contract_liabilities",
    },
}


# ===========================================================================
# 2. DATA STRUCTURES
# ===========================================================================


@dataclass
class LineValue:
    code: str
    value: Decimal
    raw_label: str = ""


@dataclass
class FiscalColumn:
    fiscal_year: int
    label: str


@dataclass
class ParsedStatement:
    statement_type: str  # balance_sheet | pnl | cashflow | change_in_equity
    fiscal_columns: list[FiscalColumn] = field(default_factory=list)
    data: dict[int, list[LineValue]] = field(default_factory=dict)
    validation_totals: dict[int, dict[str, Decimal]] = field(default_factory=dict)
    unmapped: list[str] = field(default_factory=list)
    source_file: str = ""


# ===========================================================================
# 3. HELPERS
# ===========================================================================


def normalise_label(raw: str) -> str:
    """Lower-case, strip note references, collapse whitespace."""
    s = raw.strip()
    # Remove trailing note refs like "(Refer note 23)" or "[Note 5]"
    s = re.sub(r"\s*[\(\[](refer\s+)?note\s*\d+[\)\]]", "", s, flags=re.I)
    # Remove trailing note number references like "3" or "5(A)" at end
    s = re.sub(r"\s+\d+(\([A-Z]\))?\s*$", "", s)
    # Remove leading letters/roman numerals like "i.", "ii.", "a.", "b."
    s = re.sub(r"^[ivxlcdm]+[\.\)]\s*", "", s, flags=re.I)
    s = re.sub(r"^[a-z][\.\)]\s*", "", s, flags=re.I)
    # Collapse whitespace, lowercase
    s = re.sub(r"\s+", " ", s).strip().lower()
    # Remove trailing colon or hash
    s = s.rstrip(":").rstrip("#").strip()
    # Remove trailing asterisks
    s = s.rstrip("*").strip()
    return s


def parse_number(raw: str | None) -> Decimal | None:
    """Parse a number from Indian-format PDF text. Parentheses = negative."""
    if raw is None:
        return None
    s = raw.strip()
    if not s or s == "-" or s == "\u2014" or s == "\u2013":
        return None
    negative = False
    if s.startswith("(") and s.endswith(")"):
        negative = True
        s = s[1:-1].strip()
    # Remove commas
    s = s.replace(",", "")
    # Handle trailing minus
    if s.endswith("-"):
        negative = True
        s = s[:-1].strip()
    # Handle leading minus
    if s.startswith("-"):
        negative = True
        s = s[1:].strip()
    if not s:
        return None
    try:
        val = Decimal(s)
    except InvalidOperation:
        return None
    return -val if negative else val


def fix_split_number(raw: str) -> str:
    """
    Fix numbers split by pdfplumber spacing issues.
    E.g. "2 14.27" -> "214.27", "7 ,150.90" -> "7,150.90",
    "1 78.26" -> "178.26", "(708.00)" stays as is.
    """
    # Pattern: digit(s) space digit(s).digit(s) at end of string
    # This fixes "2 14.27" -> "214.27"
    s = re.sub(r"(\d)\s+(\d)", r"\1\2", raw)
    # Also fix "7 ,150.90" -> "7,150.90"
    s = re.sub(r"(\d)\s+,", r"\1,", s)
    return s


def detect_fiscal_years(text: str) -> list[FiscalColumn]:
    """Extract fiscal year information from text."""
    cols = []
    # Pattern: "31 March 2025" or "March 31, 2025" or "As at 31 March 2025"
    for m in re.finditer(r"(?:3[01]\s+)?(?:march|mar)\s*(?:3[01]\s*,?\s*)?(20\d{2})", text, re.I):
        year = int(m.group(1))
        cols.append(FiscalColumn(fiscal_year=year, label=m.group(0)))
    if cols:
        return cols
    # Pattern: 2024-25 or 2023-2024
    for m in re.finditer(r"20(\d{2})\s*[-\u2013\u2014]\s*(\d{2,4})", text):
        y2_raw = m.group(2)
        y2 = 2000 + int(y2_raw) if len(y2_raw) == 2 else int(y2_raw)
        cols.append(FiscalColumn(fiscal_year=y2, label=m.group(0)))
    if cols:
        return cols
    # Plain year
    for m in re.finditer(r"(?:FY\s*)?(\b20\d{2}\b)", text, re.I):
        cols.append(FiscalColumn(fiscal_year=int(m.group(1)), label=m.group(0)))
    return cols


def classify_statement(text: str) -> str | None:
    """Classify statement type from header text."""
    t = text.lower()
    if "balance sheet" in t or "statement of financial position" in t:
        return "balance_sheet"
    if "profit and loss" in t or "profit & loss" in t or "statement of profit" in t or "income statement" in t:
        return "pnl"
    if "cash flow" in t or "cashflow" in t or "cash-flow" in t:
        return "cashflow"
    if "changes in equity" in t or "change in equity" in t or "statement of equity" in t:
        return "change_in_equity"
    return None


def detect_section_context(label: str) -> str:
    """Detect BS section from heading rows."""
    l = label.lower()
    if "non-current" in l or "non current" in l:
        if "assets" in l:
            return "non_current_assets"
        if "liabilities" in l or "liability" in l:
            return "non_current_liabilities"
        return "non_current"
    if "current" in l:
        if "assets" in l:
            return "current_assets"
        if "liabilities" in l or "liability" in l:
            return "current_liabilities"
        return "current"
    if "equity" in l and ("shareholders" in l or "share" in l or "total equity" not in l):
        return "equity"
    return ""


# ===========================================================================
# 4. TEXT-LINE PDF EXTRACTION
# ===========================================================================

# Regex to match one or two numbers (possibly negative/parenthesised) at end of line
# Handles: "Revenue from operations 24 30,628.30 31,037.78"
# Also: "Profit/(Loss) before tax 833.70 (708.00)"
NUM_PATTERN = re.compile(
    r"""
    (?P<num>
        \(?                     # optional opening paren
        -?                      # optional minus
        [\d,]+                  # digits with commas
        (?:\.\d+)?              # optional decimal
        \)?                     # optional closing paren
    )
    """,
    re.VERBOSE,
)


def extract_line_numbers(line: str, expected_count: int) -> tuple[str, list[str]]:
    """
    Split a text line into label and number tokens.
    Returns (label, [num1, num2, ...]).
    Numbers are extracted from right to left.
    """
    # Find all number-like tokens in the line
    tokens = []
    # Split by whitespace and find number-like tokens from the right
    parts = line.split()
    label_parts = []
    num_parts = []
    # Scan from right to left collecting numbers
    i = len(parts) - 1
    while i >= 0 and len(num_parts) < expected_count:
        part = parts[i]
        # Try to parse as number (possibly with leading/trailing parens)
        cleaned = fix_split_number(part)
        if parse_number(cleaned) is not None:
            num_parts.insert(0, cleaned)
            i -= 1
            continue
        # Check if this is part of a split number: "2" "14.27" or "7" ",150.90"
        if i > 0 and re.match(r"^\d+$", parts[i - 1]) and re.match(r"^[,.]?\d", part):
            combined = parts[i - 1] + part
            combined = fix_split_number(combined)
            if parse_number(combined) is not None:
                num_parts.insert(0, combined)
                i -= 2
                continue
        # Check for parenthesised number split: "(" "708.00" ")"
        if part == ")" and i >= 2 and parts[i - 2] == "(":
            inner = fix_split_number(parts[i - 1])
            combined = f"({inner})"
            if parse_number(combined) is not None:
                num_parts.insert(0, combined)
                i -= 3
                continue
        # Not a number, stop scanning
        break

    label_parts = parts[:i + 1]

    # Also handle the case where a note number is between label and values
    # e.g. "Revenue from operations 24 30,628.30 31,037.78"
    # The "24" is a note ref, not a value
    if len(num_parts) > expected_count:
        # Extra numbers are likely note references; drop from left
        num_parts = num_parts[-expected_count:]

    label = " ".join(label_parts)
    return label, num_parts


def is_scanned_page(page) -> bool:
    """Check if a page is scanned (image-only)."""
    text = page.extract_text() or ""
    return len(text.strip()) < 30


def _ocr_page_text(pdf_path: str, page_num: int) -> str:
    """OCR a single page to text using pdftoppm + pytesseract."""
    try:
        import pytesseract
        from PIL import Image
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            subprocess.run(
                ["pdftoppm", "-f", str(page_num), "-l", str(page_num),
                 "-r", "300", "-png", pdf_path, f"{tmpdir}/page"],
                check=True, capture_output=True,
            )
            images = sorted(Path(tmpdir).glob("page*.png"))
            if not images:
                return ""
            img = Image.open(images[0])
            return pytesseract.image_to_string(img) or ""
    except Exception as e:
        log.warning(f"  OCR failed for page {page_num}: {e}")
        return ""


def extract_pages_text(pdf_path: str) -> list[tuple[int, str]]:
    """Extract text from each page. Returns [(page_num, text), ...]."""
    results = []
    try:
        pdf = pdfplumber.open(pdf_path)
    except Exception as e:
        log.error(f"Failed to open {pdf_path}: {e}")
        return results

    for i, page in enumerate(pdf.pages):
        page_num = i + 1
        if is_scanned_page(page):
            log.info(f"  Page {page_num}: scanned, attempting OCR...")
            text = _ocr_page_text(pdf_path, page_num)
        else:
            text = page.extract_text() or ""
        if text.strip():
            results.append((page_num, text))
    pdf.close()
    return results


# ===========================================================================
# 5. STATEMENT PARSING (from text lines)
# ===========================================================================


def _segment_pages_by_statement(
    pages: list[tuple[int, str]],
) -> list[tuple[str, list[FiscalColumn], list[str], int]]:
    """
    Group consecutive pages by statement type.
    Returns [(stmt_type, fiscal_cols, all_lines, first_page), ...]
    """
    segments: list[tuple[str, list[FiscalColumn], list[str], int]] = []

    for page_num, text in pages:
        lines = text.split("\n")
        # Classify from first ~10 lines
        header_block = "\n".join(lines[:10])
        stmt_type = classify_statement(header_block)
        if not stmt_type:
            # Try harder -- look at all lines
            stmt_type = classify_statement(text)
        if not stmt_type:
            log.debug(f"  Page {page_num}: could not classify, skipping")
            continue

        fiscal_cols = detect_fiscal_years(header_block)
        if not fiscal_cols:
            fiscal_cols = detect_fiscal_years("\n".join(lines[:15]))
        if not fiscal_cols:
            log.debug(f"  Page {page_num}: no fiscal years found, skipping")
            continue

        # Check if this is a continuation of the previous segment
        if segments:
            prev_type, prev_cols, prev_lines, prev_page = segments[-1]
            prev_years = [c.fiscal_year for c in prev_cols]
            curr_years = [c.fiscal_year for c in fiscal_cols]
            if prev_type == stmt_type and prev_years == curr_years:
                # Continuation -- extend
                segments[-1] = (prev_type, prev_cols, prev_lines + lines, prev_page)
                continue

        segments.append((stmt_type, fiscal_cols, lines, page_num))

    return segments


def parse_statement_from_lines(
    stmt_type: str,
    fiscal_cols: list[FiscalColumn],
    lines: list[str],
    source_file: str = "",
) -> ParsedStatement:
    """Parse a financial statement from text lines."""
    stmt = ParsedStatement(
        statement_type=stmt_type,
        fiscal_columns=fiscal_cols,
        source_file=source_file,
    )
    num_years = len(fiscal_cols)
    for fc in fiscal_cols:
        stmt.data[fc.fiscal_year] = []
        stmt.validation_totals[fc.fiscal_year] = {}

    current_section = ""  # For BS context-dependent items
    skip_until_next_section = False

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Skip boilerplate lines
        if any(kw in line.lower() for kw in [
            "all amounts are in", "unless otherwise stated",
            "particulars", "notes", "as per our report",
            "chartered accountants", "firm registration",
            "membership no", "din:", "place :", "date :",
            "the accompanying notes", "basis of preparation",
            "significant accounting policies",
        ]):
            continue

        # Skip signature garbage (garbled text from digital signatures)
        if re.match(r"^[A-Z\s]{5,}\d", line):
            continue

        # Detect section headings
        section = detect_section_context(line)
        if section:
            current_section = section

        # Extract label and numbers
        label_raw, num_strs = extract_line_numbers(line, num_years)
        if not label_raw:
            continue

        # Skip lines with no numbers at all
        if not num_strs:
            continue

        # Normalise label
        label_norm = normalise_label(label_raw)
        if not label_norm:
            continue

        # Skip pure section headers or sub-headers
        if label_norm in (
            "assets", "liabilities", "equity and liabilities",
            "equity", "income", "expenses", "adjustments for",
            "adjustments for :", "working capital changes",
            "adjustments for working capital changes",
            "financial assets", "financial liabilities",
            "non-current assets", "current assets",
            "non-current liabilities", "current liabilities",
            "cash flows from operating activities",
            "cash flows from investing activities",
            "cash flows from financing activities",
            "operating activities", "investing activities",
            "financing activities", "tax expense/(credit)",
            "other comprehensive income",
            "items that will not be reclassified subsequently to profit or loss",
            "items that will be reclassified subsequently to profit or loss",
            "earnings / (loss) per equity share (face value of re. 1 each)",
            "(restated)",
        ):
            continue

        # Resolve section context key
        section_key = ""
        if "non_current" in current_section:
            section_key = "non_current"
        elif "current" in current_section:
            section_key = "current"

        # Map label to code
        code = None

        # Check context-dependent labels first
        if label_norm in CONTEXT_DEPENDENT_LABELS:
            ctx_map = CONTEXT_DEPENDENT_LABELS[label_norm]
            code = ctx_map.get(section_key, list(ctx_map.values())[0])

        # Then check flat dictionary
        if not code:
            code = LABEL_TO_CODE.get(label_norm)

        # Fuzzy fallback: try removing note-like suffixes more aggressively
        if not code:
            # Remove trailing "(A)", "(B)", "(net)" etc.
            cleaned = re.sub(r"\s*\([a-z0-9+]+\)\s*$", "", label_norm, flags=re.I).strip()
            if cleaned != label_norm:
                code = LABEL_TO_CODE.get(cleaned)
                if not code and cleaned in CONTEXT_DEPENDENT_LABELS:
                    ctx_map = CONTEXT_DEPENDENT_LABELS[cleaned]
                    code = ctx_map.get(section_key, list(ctx_map.values())[0])

        if not code:
            # Only report as unmapped if line had plausible values
            if any(parse_number(n) is not None for n in num_strs):
                stmt.unmapped.append(label_raw.strip())
            continue

        # Parse and store values
        # Pad num_strs to num_years (from left with None)
        while len(num_strs) < num_years:
            num_strs.insert(0, "-")

        for idx, fc in enumerate(fiscal_cols):
            val = parse_number(num_strs[idx]) if idx < len(num_strs) else None
            if val is None:
                continue

            if code.startswith("_"):
                # Validation/reference total
                stmt.validation_totals[fc.fiscal_year][code] = val
            else:
                stmt.data[fc.fiscal_year].append(LineValue(
                    code=code, value=val, raw_label=label_raw.strip(),
                ))

    return stmt


def parse_pdf_file(pdf_path: str) -> list[ParsedStatement]:
    """Parse all financial statements from a single PDF file."""
    pages = extract_pages_text(pdf_path)
    if not pages:
        return []

    segments = _segment_pages_by_statement(pages)
    statements = []
    for stmt_type, fiscal_cols, lines, page_num in segments:
        log.info(f"  Page {page_num}: {stmt_type} for years {[c.fiscal_year for c in fiscal_cols]}")
        stmt = parse_statement_from_lines(stmt_type, fiscal_cols, lines, Path(pdf_path).name)
        items = sum(len(v) for v in stmt.data.values())
        if items > 0:
            statements.append(stmt)
            log.info(f"    -> {items} line items, {len(stmt.unmapped)} unmapped")
        else:
            log.info(f"    -> 0 line items extracted ({len(stmt.unmapped)} unmapped)")

    return statements


# ===========================================================================
# 6. SIGN CONVENTION
# ===========================================================================

NATURAL_SIGN_CODES = {
    "changes_in_inventory",
    "deferred_tax_expense",
    "foreign_exchange_gain",
}

CF_OUTFLOW_CODES = {
    "purchase_of_property_plant_equipment",
    "purchase_of_intangible_assets",
    "purchase_of_investments",
    "loans_given",
    "income_tax_paid",
    "interest_paid",
    "dividends_paid",
    "lease_payments",
    "repayment_of_borrowings",
}


def apply_sign_conventions(statements: list[ParsedStatement]) -> None:
    """Apply sign conventions in-place."""
    for stmt in statements:
        for year, values in stmt.data.items():
            for lv in values:
                if stmt.statement_type == "balance_sheet":
                    lv.value = abs(lv.value)
                elif stmt.statement_type == "pnl":
                    if lv.code not in NATURAL_SIGN_CODES:
                        lv.value = abs(lv.value)
                elif stmt.statement_type == "cashflow":
                    if lv.code in CF_OUTFLOW_CODES:
                        lv.value = -abs(lv.value)
                elif stmt.statement_type == "change_in_equity":
                    if lv.code == "opening_equity":
                        lv.value = abs(lv.value)


# ===========================================================================
# 7. VALIDATION
# ===========================================================================


def validate_statements(statements: list[ParsedStatement]) -> list[str]:
    """Run cross-checks. Returns list of warning strings."""
    warnings = []

    for stmt in statements:
        for year in stmt.data:
            totals = stmt.validation_totals.get(year, {})
            values_by_code: dict[str, Decimal] = {}
            for lv in stmt.data[year]:
                values_by_code[lv.code] = values_by_code.get(lv.code, Decimal(0)) + lv.value

            if stmt.statement_type == "balance_sheet":
                reported_assets = totals.get("_total_assets")
                reported_eq_liab = totals.get("_total_equity_liabilities")
                if reported_assets and reported_eq_liab:
                    diff = abs(reported_assets - reported_eq_liab)
                    if diff > 1:
                        warnings.append(
                            f"BS {year}: Total Assets ({reported_assets}) != Equity+Liabilities ({reported_eq_liab}), diff={diff}"
                        )
                    else:
                        log.info(f"  BS {year}: Assets = Equity+Liabilities PASSED (both {reported_assets})")

            elif stmt.statement_type == "pnl":
                pbt = totals.get("_pbt")
                pat = totals.get("_pat")
                total_tax = totals.get("_total_tax")
                if pbt and pat and total_tax:
                    computed_pat = pbt - total_tax
                    diff = abs(computed_pat - pat)
                    if diff > 1:
                        warnings.append(
                            f"P&L {year}: PBT ({pbt}) - Tax ({total_tax}) = {computed_pat} != PAT ({pat}), diff={diff}"
                        )
                    else:
                        log.info(f"  P&L {year}: PBT - Tax = PAT PASSED")

            elif stmt.statement_type == "cashflow":
                cfo = values_by_code.get("net_cash_from_operating_activities")
                cfi = values_by_code.get("net_cash_from_investing_activities")
                cff = values_by_code.get("net_cash_from_financing_activities")
                cash_begin = values_by_code.get("cash_at_beginning_of_period")
                cash_end = values_by_code.get("cash_at_end_of_period")
                fx = values_by_code.get("effect_of_exchange_rate_on_cash", Decimal(0))
                if all(v is not None for v in [cfo, cfi, cff, cash_begin, cash_end]):
                    computed_end = cash_begin + cfo + cfi + cff + fx
                    diff = abs(computed_end - cash_end)
                    if diff > 1:
                        warnings.append(
                            f"CF {year}: Begin ({cash_begin}) + CFO ({cfo}) + CFI ({cfi}) + CFF ({cff}) = {computed_end} != End ({cash_end}), diff={diff}"
                        )
                    else:
                        log.info(f"  CF {year}: Cash reconciliation PASSED")

    return warnings


# ===========================================================================
# 8. OUTPUT: MARKDOWN
# ===========================================================================


def statements_to_markdown(statements: list[ParsedStatement], company_name: str) -> str:
    """Generate human-readable markdown tables."""
    lines = [f"# Financial Statements: {company_name}", ""]

    for stmt in statements:
        title = {
            "balance_sheet": "Balance Sheet",
            "pnl": "Profit & Loss Statement",
            "cashflow": "Cash Flow Statement",
            "change_in_equity": "Statement of Changes in Equity",
        }.get(stmt.statement_type, stmt.statement_type)

        years = sorted(stmt.data.keys())
        if not years:
            continue
        items_count = sum(len(v) for v in stmt.data.values())
        if items_count == 0:
            continue

        lines.append(f"## {title} ({stmt.source_file})")
        lines.append("")

        header = "| Line Item | Code | " + " | ".join(f"FY {y}" for y in years) + " |"
        sep = "|" + "---|" * (2 + len(years))
        lines.append(header)
        lines.append(sep)

        # Collect codes in order of appearance
        seen_codes: list[str] = []
        for y in years:
            for lv in stmt.data[y]:
                if lv.code not in seen_codes:
                    seen_codes.append(lv.code)

        for code in seen_codes:
            raw_label = ""
            for y in years:
                for lv in stmt.data[y]:
                    if lv.code == code:
                        raw_label = lv.raw_label
                        break
                if raw_label:
                    break
            vals = []
            for y in years:
                v = None
                for lv in stmt.data[y]:
                    if lv.code == code:
                        v = lv.value
                        break
                vals.append(f"{v:,.2f}" if v is not None else "-")
            row = f"| {raw_label[:60]} | `{code}` | " + " | ".join(vals) + " |"
            lines.append(row)

        lines.append("")

        if stmt.unmapped:
            lines.append(f"### Unmapped Labels ({len(stmt.unmapped)})")
            for u in sorted(set(stmt.unmapped)):
                lines.append(f"- {u}")
            lines.append("")

    return "\n".join(lines)


# ===========================================================================
# 9. OUTPUT: CALCULA JSON
# ===========================================================================


def statements_to_import_json(
    statements: list[ParsedStatement],
    isin: str,
    company_name: str,
    scale: str = "crores",
) -> dict:
    """Build the Calcula import API payload."""
    # Merge all statement data by fiscal year
    year_values: dict[int, dict[str, Decimal]] = {}
    for stmt in statements:
        for year, values in stmt.data.items():
            if year not in year_values:
                year_values[year] = {}
            for lv in values:
                # Later statements can override (e.g. CF overrides P&L for interest)
                year_values[year][lv.code] = lv.value

    periods = []
    for year in sorted(year_values):
        vals = []
        for code, value in year_values[year].items():
            vals.append({
                "lineItemCode": code,
                "value": str(value),
                "valueSource": "manual",
            })
        periods.append({
            "fiscalYear": year,
            "scale": scale,
            "currency": "INR",
            "periodStart": f"{year - 1}-04-01T00:00:00.000Z",
            "periodEnd": f"{year}-03-31T00:00:00.000Z",
            "isAudited": True,
            "values": vals,
        })

    return {
        "company": {
            "isin": isin,
            "name": company_name,
            "defaultScale": scale,
            "defaultCurrency": "INR",
            "country": "IN",
            "listingStatus": "unlisted",
        },
        "financialPeriods": periods,
    }


# ===========================================================================
# 10. UPLOAD
# ===========================================================================


def generate_jwt(secret: str = "change-me") -> str:
    """Generate a JWT token for the import API."""
    import jwt
    import time

    payload = {
        "sub": "cli-import",
        "username": "admin",
        "role": "ADMIN",
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def upload_to_calcula(
    payload: dict,
    base_url: str = "http://localhost:4100",
    secret: str = "change-me",
) -> dict:
    """POST the import payload to Calcula."""
    import requests

    token = generate_jwt(secret)
    url = f"{base_url}/api/companies/import"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    log.info(f"Uploading to {url} ...")
    resp = requests.post(url, json=payload, headers=headers, timeout=120)

    if resp.status_code >= 400:
        log.error(f"Upload failed: HTTP {resp.status_code}")
        log.error(resp.text[:500])
        resp.raise_for_status()

    result = resp.json()
    log.info(f"Upload succeeded: {json.dumps(result, indent=2)}")
    return result


def trigger_recalc(
    company_id: str,
    fiscal_years: list[int],
    base_url: str = "http://localhost:4100",
    secret: str = "change-me",
) -> None:
    """Trigger metric recalculation by upserting a metric via GraphQL."""
    import requests

    token = generate_jwt(secret)
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    mutation = """
    mutation UpsertMetric($input: UpsertFinancialMetricInput!) {
        upsertFinancialMetric(input: $input) {
            id
        }
    }
    """

    for year in fiscal_years:
        variables = {
            "input": {
                "companyId": company_id,
                "fiscalYear": year,
                "lineItemCode": "revenue_from_operations",
                "value": "0",
                "valueSource": "derived",
            }
        }
        try:
            resp = requests.post(
                f"{base_url}/graphql",
                json={"query": mutation, "variables": variables},
                headers=headers,
                timeout=30,
            )
            if resp.status_code == 200:
                log.info(f"  Recalc triggered for FY {year}")
            else:
                log.warning(f"  Recalc trigger FY {year}: HTTP {resp.status_code}")
        except Exception as e:
            log.warning(f"  Recalc trigger FY {year} failed: {e}")


# ===========================================================================
# 11. CLI
# ===========================================================================


def main():
    parser = argparse.ArgumentParser(
        description="PDF-to-Calcula Financial Import Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
            Examples:
              python3.14 cli.py --dir ./pdfs/ --isin INE03AV01027 --name "boAt Lifestyle"
              python3.14 cli.py --dir ./pdfs/ --isin INE03AV01027 --name "boAt" --upload
              python3.14 cli.py --dir ./pdfs/ --isin INE03AV01027 --name "boAt" --upload --force
        """),
    )
    parser.add_argument("--dir", required=True, help="Directory containing PDF files")
    parser.add_argument("--isin", required=True, help="Company ISIN code")
    parser.add_argument("--name", required=True, help="Company name")
    parser.add_argument("--scale", default="crores", choices=["crores", "lakhs", "thousands", "millions", "actuals"],
                        help="Scale of values (default: crores)")
    parser.add_argument("--upload", action="store_true", help="Upload to Calcula API")
    parser.add_argument("--force", action="store_true", help="Force upload even with validation warnings")
    parser.add_argument("--base-url", default="http://localhost:4100", help="Calcula API base URL")
    parser.add_argument("--jwt-secret", default="change-me", help="JWT signing secret")
    parser.add_argument("--output-dir", default=None, help="Output directory (default: same as --dir)")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose logging")

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    pdf_dir = Path(args.dir)
    if not pdf_dir.is_dir():
        log.error(f"Directory not found: {pdf_dir}")
        sys.exit(1)

    output_dir = Path(args.output_dir) if args.output_dir else pdf_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    # Find PDFs
    pdf_files = sorted(pdf_dir.glob("*.pdf"))
    if not pdf_files:
        log.error(f"No PDF files found in {pdf_dir}")
        sys.exit(1)

    log.info(f"Found {len(pdf_files)} PDF file(s) in {pdf_dir}")

    # Step 1: Extract and parse
    all_statements: list[ParsedStatement] = []
    for pdf_file in pdf_files:
        log.info(f"Processing: {pdf_file.name}")
        stmts = parse_pdf_file(str(pdf_file))
        all_statements.extend(stmts)

    if not all_statements:
        log.error("No financial statements extracted. Check PDFs.")
        sys.exit(1)

    # Step 2: Sign conventions
    log.info("Applying sign conventions...")
    apply_sign_conventions(all_statements)

    # Step 3: Validate
    log.info("Running validation checks...")
    warnings = validate_statements(all_statements)
    if warnings:
        log.warning(f"Validation: {len(warnings)} warning(s):")
        for w in warnings:
            log.warning(f"  {w}")
    else:
        log.info("All validation checks passed.")

    # Step 4: Generate outputs
    md = statements_to_markdown(all_statements, args.name)
    md_path = output_dir / f"{args.isin}_financials.md"
    md_path.write_text(md, encoding="utf-8")
    log.info(f"Markdown: {md_path}")

    payload = statements_to_import_json(all_statements, args.isin, args.name, args.scale)
    json_path = output_dir / f"{args.isin}_import.json"
    json_path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    log.info(f"JSON: {json_path}")

    # Summary
    total_items = sum(len(p["values"]) for p in payload["financialPeriods"])
    all_unmapped = []
    for s in all_statements:
        all_unmapped.extend(s.unmapped)
    unique_unmapped = sorted(set(all_unmapped))

    print("\n" + "=" * 72)
    print(f"  IMPORT SUMMARY: {args.name} ({args.isin})")
    print("=" * 72)
    print(f"  Statements parsed  : {len(all_statements)}")
    print(f"  Fiscal periods     : {len(payload['financialPeriods'])}")
    print(f"  Total line items   : {total_items}")
    print(f"  Unmapped labels    : {len(unique_unmapped)}")
    if unique_unmapped:
        print(f"\n  Unmapped labels (showing up to 30):")
        for u in unique_unmapped[:30]:
            print(f"    - {u}")
        if len(unique_unmapped) > 30:
            print(f"    ... and {len(unique_unmapped) - 30} more")
    print(f"\n  Validation warnings: {len(warnings)}")
    for w in warnings:
        print(f"    - {w}")
    print(f"\n  Output files:")
    print(f"    Markdown : {md_path}")
    print(f"    JSON     : {json_path}")
    print("=" * 72)

    # Step 5: Upload
    if args.upload:
        if warnings and not args.force:
            log.error("Upload aborted due to validation warnings. Use --force to override.")
            sys.exit(1)
        try:
            result = upload_to_calcula(payload, args.base_url, args.jwt_secret)
            company_id = result.get("companyId")
            if company_id:
                years = sorted(set(p["fiscalYear"] for p in payload["financialPeriods"]))
                log.info("Triggering recalculation...")
                trigger_recalc(company_id, years, args.base_url, args.jwt_secret)
            print(f"\n  Upload result: {json.dumps(result, indent=2)}")
        except Exception as e:
            log.error(f"Upload failed: {e}")
            sys.exit(1)
    else:
        print("\n  To upload, re-run with --upload flag.")

    print()


if __name__ == "__main__":
    main()
