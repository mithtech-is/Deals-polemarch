"""Orchestrator - runs all scrapers, sends alerts, updates metadata."""

import logging
import sys

from . import google_news, drhp, gmp, alerts, summarizer
from .utils import now_iso, save_json

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


def run():
    logger.info("=== UnlistedPulse scraper starting ===")
    meta = {"started_at": now_iso(), "errors": []}

    # 1. Google News RSS
    new_articles = []
    try:
        new_articles, all_articles = google_news.scrape()
        meta["news_total"] = len(all_articles)
        meta["news_new"] = len(new_articles)
    except Exception as e:
        logger.error(f"Google News scraper failed: {e}")
        meta["errors"].append(f"google_news: {e}")

    # 2. DRHP filings
    new_drhp, changed_drhp = [], []
    try:
        new_drhp, changed_drhp, all_drhp = drhp.scrape()
        meta["drhp_total"] = len(all_drhp)
        meta["drhp_new"] = len(new_drhp)
        meta["drhp_changed"] = len(changed_drhp)
    except Exception as e:
        logger.error(f"DRHP scraper failed: {e}")
        meta["errors"].append(f"drhp: {e}")

    # 3. GMP data
    gmp_moves = []
    try:
        gmp_moves, all_gmp = gmp.scrape()
        meta["gmp_total"] = len(all_gmp)
        meta["gmp_big_moves"] = len(gmp_moves)
    except Exception as e:
        logger.error(f"GMP scraper failed: {e}")
        meta["errors"].append(f"gmp: {e}")

    # 4. Send alerts (disabled - email collection only for now)
    # To re-enable: set EMAILIT_API_KEY and uncomment below
    # try:
    #     alert_count = alerts.send_alerts(new_drhp, changed_drhp, gmp_moves, new_articles)
    #     meta["alerts_sent"] = alert_count
    # except Exception as e:
    #     logger.error(f"Alert system failed: {e}")
    #     meta["errors"].append(f"alerts: {e}")
    meta["alerts_sent"] = 0

    # 5. Summarize articles (requires ANTHROPIC_API_KEY)
    try:
        summary_count = summarizer.scrape()
        meta["summaries_generated"] = summary_count
    except Exception as e:
        logger.error(f"Summarizer failed: {e}")
        meta["errors"].append(f"summarizer: {e}")

    # 6. Update metadata
    meta["finished_at"] = now_iso()
    save_json("meta.json", meta)

    logger.info(f"=== Scraper finished. Errors: {len(meta['errors'])} ===")

    if meta["errors"]:
        for err in meta["errors"]:
            logger.error(f"  - {err}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(run())
