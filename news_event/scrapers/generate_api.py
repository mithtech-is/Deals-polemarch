"""Generate static JSON API files for Polemarch integration."""

from __future__ import annotations

import json
import os
from pathlib import Path

from .utils import DATA_DIR, ROOT_DIR, load_json, load_yaml


def generate():
    """Generate static JSON API files in site/public/api/."""
    api_dir = ROOT_DIR / "site" / "public" / "api"
    api_dir.mkdir(parents=True, exist_ok=True)

    # Load data
    news = load_json("news.json")
    drhp = load_json("drhp_filings.json")
    gmp = load_json("gmp.json")
    companies = load_yaml("companies.yml").get("companies", [])

    # /api/news.json
    _write(api_dir / "news.json", news)

    # /api/drhp.json
    _write(api_dir / "drhp.json", drhp)

    # /api/gmp.json
    _write(api_dir / "gmp.json", gmp)

    # /api/companies.json
    _write(api_dir / "companies.json", companies)

    # /api/news/by-isin/{isin}.json
    by_isin_dir = api_dir / "news" / "by-isin"
    by_isin_dir.mkdir(parents=True, exist_ok=True)

    # Group news by ISIN
    isin_news: dict[str, list] = {}
    for article in news:
        isin = article.get("isin")
        if isin:
            isin_news.setdefault(isin, []).append(article)

    # Also create files for companies with no news (empty arrays)
    for company in companies:
        isin = company.get("isin")
        if isin:
            articles = isin_news.get(isin, [])
            _write(by_isin_dir / f"{isin}.json", articles)

    print(f"Generated API files: {len(isin_news)} ISINs with news, {len(companies)} total company files")


def _write(path: Path, data):
    with open(path, "w") as f:
        json.dump(data, f, ensure_ascii=False, default=str)


if __name__ == "__main__":
    generate()
