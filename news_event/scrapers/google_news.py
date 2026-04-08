"""Google News RSS scraper - fetches news articles via RSS feeds."""

import logging
from datetime import datetime, timezone
from urllib.parse import quote

import feedparser

from .utils import (
    days_ago,
    hash_url,
    load_json,
    load_yaml,
    match_company,
    now_iso,
    save_json,
)

logger = logging.getLogger(__name__)

RSS_BASE = "https://news.google.com/rss/search?q={query}&hl=en-IN&gl=IN&ceid=IN:en"
RETENTION_DAYS = 7


def build_feed_urls(keywords_config: dict, companies: list[dict]) -> list[dict]:
    """Build a list of RSS feed URLs from keyword groups and company keywords."""
    feeds = []

    for group_name, group in keywords_config.get("keyword_groups", {}).items():
        query = group["query"]
        feeds.append(
            {
                "url": RSS_BASE.format(query=quote(query)),
                "category": group.get("category", group_name),
                "company": None,
            }
        )

    for company in companies:
        if keywords := company.get("keywords"):
            feeds.append(
                {
                    "url": RSS_BASE.format(query=quote(keywords)),
                    "category": "company",
                    "company": company,
                }
            )

    return feeds


def parse_feed(feed_info: dict, companies: list[dict]) -> list[dict]:
    """Parse a single RSS feed and return articles."""
    articles = []
    feed = feedparser.parse(feed_info["url"])

    for entry in feed.entries:
        url = entry.get("link", "")
        if not url:
            continue

        title = entry.get("title", "")
        source = entry.get("source", {}).get("title", "") if hasattr(entry, "source") else ""

        # Parse published date
        published = entry.get("published_parsed")
        if published:
            pub_dt = datetime(*published[:6], tzinfo=timezone.utc)
            published_at = pub_dt.isoformat()
        else:
            published_at = now_iso()

        # Try to match company from feed info first, then from title
        matched = feed_info.get("company")
        if not matched:
            matched = match_company(title, companies)

        raw_snippet = entry.get("summary", "") or ""
        # Strip HTML tags from snippet
        import re
        from html import unescape
        snippet = unescape(re.sub(r"<[^>]+>", " ", raw_snippet))
        snippet = re.sub(r"\s+", " ", snippet).strip()[:200]

        articles.append(
            {
                "id": hash_url(url),
                "title": title,
                "url": url,
                "source": source,
                "published_at": published_at,
                "category": feed_info["category"],
                "isin": matched["isin"] if matched else None,
                "company_name": matched["name"] if matched else None,
                "company_slug": matched["slug"] if matched else None,
                "snippet": snippet,
            }
        )

    return articles


def scrape() -> tuple[list[dict], list[dict]]:
    """Run the Google News scraper. Returns (new_articles, all_articles)."""
    keywords_config = load_yaml("keywords.yml")
    companies_config = load_yaml("companies.yml")
    companies = companies_config.get("companies", [])

    feeds = build_feed_urls(keywords_config, companies)
    logger.info(f"Fetching {len(feeds)} RSS feeds")

    # Existing articles for deduplication
    existing = load_json("news.json")
    existing_ids = {a["id"] for a in existing}

    new_articles = []
    for feed_info in feeds:
        try:
            articles = parse_feed(feed_info, companies)
            for article in articles:
                if article["id"] not in existing_ids:
                    existing_ids.add(article["id"])
                    new_articles.append(article)
        except Exception as e:
            logger.error(f"Error parsing feed {feed_info['url'][:80]}: {e}")

    logger.info(f"Found {len(new_articles)} new articles")

    # Merge and prune old articles
    all_articles = existing + new_articles
    cutoff = days_ago(RETENTION_DAYS).isoformat()
    all_articles = [a for a in all_articles if a.get("published_at", "") >= cutoff]

    # Sort by published date descending
    all_articles.sort(key=lambda a: a.get("published_at", ""), reverse=True)

    save_json("news.json", all_articles)
    return new_articles, all_articles
