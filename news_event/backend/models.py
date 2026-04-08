"""SQLAlchemy models for UnlistedPulse."""

from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, Float, DateTime, JSON, Boolean
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    isin = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    aliases = Column(JSON, default=list)  # ["NSE", "National Stock Exchange"]
    keywords = Column(Text, default="")  # Google News search query
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "isin": self.isin,
            "name": self.name,
            "slug": self.slug,
            "aliases": self.aliases or [],
            "keywords": self.keywords or "",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    url_hash = Column(String(16), unique=True, nullable=False, index=True)
    title = Column(String(500), nullable=False)
    url = Column(Text, nullable=False)
    source_url = Column(Text, default="")  # Actual article URL (resolved from Google News)
    source = Column(String(200), default="")
    published_at = Column(DateTime, index=True)
    category = Column(String(50), default="", index=True)
    isin = Column(String(20), index=True)
    company_name = Column(String(200))
    company_slug = Column(String(100))
    snippet = Column(Text, default="")
    summary = Column(Text)
    image_url = Column(Text)
    full_text = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.url_hash,
            "title": self.title,
            "url": self.source_url or self.url,
            "source": self.source,
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "category": self.category,
            "isin": self.isin,
            "company_name": self.company_name,
            "company_slug": self.company_slug,
            "snippet": self.snippet,
            "summary": self.summary,
            "image_url": self.image_url,
        }


class DRHPFiling(Base):
    __tablename__ = "drhp_filings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company = Column(String(200), nullable=False)
    isin = Column(String(20), index=True)
    filed_date = Column(String(50))
    doc_type = Column(String(100))
    status = Column(String(100))
    category = Column(String(100))
    drhp_url = Column(Text)
    first_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "company": self.company,
            "isin": self.isin,
            "filed_date": self.filed_date,
            "doc_type": self.doc_type,
            "status": self.status,
            "drhp_url": self.drhp_url,
            "first_seen": self.first_seen.isoformat() if self.first_seen else None,
        }


class KeywordGroup(Base):
    __tablename__ = "keyword_groups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    query = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "query": self.query, "category": self.category}


class ScrapeRun(Base):
    __tablename__ = "scrape_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    started_at = Column(DateTime, nullable=False)
    finished_at = Column(DateTime)
    news_total = Column(Integer, default=0)
    news_new = Column(Integer, default=0)
    drhp_total = Column(Integer, default=0)
    summaries_generated = Column(Integer, default=0)
    errors = Column(JSON, default=list)
    status = Column(String(20), default="running")  # running, completed, failed

    def to_dict(self):
        return {
            "id": self.id,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "news_total": self.news_total,
            "news_new": self.news_new,
            "drhp_total": self.drhp_total,
            "summaries_generated": self.summaries_generated,
            "errors": self.errors or [],
            "status": self.status,
        }
