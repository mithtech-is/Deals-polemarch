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

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("pdf-import")

# ===========================================================================
# LABEL-TO-CODE DICTIONARY
# ===========================================================================

LABEL_TO_CODE: dict[str, str] = {
    # -- P&L: Revenue --
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
    # -- P&L: Expenses --
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
    # -- P&L: Tax --
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
    # -- P&L: Validation totals --
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
    "other comprehensive income for the year, net of tax": "_oci",
    "other comprehensive income for the year, net of tax (b)": "_oci",
    "basic (rs.)": "_eps_basic",
    "basic earnings per share": "_eps_basic",
    "diluted (rs.)": "_eps_diluted",
    "diluted earnings per share": "_eps_diluted",
    # -- BS: Non-current Assets --
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
    # -- BS: Current Assets --
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
    # -- BS: Equity --
    "equity share capital": "equity_share_capital",
    "share capital": "equity_share_capital",
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
    "other comprehensive income reserve": "other_comprehensive_income_reserve",
    "treasury shares": "treasury_shares",
    "instruments entirely equity in nature": "other_equity",
    "money received against share warrants": "other_equity",
    # -- BS: Non-current Liabilities --
    "deferred tax liabilities (net)": "deferred_tax_liabilities",
    "deferred tax liabilities": "deferred_tax_liabilities",
    "other non-current liabilities": "other_non_current_liabilities",
    "employee benefit obligations": "employee_benefit_obligations",
    # -- BS: Current Liabilities --
    "trade payables": "trade_payables_other",
    "sundry creditors": "trade_payables_other",
    "total outstanding dues of micro enterprises and small enterprises": "trade_payables_micro_small",
    "total outstanding dues of creditors other than micro enterprises and small enterprises": "trade_payables_other",
    "total outstanding dues of creditors other than micro enterprises and": "trade_payables_other",
    "other current liabilities": "other_current_liabilities",
    "other financial liabilities": "other_current_liabilities",
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
    "current portion of long-term debt": "current_portion_long_term_debt",
    "current maturities of long-term borrowings": "current_portion_long_term_debt",
    "current maturities of long term borrowings": "current_portion_long_term_debt",
    # -- BS: Validation totals --
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
    # -- Cash Flow: Adjustments --
    "loss/(gain) on disposal of property, plant and equipment": "gain_loss_on_asset_sale",
    "profit/(loss) on sale of property, plant and equipment": "gain_loss_on_asset_sale",
    "(profit)/loss on sale of property, plant and equipment": "gain_loss_on_asset_sale",
    "loss on sale/disposal of tangible and intangible assets (net)": "gain_loss_on_asset_sale",
    "(profit)/loss on sale of investments": "gain_loss_on_investment_sale",
    "profit/(loss) on sale of investments": "gain_loss_on_investment_sale",
    "unrealised foreign exchange loss/(gain)": "foreign_exchange_adjustment",
    "unrealised foreign exchange (gain)/loss": "foreign_exchange_adjustment",
    "unrealised foreign exchange loss/(gain) (net)": "foreign_exchange_adjustment",
    "provision for loss allowance for trade receivables": "impairment_adjustment",
    "provision/(reversal) for loss allowance for trade receivables": "impairment_adjustment",
    "provision for doubtful advances": "impairment_adjustment",
    "provision/(reversal) for slow and non moving inventory (net)": "operating_activities_others",
    "provision for loss allowance for investments and loan": "impairment_adjustment",
    "fair value loss on account of changes in financial liabilities": "operating_activities_others",
    "gain on derecognition of leases": "operating_activities_others",
    "fair valuation (gain) from investments designated at fvtpl(net)": "gain_loss_on_investment_sale",
    "loss on derivative contracts": "operating_activities_others",
    # -- CF: Working capital --
    "(increase)/decrease in trade receivables": "change_in_trade_receivables",
    "decrease/(increase) in trade receivables": "change_in_trade_receivables",
    "(increase)/decrease in inventories": "change_in_inventories",
    "decrease/(increase) in inventories": "change_in_inventories",
    "(increase)/decrease in other current assets": "change_in_other_current_assets",
    "decrease/(increase) in other current assets": "change_in_other_current_assets",
    "decrease in other current assets": "change_in_other_current_assets",
    "increase/(decrease) in trade payables": "change_in_trade_payables",
    "increase/(decrease) in other current liabilities": "change_in_other_current_liabilities",
    "increase in other current liabilities": "change_in_other_current_liabilities",
    "decrease/(increase) in loans": "change_in_other_current_assets",
    "decrease in other financial assets": "change_in_other_current_assets",
    "increase in other financial liabilities": "change_in_other_current_liabilities",
    "increase in current and non-current provisions": "change_in_other_current_liabilities",
    # -- CF: Operating --
    "income taxes paid (net)": "income_tax_paid",
    "income tax paid": "income_tax_paid",
    "taxes paid": "income_tax_paid",
    "taxes paid (net of refunds)": "income_tax_paid",
    "net cash generated from operating activities": "net_cash_from_operating_activities",
    "net cash from operating activities": "net_cash_from_operating_activities",
    "net cash flows generated from operating activities": "net_cash_from_operating_activities",
    "net cash flows generated from operating activities (a)": "net_cash_from_operating_activities",
    "net cash generated from/(used in) operating activities": "net_cash_from_operating_activities",
    # -- CF: Investing --
    "purchase of property, plant and equipment": "purchase_of_property_plant_equipment",
    "acquisition of property, plant & equipments": "purchase_of_property_plant_equipment",
    "acquisition of property, plant and equipment": "purchase_of_property_plant_equipment",
    "purchase of intangible assets": "purchase_of_intangible_assets",
    "acquisition of intangible assets including expenditure on internally generated intangible assets": "purchase_of_intangible_assets",
    "purchase of investments": "purchase_of_investments",
    "investment in subsidiaries": "purchase_of_investments",
    "investment made in equity shares of subsidiaries and joint venture": "purchase_of_investments",
    "(investment) in/redemption of mutual funds (net)": "purchase_of_investments",
    "proceeds from sale of property, plant and equipment": "sale_of_property_plant_equipment",
    "proceeds from sale of property, plant & equipments": "sale_of_property_plant_equipment",
    "proceeds from sale of investments": "sale_of_investments",
    "interest received": "interest_received",
    "interest on fixed deposits from banks": "interest_received",
    "interest on fixed deposits and others": "interest_received",
    "interest income from others": "interest_received",
    "interest on security deposits": "interest_received",
    "dividend received": "dividend_received",
    "dividend received from joint venture": "dividend_received",
    "loans given": "loans_given",
    "loan given to subsidiaries": "loans_given",
    "investment in fixed deposits": "investing_activities_others",
    "investment in fixed deposits*": "investing_activities_others",
    "redemption of fixed deposits": "investing_activities_others",
    "redemption of fixed deposits*": "investing_activities_others",
    "net cash used in investing activities": "net_cash_from_investing_activities",
    "net cash from investing activities": "net_cash_from_investing_activities",
    "net cash flows used in investing activities": "net_cash_from_investing_activities",
    "net cash flows used in investing activities (b)": "net_cash_from_investing_activities",
    "net cash generated from/(used in) investing activities": "net_cash_from_investing_activities",
    # -- CF: Financing --
    "proceeds from borrowings": "proceeds_from_borrowings",
    "proceeds from long-term borrowings": "proceeds_from_borrowings",
    "repayment of borrowings": "repayment_of_borrowings",
    "repayment of short-term borrowings (net)": "repayment_of_borrowings",
    "proceeds from issue of equity shares": "proceeds_from_equity_issue",
    "proceeds from issue of equity shares, including securities premium": "proceeds_from_equity_issue",
    "dividends paid": "dividends_paid",
    "dividend paid": "dividends_paid",
    "interest paid": "interest_paid",
    "interest and other finance charges paid": "interest_paid",
    "principal repayment of lease liabilities": "lease_payments",
    "interest repayment of lease liabilities": "interest_paid",
    "net cash used in financing activities": "net_cash_from_financing_activities",
    "net cash from financing activities": "net_cash_from_financing_activities",
    "net cash flows used in financing activities": "net_cash_from_financing_activities",
    "net cash flows used in financing activities (c)": "net_cash_from_financing_activities",
    "net cash generated from/(used in) financing activities": "net_cash_from_financing_activities",
    # -- CF: Reconciliation --
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
    # -- SCE --
    "balance at the beginning of the year": "opening_equity",
    "opening balance": "opening_equity",
    "dividends": "dividends_declared_equity",
    "dividends declared": "dividends_declared_equity",
    "issue of share capital": "share_capital_issued",
    "share-based payment": "share_based_payment_reserve",
    "share buyback": "share_buyback",
    "transfer to general reserve": "transfer_to_reserves",
}

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
# DATA STRUCTURES
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
    statement_type: str
    fiscal_columns: list[FiscalColumn] = field(default_factory=list)
    data: dict[int, list[LineValue]] = field(default_factory=dict)
    validation_totals: dict[int, dict[str, Decimal]] = field(default_factory=dict)
    unmapped: list[str] = field(default_factory=list)
    source_file: str = ""

# ===========================================================================
# HELPERS
# ===========================================================================

def normalise_label(raw: str) -> str:
    s = raw.strip()
    s = re.sub(r"\s*[\(\[](refer\s+)?note\s*\d+[\)\]]", "", s, flags=re.I)
    s = re.sub(r"\s+\d+(\([A-Z]\))?\s*$", "", s)
    s = re.sub(r"^[ivxlcdm]+[\.\)]\s*", "", s, flags=re.I)
    s = re.sub(r"^[a-z][\.\)]\s*", "", s, flags=re.I)
    s = re.sub(r"\s+", " ", s).strip().lower()
    s = s.rstrip(":").rstrip("#").strip()
    s = s.rstrip("*").strip()
    return s

def parse_number(raw: str | None) -> Decimal | None:
    if raw is None:
        return None
    s = raw.strip()
    if not s or s in ("-", "\u2014", "\u2013"):
        return None
    negative = False
    if s.startswith("(") and s.endswith(")"):
        negative = True
        s = s[1:-1].strip()
    s = s.replace(",", "")
    if s.endswith("-"):
        negative = True
        s = s[:-1].strip()
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
    s = re.sub(r"(\d)\s+(\d)", r"\1\2", raw)
    s = re.sub(r"(\d)\s+,", r"\1,", s)
    return s

def detect_fiscal_years(text: str) -> list[FiscalColumn]:
    cols = []
    for m in re.finditer(r"(?:3[01]\s+)?(?:march|mar)\s*(?:3[01]\s*,?\s*)?(20\d{2})", text, re.I):
        year = int(m.group(1))
        cols.append(FiscalColumn(fiscal_year=year, label=m.group(0)))
    if cols:
        return cols
    for m in re.finditer(r"20(\d{2})\s*[-\u2013\u2014]\s*(\d{2,4})", text):
        y2_raw = m.group(2)
        y2 = 2000 + int(y2_raw) if len(y2_raw) == 2 else int(y2_raw)
        cols.append(FiscalColumn(fiscal_year=y2, label=m.group(0)))
    if cols:
        return cols
    for m in re.finditer(r"(?:FY\s*)?(\b20\d{2}\b)", text, re.I):
        cols.append(FiscalColumn(fiscal_year=int(m.group(1)), label=m.group(0)))
    return cols

def classify_statement(text: str) -> str | None:
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
    if "equity" in l and ("shareholders" in l or "share" in l):
        return "equity"
    return ""

# ===========================================================================
# PDF EXTRACTION (text-line based)
# ===========================================================================

@dataclass
class PageLine:
    label: str
    values: list[str]  # one string per value column, spaces already removed

def is_scanned_page(page) -> bool:
    text = page.extract_text() or ""
    return len(text.strip()) < 30

def _ocr_page_text(pdf_path: str, page_num: int) -> str:
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

def _detect_value_columns(words: list[dict], page_width: float) -> list[tuple[float, float]]:
    """Auto-detect x-ranges of value columns by clustering number words."""
    from collections import defaultdict
    mid = page_width * 0.45
    # Collect x1 positions of number-like words in right portion
    num_x1: list[float] = []
    for w in words:
        if w["x0"] < mid:
            continue
        txt = w["text"].strip().replace(" ", "")
        if re.match(r"^[\(\-]?[\d,]+(?:\.\d+)?\)?$", txt) or txt in ("-", "\u2014", "\u2013"):
            num_x1.append(w["x1"])
    if not num_x1:
        return []
    num_x1.sort()
    clusters: list[list[float]] = []
    for x in num_x1:
        if clusters and abs(x - clusters[-1][-1]) < 25:
            clusters[-1].append(x)
        else:
            clusters.append([x])
    good = [c for c in clusters if len(c) >= 3]
    if not good:
        good = clusters[:2]
    cols = []
    for cluster in good:
        x1_avg = sum(cluster) / len(cluster)
        cols.append((x1_avg - 90, x1_avg + 10))
    cols.sort(key=lambda c: c[0])
    return cols

def _extract_page_structured(page) -> tuple[str, list[PageLine]]:
    """Extract structured lines using word positions to separate columns."""
    full_text = page.extract_text() or ""
    words = page.extract_words(keep_blank_chars=True, x_tolerance=2)
    if not words:
        return full_text, []

    value_cols = _detect_value_columns(words, page.width)
    if not value_cols:
        return full_text, []
    num_vc = len(value_cols)
    label_x_end = value_cols[0][0]

    from collections import defaultdict
    lines_by_y: dict[int, list[dict]] = defaultdict(list)
    for w in words:
        y_key = round(w["top"] / 4) * 4
        lines_by_y[y_key].append(w)

    page_lines: list[PageLine] = []
    for y_key in sorted(lines_by_y.keys()):
        ws = sorted(lines_by_y[y_key], key=lambda w: w["x0"])
        label_parts: list[str] = []
        col_vals: list[str] = [""] * num_vc
        for w in ws:
            x_mid = (w["x0"] + w["x1"]) / 2
            txt = w["text"].strip()
            if not txt:
                continue
            placed = False
            for ci, (cx0, cx1) in enumerate(value_cols):
                if w["x0"] >= cx0 - 5 and x_mid <= cx1 + 10:
                    col_vals[ci] += txt.replace(" ", "")
                    placed = True
                    break
            if not placed:
                if w["x0"] >= label_x_end - 15 and w["x1"] < value_cols[0][0] + 10:
                    continue  # note reference column
                if w["x0"] < label_x_end + 20:
                    label_parts.append(txt)
        label = " ".join(label_parts).strip()
        if label:
            page_lines.append(PageLine(label=label, values=col_vals))
    return full_text, page_lines

def extract_pages_data(pdf_path: str) -> list[tuple[int, str, list[PageLine]]]:
    """Returns [(page_num, full_text, structured_lines), ...]."""
    results = []
    try:
        pdf = pdfplumber.open(pdf_path)
    except Exception as e:
        log.error(f"Failed to open {pdf_path}: {e}")
        return results
    for i, page in enumerate(pdf.pages):
        pn = i + 1
        if is_scanned_page(page):
            log.info(f"  Page {pn}: scanned, OCR...")
            text = _ocr_page_text(pdf_path, pn)
            if text.strip():
                results.append((pn, text, []))
        else:
            ft, pl = _extract_page_structured(page)
            if ft.strip():
                results.append((pn, ft, pl))
    pdf.close()
    return results

# ===========================================================================
# STATEMENT PARSING
# ===========================================================================

SKIP_LABELS = {
    "assets", "liabilities", "equity and liabilities", "equity",
    "income", "expenses", "adjustments for", "adjustments for :",
    "working capital changes", "financial assets", "financial liabilities",
    "non-current assets", "current assets", "non-current liabilities",
    "current liabilities", "cash flows from operating activities",
    "cash flows from investing activities", "cash flows from financing activities",
    "operating activities", "investing activities", "financing activities",
    "tax expense/(credit)", "other comprehensive income",
    "items that will not be reclassified subsequently to profit or loss",
    "items that will be reclassified subsequently to profit or loss",
    "(restated)", "a. equity share capital", "b. other equity",
    "trade payables",  # section header, sub-items have details
}

BOILERPLATE_PATTERNS = [
    "all amounts are in", "unless otherwise stated", "particulars",
    "as per our report", "chartered accountants", "firm registration",
    "membership no", "din:", "place :", "date :", "the accompanying notes",
    "basis of preparation", "significant accounting policies",
    "notes", "components of cash",
]

def _segment_pages(pages: list[tuple[int, str, list[PageLine]]]):
    """Group pages by statement type. Returns [(stmt_type, fiscal_cols, page_lines_list, first_page), ...]."""
    Segment = tuple[str, list[FiscalColumn], list[list[PageLine]], int]
    segments: list[Segment] = []
    for page_num, text, structured_lines in pages:
        header = "\n".join(text.split("\n")[:15])
        stmt_type = classify_statement(header) or classify_statement(text)
        if not stmt_type:
            continue
        fiscal_cols = detect_fiscal_years(header) or detect_fiscal_years("\n".join(text.split("\n")[:20]))
        if not fiscal_cols:
            continue
        # Deduplicate
        seen, deduped = set(), []
        for fc in fiscal_cols:
            if fc.fiscal_year not in seen:
                seen.add(fc.fiscal_year)
                deduped.append(fc)
        fiscal_cols = deduped
        # Continuation check
        if segments:
            pt, pc, pll, pp = segments[-1]
            if pt == stmt_type and [c.fiscal_year for c in pc] == [c.fiscal_year for c in fiscal_cols]:
                pll.append(structured_lines)
                continue
        segments.append((stmt_type, fiscal_cols, [structured_lines], page_num))
    return segments

def _process_label(
    label_raw: str,
    values_raw: list[str],
    num_years: int,
    current_section: str,
    stmt: ParsedStatement,
    fiscal_cols: list[FiscalColumn],
) -> str:
    """Process a single label+values row. Returns updated current_section."""
    if not label_raw:
        return current_section

    ll = label_raw.lower()
    if any(bp in ll for bp in BOILERPLATE_PATTERNS):
        return current_section
    if re.match(r"^[A-Z\s]{5,}\d", label_raw):
        return current_section
    if label_raw.startswith("*"):
        return current_section

    section = detect_section_context(label_raw)
    if section:
        current_section = section

    # Parse values
    parsed_vals: list[Decimal | None] = []
    for v in values_raw:
        parsed_vals.append(parse_number(v))
    while len(parsed_vals) < num_years:
        parsed_vals.insert(0, None)
    parsed_vals = parsed_vals[-num_years:]  # take rightmost if extra

    if all(v is None for v in parsed_vals):
        return current_section

    label_norm = normalise_label(label_raw)
    if not label_norm or label_norm in SKIP_LABELS:
        return current_section

    section_key = ""
    if "non_current" in current_section:
        section_key = "non_current"
    elif "current" in current_section:
        section_key = "current"

    code = None
    if label_norm in CONTEXT_DEPENDENT_LABELS:
        ctx_map = CONTEXT_DEPENDENT_LABELS[label_norm]
        code = ctx_map.get(section_key, list(ctx_map.values())[0])
    if not code:
        code = LABEL_TO_CODE.get(label_norm)
    if not code:
        cleaned = re.sub(r"\s*\([a-z0-9+]+\)\s*$", "", label_norm, flags=re.I).strip()
        if cleaned != label_norm:
            code = LABEL_TO_CODE.get(cleaned)
            if not code and cleaned in CONTEXT_DEPENDENT_LABELS:
                code = CONTEXT_DEPENDENT_LABELS[cleaned].get(section_key, list(CONTEXT_DEPENDENT_LABELS[cleaned].values())[0])

    if not code:
        stmt.unmapped.append(label_raw.strip())
        return current_section

    for idx, fc in enumerate(fiscal_cols):
        val = parsed_vals[idx] if idx < len(parsed_vals) else None
        if val is None:
            continue
        if code.startswith("_"):
            stmt.validation_totals[fc.fiscal_year][code] = val
        else:
            stmt.data[fc.fiscal_year].append(
                LineValue(code=code, value=val, raw_label=label_raw.strip())
            )
    return current_section

def parse_pdf_file(pdf_path: str) -> list[ParsedStatement]:
    pages = extract_pages_data(pdf_path)
    if not pages:
        return []
    segments = _segment_pages(pages)
    statements = []
    for stmt_type, fiscal_cols, pages_lines_list, page_num in segments:
        log.info(f"  Page {page_num}: {stmt_type} for years {[c.fiscal_year for c in fiscal_cols]}")
        num_years = len(fiscal_cols)
        stmt = ParsedStatement(
            statement_type=stmt_type, fiscal_columns=fiscal_cols, source_file=Path(pdf_path).name,
        )
        for fc in fiscal_cols:
            stmt.data[fc.fiscal_year] = []
            stmt.validation_totals[fc.fiscal_year] = {}

        current_section = ""
        for page_lines in pages_lines_list:
            if page_lines:
                # Use structured extraction
                for pl in page_lines:
                    current_section = _process_label(
                        pl.label, pl.values, num_years, current_section, stmt, fiscal_cols
                    )
            else:
                # Fallback: text-based extraction for OCR pages
                for pg_num, text, _ in pages:
                    for line in text.split("\n"):
                        line = line.strip()
                        if not line:
                            continue
                        # Simple right-scan for numbers
                        parts = line.split()
                        vals, i = [], len(parts) - 1
                        while i >= 0 and len(vals) < num_years + 3:
                            tok = parts[i].replace(",", "").replace(" ", "")
                            if re.match(r"^[\(\-]?[\d]+(?:\.\d+)?\)?$", tok) or parts[i] in ("-",):
                                vals.insert(0, parts[i])
                                i -= 1
                            else:
                                break
                        label = " ".join(parts[:i+1])
                        if len(vals) > num_years:
                            vals = vals[-num_years:]
                        current_section = _process_label(
                            label, vals, num_years, current_section, stmt, fiscal_cols
                        )

        items = sum(len(v) for v in stmt.data.values())
        if items > 0:
            statements.append(stmt)
            log.info(f"    -> {items} line items, {len(stmt.unmapped)} unmapped")
        else:
            log.info(f"    -> 0 items ({len(stmt.unmapped)} unmapped)")
    return statements

# ===========================================================================
# SIGN CONVENTION
# ===========================================================================

NATURAL_SIGN_CODES = {"changes_in_inventory", "deferred_tax_expense", "foreign_exchange_gain"}

CF_OUTFLOW_CODES = {
    "purchase_of_property_plant_equipment", "purchase_of_intangible_assets",
    "purchase_of_investments", "loans_given", "income_tax_paid",
    "interest_paid", "dividends_paid", "lease_payments", "repayment_of_borrowings",
}

def apply_sign_conventions(statements: list[ParsedStatement]) -> None:
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
# VALIDATION
# ===========================================================================

def validate_statements(statements: list[ParsedStatement]) -> list[str]:
    warnings = []
    for stmt in statements:
        for year in stmt.data:
            totals = stmt.validation_totals.get(year, {})
            values_by_code: dict[str, Decimal] = {}
            for lv in stmt.data[year]:
                values_by_code[lv.code] = values_by_code.get(lv.code, Decimal(0)) + lv.value

            if stmt.statement_type == "balance_sheet":
                ra = totals.get("_total_assets")
                rel = totals.get("_total_equity_liabilities")
                if ra and rel:
                    diff = abs(ra - rel)
                    if diff > 1:
                        warnings.append(f"BS {year}: Assets ({ra}) != Eq+Liab ({rel}), diff={diff}")
                    else:
                        log.info(f"  BS {year}: Assets=Eq+Liab PASSED ({ra})")
            elif stmt.statement_type == "pnl":
                pbt = totals.get("_pbt")
                pat = totals.get("_pat")
                ttax = totals.get("_total_tax")
                if pbt and pat and ttax:
                    computed = pbt - ttax
                    diff = abs(computed - pat)
                    if diff > 1:
                        warnings.append(f"P&L {year}: PBT-Tax={computed} != PAT={pat}, diff={diff}")
                    else:
                        log.info(f"  P&L {year}: PBT-Tax=PAT PASSED")
            elif stmt.statement_type == "cashflow":
                cfo = values_by_code.get("net_cash_from_operating_activities")
                cfi = values_by_code.get("net_cash_from_investing_activities")
                cff = values_by_code.get("net_cash_from_financing_activities")
                cb = values_by_code.get("cash_at_beginning_of_period")
                ce = values_by_code.get("cash_at_end_of_period")
                fx = values_by_code.get("effect_of_exchange_rate_on_cash", Decimal(0))
                if all(v is not None for v in [cfo, cfi, cff, cb, ce]):
                    computed = cb + cfo + cfi + cff + fx
                    diff = abs(computed - ce)
                    if diff > 1:
                        warnings.append(f"CF {year}: {cb}+{cfo}+{cfi}+{cff}={computed} != {ce}, diff={diff}")
                    else:
                        log.info(f"  CF {year}: Cash reconciliation PASSED")
    return warnings

# ===========================================================================
# OUTPUT: MARKDOWN
# ===========================================================================

def statements_to_markdown(statements: list[ParsedStatement], company_name: str) -> str:
    lines = [f"# Financial Statements: {company_name}", ""]
    for stmt in statements:
        title = {"balance_sheet": "Balance Sheet", "pnl": "Profit & Loss",
                 "cashflow": "Cash Flow", "change_in_equity": "Changes in Equity"
                 }.get(stmt.statement_type, stmt.statement_type)
        years = sorted(stmt.data.keys())
        if not years or sum(len(v) for v in stmt.data.values()) == 0:
            continue
        lines.append(f"## {title} ({stmt.source_file})")
        lines.append("")
        header = "| Line Item | Code | " + " | ".join(f"FY {y}" for y in years) + " |"
        sep = "|" + "---|" * (2 + len(years))
        lines.append(header)
        lines.append(sep)
        seen: list[str] = []
        for y in years:
            for lv in stmt.data[y]:
                if lv.code not in seen:
                    seen.append(lv.code)
        for code in seen:
            raw = ""
            for y in years:
                for lv in stmt.data[y]:
                    if lv.code == code:
                        raw = lv.raw_label; break
                if raw: break
            vals = []
            for y in years:
                v = None
                for lv in stmt.data[y]:
                    if lv.code == code:
                        v = lv.value; break
                vals.append(f"{v:,.2f}" if v is not None else "-")
            lines.append(f"| {raw[:60]} | `{code}` | " + " | ".join(vals) + " |")
        lines.append("")
        if stmt.unmapped:
            lines.append(f"### Unmapped ({len(stmt.unmapped)})")
            for u in sorted(set(stmt.unmapped)):
                lines.append(f"- {u}")
            lines.append("")
    return "\n".join(lines)

# ===========================================================================
# OUTPUT: CALCULA JSON
# ===========================================================================

def statements_to_import_json(statements: list[ParsedStatement], isin: str, name: str, scale: str = "crores") -> dict:
    year_values: dict[int, dict[str, Decimal]] = {}
    for stmt in statements:
        for year, values in stmt.data.items():
            if year not in year_values:
                year_values[year] = {}
            for lv in values:
                year_values[year][lv.code] = lv.value
    periods = []
    for year in sorted(year_values):
        vals = [{"lineItemCode": c, "value": str(v), "valueSource": "manual"} for c, v in year_values[year].items()]
        periods.append({
            "fiscalYear": year, "scale": scale, "currency": "INR",
            "periodStart": f"{year-1}-04-01T00:00:00.000Z",
            "periodEnd": f"{year}-03-31T00:00:00.000Z",
            "isAudited": True, "values": vals,
        })
    return {
        "company": {"isin": isin, "name": name, "defaultScale": scale,
                     "defaultCurrency": "INR", "country": "IN", "listingStatus": "unlisted"},
        "financialPeriods": periods,
    }

# ===========================================================================
# UPLOAD
# ===========================================================================

def generate_jwt(secret: str = "change-me") -> str:
    import jwt, time
    return jwt.encode({"sub": "cli-import", "username": "admin", "role": "ADMIN",
                        "iat": int(time.time()), "exp": int(time.time()) + 3600},
                       secret, algorithm="HS256")

def upload_to_calcula(payload: dict, base_url: str = "http://localhost:4100", secret: str = "change-me") -> dict:
    import requests
    token = generate_jwt(secret)
    url = f"{base_url}/api/companies/import"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    log.info(f"Uploading to {url} ...")
    resp = requests.post(url, json=payload, headers=headers, timeout=120)
    if resp.status_code >= 400:
        log.error(f"Upload failed: HTTP {resp.status_code}\n{resp.text[:500]}")
        resp.raise_for_status()
    result = resp.json()
    log.info(f"Upload succeeded: {json.dumps(result, indent=2)}")
    return result

def trigger_recalc(company_id: str, fiscal_years: list[int], base_url: str = "http://localhost:4100", secret: str = "change-me") -> None:
    import requests
    token = generate_jwt(secret)
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    mutation = """mutation UpsertMetric($input: UpsertFinancialMetricInput!) {
        upsertFinancialMetric(input: $input) { id }
    }"""
    for year in fiscal_years:
        variables = {"input": {"companyId": company_id, "fiscalYear": year,
                               "lineItemCode": "revenue_from_operations", "value": "0", "valueSource": "derived"}}
        try:
            resp = requests.post(f"{base_url}/graphql", json={"query": mutation, "variables": variables},
                                 headers=headers, timeout=30)
            if resp.status_code == 200:
                log.info(f"  Recalc triggered for FY {year}")
            else:
                log.warning(f"  Recalc FY {year}: HTTP {resp.status_code}")
        except Exception as e:
            log.warning(f"  Recalc FY {year} failed: {e}")

# ===========================================================================
# CLI
# ===========================================================================

def main():
    parser = argparse.ArgumentParser(
        description="PDF-to-Calcula Financial Import Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
            Examples:
              python3.14 cli.py --dir ./pdfs/ --isin INE03AV01027 --name "boAt Lifestyle"
              python3.14 cli.py --dir ./pdfs/ --isin INE03AV01027 --name "boAt" --upload --force
        """),
    )
    parser.add_argument("--dir", required=True, help="Directory containing PDF files")
    parser.add_argument("--isin", required=True, help="Company ISIN code")
    parser.add_argument("--name", required=True, help="Company name")
    parser.add_argument("--scale", default="crores",
                        choices=["crores", "lakhs", "thousands", "millions", "actuals"],
                        help="Scale of values (default: crores)")
    parser.add_argument("--upload", action="store_true", help="Upload to Calcula API")
    parser.add_argument("--force", action="store_true", help="Force upload even with warnings")
    parser.add_argument("--base-url", default="http://localhost:4100", help="Calcula API base URL")
    parser.add_argument("--jwt-secret", default="change-me", help="JWT signing secret")
    parser.add_argument("--output-dir", default=None, help="Output directory (default: --dir)")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose logging")
    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    pdf_dir = Path(args.dir)
    if not pdf_dir.is_dir():
        log.error(f"Directory not found: {pdf_dir}"); sys.exit(1)

    output_dir = Path(args.output_dir) if args.output_dir else pdf_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    pdf_files = sorted(pdf_dir.glob("*.pdf"))
    if not pdf_files:
        log.error(f"No PDF files in {pdf_dir}"); sys.exit(1)

    log.info(f"Found {len(pdf_files)} PDF(s) in {pdf_dir}")

    all_statements: list[ParsedStatement] = []
    for pdf_file in pdf_files:
        log.info(f"Processing: {pdf_file.name}")
        stmts = parse_pdf_file(str(pdf_file))
        all_statements.extend(stmts)

    if not all_statements:
        log.error("No statements extracted."); sys.exit(1)

    log.info("Applying sign conventions...")
    apply_sign_conventions(all_statements)

    log.info("Running validation...")
    warnings = validate_statements(all_statements)
    if warnings:
        for w in warnings:
            log.warning(f"  {w}")
    else:
        log.info("All checks passed.")

    md = statements_to_markdown(all_statements, args.name)
    md_path = output_dir / f"{args.isin}_financials.md"
    md_path.write_text(md, encoding="utf-8")

    payload = statements_to_import_json(all_statements, args.isin, args.name, args.scale)
    json_path = output_dir / f"{args.isin}_import.json"
    json_path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")

    total_items = sum(len(p["values"]) for p in payload["financialPeriods"])
    unique_unmapped = sorted(set(u for s in all_statements for u in s.unmapped))

    print("\n" + "=" * 72)
    print(f"  IMPORT SUMMARY: {args.name} ({args.isin})")
    print("=" * 72)
    print(f"  Statements parsed  : {len(all_statements)}")
    print(f"  Fiscal periods     : {len(payload['financialPeriods'])}")
    print(f"  Total line items   : {total_items}")
    print(f"  Unmapped labels    : {len(unique_unmapped)}")
    if unique_unmapped:
        print(f"\n  Unmapped (up to 30):")
        for u in unique_unmapped[:30]:
            print(f"    - {u}")
        if len(unique_unmapped) > 30:
            print(f"    ... and {len(unique_unmapped) - 30} more")
    print(f"\n  Warnings: {len(warnings)}")
    for w in warnings: print(f"    - {w}")
    print(f"\n  Markdown : {md_path}")
    print(f"  JSON     : {json_path}")
    print("=" * 72)

    if args.upload:
        if warnings and not args.force:
            log.error("Upload aborted (warnings). Use --force."); sys.exit(1)
        try:
            result = upload_to_calcula(payload, args.base_url, args.jwt_secret)
            cid = result.get("companyId")
            if cid:
                years = sorted(set(p["fiscalYear"] for p in payload["financialPeriods"]))
                trigger_recalc(cid, years, args.base_url, args.jwt_secret)
            print(f"\n  Upload: {json.dumps(result, indent=2)}")
        except Exception as e:
            log.error(f"Upload failed: {e}"); sys.exit(1)
    else:
        print("\n  Re-run with --upload to send to Calcula.")
    print()

if __name__ == "__main__":
    main()
