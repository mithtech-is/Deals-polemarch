"""DRHP filing scraper - scrapes SEBI website for DRHP filings."""

from __future__ import annotations

import logging

import httpx
from bs4 import BeautifulSoup

from .utils import load_json, load_yaml, match_company, now_iso, save_json

logger = logging.getLogger(__name__)

SEBI_URL = "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListingAll=yes&sid=3"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
}


def parse_sebi_table(html: str, companies: list[dict]) -> list[dict]:
    """Parse the SEBI public issues table for DRHP filings."""
    soup = BeautifulSoup(html, "lxml")
    table = soup.find("table")
    if not table:
        logger.warning("Could not find SEBI table")
        return []

    filings = []
    rows = table.find_all("tr")[1:]  # Skip header

    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 4:
            continue

        date = cols[0].get_text(strip=True)
        category = cols[1].get_text(strip=True)
        doc_type = cols[2].get_text(strip=True)

        # We're primarily interested in DRHP filings
        detail_cell = cols[3]
        company_text = detail_cell.get_text(strip=True)
        links = detail_cell.find_all("a")
        drhp_url = ""
        for link in links:
            href = link.get("href", "")
            if href:
                if not href.startswith("http"):
                    href = "https://www.sebi.gov.in" + href
                # Prefer the DRHP PDF link
                if "drhp" in href.lower() or "draft" in href.lower():
                    drhp_url = href
                elif not drhp_url:
                    drhp_url = href

        # Extract company name (before " - DRHP" or similar suffix)
        company_name = company_text.split(" - ")[0].split("-Draft")[0].strip()
        if not company_name:
            continue

        # Determine status from doc_type
        if "Draft" in doc_type:
            status = "DRHP Filed"
        elif "Final" in doc_type:
            status = "RHP Filed"
        elif "Other" in doc_type:
            status = "Other Document"
        else:
            status = doc_type

        matched = match_company(company_name, companies)

        filings.append(
            {
                "company": company_name,
                "isin": matched["isin"] if matched else None,
                "filed_date": date,
                "doc_type": doc_type,
                "status": status,
                "category": category,
                "drhp_url": drhp_url,
                "first_seen": now_iso(),
            }
        )

    return filings


def scrape() -> tuple[list[dict], list[dict], list[dict]]:
    """Run the DRHP scraper. Returns (new_filings, changed_filings, all_filings)."""
    companies_config = load_yaml("companies.yml")
    companies = companies_config.get("companies", [])

    logger.info("Fetching DRHP filings from SEBI")
    resp = httpx.get(SEBI_URL, headers=HEADERS, timeout=30, follow_redirects=True)
    resp.raise_for_status()

    current_filings = parse_sebi_table(resp.text, companies)
    # Filter to only DRHP-related entries
    drhp_filings = [
        f for f in current_filings
        if "Draft" in f.get("doc_type", "") or "DRHP" in f.get("status", "")
    ]
    logger.info(f"Found {len(drhp_filings)} DRHP filings out of {len(current_filings)} total entries")

    # Load previous data
    previous = load_json("drhp_filings.json")
    prev_by_company = {f["company"]: f for f in previous}

    new_filings = []
    changed_filings = []

    for filing in current_filings:
        name = filing["company"]
        if name not in prev_by_company:
            new_filings.append(filing)
        else:
            prev = prev_by_company[name]
            if prev.get("status") != filing.get("status"):
                filing["previous_status"] = prev.get("status")
                changed_filings.append(filing)
                filing["first_seen"] = prev.get("first_seen", filing["first_seen"])
            else:
                filing["first_seen"] = prev.get("first_seen", filing["first_seen"])

    logger.info(f"New filings: {len(new_filings)}, Status changes: {len(changed_filings)}")

    save_json("drhp_filings.json", current_filings)
    return new_filings, changed_filings, current_filings
