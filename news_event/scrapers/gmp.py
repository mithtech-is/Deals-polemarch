"""GMP (Grey Market Premium) scraper.

Note: Most GMP data sites (Chittorgarh, InvestorGain) use client-side rendering,
making direct HTML scraping infeasible without a headless browser.

Current approach: Extract GMP data from Google News RSS articles about GMP.
The structured GMP table is populated from news mentions. For actual live GMP
prices, a headless browser (playwright) can be added later.

For now, this module provides a simplified GMP tracker that stores manually
curated or news-derived GMP data.
"""

from __future__ import annotations

import logging

from .utils import load_json, load_yaml, now_iso, save_json

logger = logging.getLogger(__name__)


def scrape() -> tuple[list[dict], list[dict]]:
    """Run the GMP scraper. Returns (big_moves, all_entries).

    Currently returns existing data since live GMP scraping requires
    a headless browser. GMP news comes via the Google News RSS scraper
    using the 'grey_market' keyword group.
    """
    keywords_config = load_yaml("keywords.yml")
    threshold = (
        keywords_config.get("alerts", {}).get("thresholds", {}).get("gmp_change_percent", 20)
    )

    previous = load_json("gmp.json")
    if not previous:
        logger.info("No existing GMP data. GMP table will be empty until data is added.")
        save_json("gmp.json", [])
        return [], []

    # Detect big GMP moves between stored snapshots
    big_moves = []
    for entry in previous:
        prev_gmp = entry.get("previous_gmp")
        curr_gmp = entry.get("gmp")
        if prev_gmp is not None and curr_gmp is not None and prev_gmp != 0:
            change_pct = abs((curr_gmp - prev_gmp) / abs(prev_gmp)) * 100
            if change_pct >= threshold:
                entry["gmp_change_pct"] = round(change_pct, 1)
                big_moves.append(entry)

    logger.info(f"GMP entries: {len(previous)}, Big moves: {len(big_moves)}")
    return big_moves, previous
