#!/usr/bin/env python3.14
"""
PDF Financial Statement Extractor
==================================
Extracts text from annual report PDFs using pdfplumber (with OCR fallback),
detects the scale, classifies pages by statement type, and outputs one
structured markdown file PER PDF.

Each PDF has different formatting, page counts, and layouts. The extractor
treats each independently and produces a self-contained .md file with:
  - Scale and period info
  - Statement-classified text for each page
  - The full Calcula taxonomy for reference
  - Context-aware mapping hints

Usage:
    python3.14 extract.py /path/to/data_dump/INE03AV01027-boat/

Output:
    21-22.md, 22-23.md, 23-24.md, 24-25.md (one per input PDF)
"""

import os
import re
import subprocess
import sys
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("ERROR: pdfplumber not installed. Run: pip3.14 install pdfplumber")
    sys.exit(1)


# ── Statement detection patterns ─────────────────────────────────

BS_PATTERNS = [
    r'balance\s+sheet',
    r'statement\s+of\s+assets\s+and\s+liabilities',
    r'assets\s+and\s+liabilities',
    r'consolidated\s+statement\s+of\s+assets',
]
PNL_PATTERNS = [
    r'statement\s+of\s+profit\s+and\s+loss',
    r'profit\s+and\s+loss',
    r'statement\s+of\s+profit\s*&\s*loss',
    r'income\s+statement',
    r'statement\s+of\s+financial\s+results',  # quarterly results format (NSE etc)
    r'financial\s+results\s+for\s+the',
]
CF_PATTERNS = [
    r'statement\s+of\s+cash\s+flows?',
    r'cash\s+flow\s+statement',
    r'cash\s+flows?\s+from\s+operating',
]
SCE_PATTERNS = [
    r'statement\s+of\s+changes\s+in\s+equity',
    r'changes\s+in\s+equity',
]

SCALE_PATTERNS = {
    'crores': [r'in\s+(?:rs\.?\s+)?crores?', r'₹\s*crores?', r'rupees\s+crores?'],
    'lakhs': [r'in\s+(?:rs\.?\s+)?lakhs?', r'₹\s*lakhs?', r'rupees\s+lakhs?'],
    'millions': [r'in\s+(?:rs\.?\s+)?millions?', r'₹\s*millions?', r'rupees\s+millions?'],
    'thousands': [r'in\s+(?:rs\.?\s+)?thousands?', r'₹\s*thousands?'],
}


SEGMENT_PATTERNS = [
    r'segment\s+information',
    r'segment\s+revenue',
    r'segment\s+assets',
    r'segment\s+capital',
]


def detect_statement_type(text: str) -> str | None:
    t = text[:600].lower()
    # Skip segment pages entirely — not needed for import
    for pattern in SEGMENT_PATTERNS:
        if re.search(pattern, t): return None
    for pattern in BS_PATTERNS:
        if re.search(pattern, t): return 'balance_sheet'
    for pattern in PNL_PATTERNS:
        if re.search(pattern, t): return 'pnl'
    for pattern in CF_PATTERNS:
        if re.search(pattern, t): return 'cashflow'
    for pattern in SCE_PATTERNS:
        if re.search(pattern, t): return 'change_in_equity'
    # Fallback: check for key line items in body
    body = text.lower()
    if 'revenue from operations' in body and 'tax expense' in body:
        return 'pnl'
    if 'non-current assets' in body and 'equity share capital' in body:
        return 'balance_sheet'
    if 'operating activities' in body and 'investing activities' in body:
        return 'cashflow'
    return None


def detect_scale(text: str) -> str | None:
    t = text[:1500].lower()
    for scale, patterns in SCALE_PATTERNS.items():
        for p in patterns:
            if re.search(p, t): return scale
    return None


def detect_fiscal_years(text: str) -> list[int]:
    # Match "March 31, 2025", "31 March 2025", "31.03.2025", "31/03/2025"
    patterns = [
        r'(?:march|mar)\s*(?:\d{1,2}\s*,?\s*)?(\d{4})',
        r'\d{1,2}[./]\s*03[./]\s*(\d{4})',
        r'(\d{4})\s*$',  # year at end of line in column headers
    ]
    all_matches = []
    for p in patterns:
        all_matches.extend(re.findall(p, text[:800], re.IGNORECASE))
    years = sorted(set(int(y) for y in all_matches if 2015 <= int(y) <= 2030), reverse=True)
    return years


def extract_text_from_page(page) -> str:
    """Extract text, falling back to OCR for scanned pages."""
    text = page.extract_text() or ''
    if len(text.strip()) < 30:
        try:
            img = page.to_image(resolution=300)
            import pytesseract
            text = pytesseract.image_to_string(img.original, config='--psm 6')
        except Exception:
            pass
    return text


def load_taxonomy() -> str:
    """Load the full Calcula line item taxonomy from the database."""
    env = {**os.environ, 'PGPASSWORD': 'atlas'}
    r = subprocess.run(
        ['/opt/homebrew/Cellar/postgresql@17/17.9/bin/psql',
         '-h', 'localhost', '-U', 'atlas', '-d', 'postgres', '-t', '-A', '-F|'],
        input='SET search_path=atlas_new;\n'
              'SELECT statement_type, code, name, is_calculated '
              'FROM financial_line_items '
              'WHERE statement_type IN (\'balance_sheet\',\'pnl\',\'cashflow\',\'change_in_equity\') '
              'ORDER BY statement_type, order_code;\n',
        capture_output=True, text=True, env=env
    )
    lines = []
    current_type = None
    for row in r.stdout.strip().split('\n'):
        row = row.strip()
        if not row or row == 'SET': continue
        parts = row.split('|')
        if len(parts) < 4: continue
        st, code, name, is_calc = parts[0], parts[1], parts[2], parts[3]
        if st != current_type:
            current_type = st
            lines.append(f'\n### {st.upper().replace("_"," ")}')
            lines.append(f'| Code | Name | Type |')
            lines.append(f'|---|---|---|')
        lines.append(f'| `{code}` | {name} | {"calculated" if is_calc == "t" else "**LEAF — fill this**"} |')
    return '\n'.join(lines)


REFERENCE_SECTIONS = None  # Cached once


def get_reference_sections(taxonomy: str) -> str:
    """Build the reference sections (taxonomy + mapping rules + sign convention) once."""
    global REFERENCE_SECTIONS
    if REFERENCE_SECTIONS:
        return REFERENCE_SECTIONS

    lines = []

    lines.append('## Sign Convention (CRITICAL — this is the #1 source of errors)')
    lines.append('')
    lines.append('| Statement | Rule | Exception |')
    lines.append('|---|---|---|')
    lines.append('| Balance Sheet | ALL values **POSITIVE** | None |')
    lines.append('| P&L | Revenue **POSITIVE**, expenses **POSITIVE** | `changes_in_inventory` and `deferred_tax_expense` keep natural sign (negative if in brackets) |')
    lines.append('| Cash Flow | Inflows **POSITIVE**, outflows **NEGATIVE** | Brackets in PDF = negative |')
    lines.append('| SCE | Opening equity **POSITIVE** | Losses are negative |')
    lines.append('')

    lines.append('## Calcula Taxonomy — LEAF codes to fill')
    lines.append('Only fill **LEAF** codes. Calculated parents are auto-derived.')
    lines.append(taxonomy)
    lines.append('')

    lines.append('## Context-Aware Mapping (IMPORTANT)')
    lines.append('These labels appear in BOTH current and non-current sections. Use the section header to pick the right code:')
    lines.append('')
    lines.append('| PDF Label | Under "Non-current" | Under "Current" |')
    lines.append('|---|---|---|')
    lines.append('| Borrowings | `long_term_borrowings` | `short_term_borrowings` |')
    lines.append('| Investments | `financial_assets_investments_non_current` | `short_term_investments` |')
    lines.append('| Loans | `financial_assets_loans_non_current` | `short_term_loans` |')
    lines.append('| Lease liabilities | `lease_liabilities_non_current` | → combine into `other_current_liabilities` |')
    lines.append('| Provisions | `long_term_provisions` | `short_term_provisions` |')
    lines.append('| Other financial assets | `financial_assets_other_non_current` | → combine into `other_current_assets` |')
    lines.append('| Other financial liabilities | `other_non_current_liabilities` | → combine into `other_current_liabilities` |')
    lines.append('| Trade payables (MSME) | — | `trade_payables_micro_small` |')
    lines.append('| Trade payables (others) | — | `trade_payables_other` |')
    lines.append('| Contract liabilities | `contract_liabilities_non_current` | `contract_liabilities` |')
    lines.append('')

    lines.append('## Common Label → Code Mappings')
    lines.append('')
    lines.append('| PDF Label | Calcula Code |')
    lines.append('|---|---|')
    lines.append('| Revenue from operations | `revenue_from_operations` |')
    lines.append('| Other income | `other_income` |')
    lines.append('| Cost of materials consumed | `cost_of_materials_consumed` |')
    lines.append('| Purchase of stock-in-trade | `purchase_of_stock_in_trade` |')
    lines.append('| Changes in inventories | `changes_in_inventory` |')
    lines.append('| Employee benefits expense | `employee_benefits_expense` |')
    lines.append('| Finance costs | `finance_cost_section_others` |')
    lines.append('| Depreciation and amortisation | `depreciation_expense` |')
    lines.append('| Other expenses | `miscellaneous_expenses` |')
    lines.append('| Expected credit loss | `bad_debt_expense` |')
    lines.append('| Current tax | `current_tax_expense` |')
    lines.append('| Deferred tax | `deferred_tax_expense` |')
    lines.append('| Impairment of goodwill | `impairment_loss` |')
    lines.append('| Equity share capital | `equity_share_capital` |')
    lines.append('| Securities premium | `share_premium` |')
    lines.append('| Retained earnings | `retained_earnings` |')
    lines.append('| Other equity / Reserves & surplus | `other_equity` |')
    lines.append('| Cash and cash equivalents | `cash_and_cash_equivalents` |')
    lines.append('| Trade receivables | `trade_receivables` |')
    lines.append('| Inventories | `inventories_stock_in_trade` (unless sub-broken) |')
    lines.append('| Investments in associates | `financial_assets_investments_non_current` |')
    lines.append('| Deferred tax assets (net) | `deferred_tax_assets` |')
    lines.append('| Income tax assets (net) | `non_current_tax_assets` |')
    lines.append('| Non-controlling interests | → include in `other_equity` |')
    lines.append('| Instruments in nature of equity | → include in `other_equity` |')
    lines.append('')

    REFERENCE_SECTIONS = '\n'.join(lines)
    return REFERENCE_SECTIONS


def process_single_pdf(pdf_path: Path) -> dict:
    """Extract and classify all pages from one PDF independently."""
    pdf = pdfplumber.open(str(pdf_path))
    scale = None
    pages_data = []

    for i, page in enumerate(pdf.pages):
        text = extract_text_from_page(page)
        if not text.strip():
            pages_data.append({'page': i + 1, 'type': None, 'years': [], 'text': '(empty/scanned — no text extracted)', 'chars': 0})
            continue

        if not scale:
            scale = detect_scale(text)

        stmt_type = detect_statement_type(text)
        years = detect_fiscal_years(text)

        # Detect if this has quarterly columns
        has_quarterly = bool(re.search(r'31[./]\s*12[./]\s*\d{4}|31[./]\s*09[./]\s*\d{4}|30[./]\s*06[./]\s*\d{4}|quarter|q[1-4]', text[:600], re.IGNORECASE))

        pages_data.append({
            'page': i + 1,
            'type': stmt_type,
            'years': years,
            'quarterly': has_quarterly,
            'text': text,
            'chars': len(text),
        })

    pdf.close()
    return {
        'file': pdf_path.name,
        'pages': len(pdf_path.read_bytes()),  # file size for reference
        'page_count': len(pages_data),
        'scale': scale,
        'pages_data': pages_data,
    }


def generate_per_pdf_markdown(pdf_name: str, result: dict, reference: str) -> str:
    """Generate a self-contained markdown file for ONE PDF."""
    lines = []
    lines.append(f'# Financial Statements — {pdf_name}')
    lines.append(f'')
    lines.append(f'**Scale:** {result["scale"] or "NOT DETECTED — check headers"}')
    lines.append(f'**Pages:** {result["page_count"]}')
    lines.append(f'')

    # Summarize what's in this PDF
    types_found = {}
    all_years = set()
    for p in result['pages_data']:
        if p['type']:
            types_found.setdefault(p['type'], []).append(p['page'])
            all_years.update(p['years'])

    lines.append(f'**Statements found:**')
    for st, pages in types_found.items():
        lines.append(f'  - {st}: pages {", ".join(str(p) for p in pages)}')
    lines.append(f'**Fiscal years:** {", ".join(str(y) for y in sorted(all_years))}')
    lines.append(f'')

    # Reference material
    lines.append('---')
    lines.append(reference)
    lines.append('---')
    lines.append('')

    # The actual extracted text, page by page
    lines.append('## Extracted Text')
    lines.append('')

    for p in result['pages_data']:
        tag = p['type'] or 'UNCLASSIFIED'
        years_str = ', '.join(str(y) for y in p['years']) if p['years'] else '?'

        qtly = ' ⚡QUARTERLY' if p.get('quarterly') else ''
        lines.append(f'### Page {p["page"]} — **{tag.upper()}** (FY: {years_str}){qtly} [{p["chars"]} chars]')
        lines.append('')
        lines.append('```')
        lines.append(p['text'])
        lines.append('```')
        lines.append('')

    return '\n'.join(lines)


def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} /path/to/data_dump/ISIN-company/")
        sys.exit(1)

    pdf_dir = Path(sys.argv[1])
    if not pdf_dir.is_dir():
        print(f"ERROR: {pdf_dir} is not a directory")
        sys.exit(1)

    pdfs = sorted(pdf_dir.glob('*.pdf'))
    if not pdfs:
        print(f"ERROR: No PDF files found in {pdf_dir}")
        sys.exit(1)

    print(f"Found {len(pdfs)} PDF(s) in {pdf_dir}")

    # Load taxonomy once
    print("Loading Calcula taxonomy from database...")
    taxonomy = load_taxonomy()
    reference = get_reference_sections(taxonomy)

    # Process each PDF independently and output one .md per PDF
    for pdf_path in pdfs:
        print(f"\nProcessing {pdf_path.name}...")
        result = process_single_pdf(pdf_path)

        # Summary
        types_found = set(p['type'] for p in result['pages_data'] if p['type'])
        all_years = set()
        for p in result['pages_data']:
            all_years.update(p['years'])
        print(f"  Scale: {result['scale']}")
        print(f"  Pages: {result['page_count']}")
        print(f"  Statements: {', '.join(types_found) if types_found else 'none detected'}")
        print(f"  Years: {', '.join(str(y) for y in sorted(all_years)) if all_years else 'none detected'}")

        # Generate markdown
        md = generate_per_pdf_markdown(pdf_path.name, result, reference)

        # Write output — same name as PDF but .md extension
        out_name = pdf_path.stem + '.md'
        out_path = pdf_dir / out_name
        out_path.write_text(md, encoding='utf-8')
        print(f"  → {out_path.name} ({len(md):,} bytes)")

    print(f"\n✅ Done. {len(pdfs)} markdown files written to {pdf_dir}/")
    print(f"Each file is self-contained with taxonomy reference + extracted text.")
    print(f"Feed each to an AI agent to produce the Calcula import JSON.")


if __name__ == '__main__':
    main()
