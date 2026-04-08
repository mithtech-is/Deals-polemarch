"""Migrate existing YAML config and JSON data into SQLite database."""

import json
from datetime import datetime, timezone
from pathlib import Path

import yaml

from .db import engine, SessionLocal, init_db
from .models import Base, Company, Article, DRHPFiling, KeywordGroup

ROOT = Path(__file__).parent.parent
CONFIG_DIR = ROOT / "config"
DATA_DIR = ROOT / "data"


def run():
    """Run the full migration."""
    print("Initializing database...")
    init_db()

    db = SessionLocal()
    try:
        migrate_companies(db)
        migrate_keywords(db)
        migrate_articles(db)
        migrate_drhp(db)
        db.commit()
        print("Migration complete!")
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        db.close()


def migrate_companies(db):
    config_path = CONFIG_DIR / "companies.yml"
    if not config_path.exists():
        print("  No companies.yml found, skipping")
        return

    with open(config_path) as f:
        config = yaml.safe_load(f)

    count = 0
    for c in config.get("companies", []):
        existing = db.query(Company).filter_by(isin=c["isin"]).first()
        if existing:
            continue
        db.add(Company(
            isin=c["isin"],
            name=c["name"],
            slug=c["slug"],
            aliases=c.get("aliases", []),
            keywords=c.get("keywords", ""),
        ))
        count += 1

    print(f"  Migrated {count} companies")


def migrate_keywords(db):
    config_path = CONFIG_DIR / "keywords.yml"
    if not config_path.exists():
        return

    with open(config_path) as f:
        config = yaml.safe_load(f)

    count = 0
    for name, group in config.get("keyword_groups", {}).items():
        existing = db.query(KeywordGroup).filter_by(name=name).first()
        if existing:
            continue
        db.add(KeywordGroup(
            name=name,
            query=group["query"],
            category=group.get("category", name),
        ))
        count += 1

    print(f"  Migrated {count} keyword groups")


def migrate_articles(db):
    data_path = DATA_DIR / "news.json"
    if not data_path.exists():
        return

    with open(data_path) as f:
        articles = json.load(f)

    count = 0
    for a in articles:
        existing = db.query(Article).filter_by(url_hash=a["id"]).first()
        if existing:
            continue

        pub_at = None
        if a.get("published_at"):
            try:
                pub_at = datetime.fromisoformat(a["published_at"])
            except (ValueError, TypeError):
                pass

        db.add(Article(
            url_hash=a["id"],
            title=a.get("title", ""),
            url=a.get("url", ""),
            source=a.get("source", ""),
            published_at=pub_at,
            category=a.get("category", ""),
            isin=a.get("isin"),
            company_name=a.get("company_name"),
            company_slug=a.get("company_slug"),
            snippet=a.get("snippet", ""),
            summary=a.get("summary"),
        ))
        count += 1

    print(f"  Migrated {count} articles")


def migrate_drhp(db):
    data_path = DATA_DIR / "drhp_filings.json"
    if not data_path.exists():
        return

    with open(data_path) as f:
        filings = json.load(f)

    count = 0
    for f_data in filings:
        existing = db.query(DRHPFiling).filter_by(company=f_data["company"]).first()
        if existing:
            continue

        first_seen = None
        if f_data.get("first_seen"):
            try:
                first_seen = datetime.fromisoformat(f_data["first_seen"])
            except (ValueError, TypeError):
                pass

        db.add(DRHPFiling(
            company=f_data["company"],
            isin=f_data.get("isin"),
            filed_date=f_data.get("filed_date", ""),
            doc_type=f_data.get("doc_type", ""),
            status=f_data.get("status", ""),
            category=f_data.get("category", ""),
            drhp_url=f_data.get("drhp_url", ""),
            first_seen=first_seen,
        ))
        count += 1

    print(f"  Migrated {count} DRHP filings")


if __name__ == "__main__":
    run()
