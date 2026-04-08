"""FastAPI admin backend for UnlistedPulse."""

import re
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Depends, Request, Form, BackgroundTasks, Query
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from .db import get_db, init_db, SessionLocal
from .models import Company, Article, DRHPFiling, KeywordGroup, ScrapeRun

app = FastAPI(title="UnlistedPulse Admin")

BASE_DIR = Path(__file__).parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


@app.on_event("startup")
def startup():
    init_db()


# ─── Helper ──────────────────────────────────────────────────────────

def time_ago(dt: datetime | None) -> str:
    if not dt:
        return "never"
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    diff = now - dt
    mins = int(diff.total_seconds() / 60)
    if mins < 60:
        return f"{mins}m ago"
    hours = mins // 60
    if hours < 24:
        return f"{hours}h ago"
    return f"{hours // 24}d ago"


templates.env.filters["time_ago"] = time_ago


# ─── Admin Pages ─────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
@app.get("/admin", response_class=HTMLResponse)
def admin_dashboard(request: Request, db: Session = Depends(get_db)):
    article_count = db.query(func.count(Article.id)).scalar()
    company_count = db.query(func.count(Company.id)).scalar()
    drhp_count = db.query(func.count(DRHPFiling.id)).scalar()
    summarized_count = db.query(func.count(Article.id)).filter(
        Article.summary.isnot(None), Article.summary != ""
    ).scalar()
    last_run = db.query(ScrapeRun).order_by(desc(ScrapeRun.id)).first()
    recent_articles = db.query(Article).order_by(desc(Article.published_at)).limit(10).all()

    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "article_count": article_count,
        "company_count": company_count,
        "drhp_count": drhp_count,
        "summarized_count": summarized_count,
        "last_run": last_run,
        "recent_articles": recent_articles,
    })


@app.get("/admin/companies", response_class=HTMLResponse)
def admin_companies(request: Request, db: Session = Depends(get_db)):
    companies = db.query(Company).order_by(Company.name).all()
    return templates.TemplateResponse("companies.html", {
        "request": request,
        "companies": companies,
    })


@app.post("/admin/companies/add")
def admin_add_company(
    isin: str = Form(...),
    name: str = Form(...),
    slug: str = Form(""),
    aliases: str = Form(""),
    keywords: str = Form(""),
    db: Session = Depends(get_db),
):
    if not slug:
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    alias_list = [a.strip() for a in aliases.split(",") if a.strip()]

    db.add(Company(isin=isin, name=name, slug=slug, aliases=alias_list, keywords=keywords))
    db.commit()
    return RedirectResponse("/admin/companies", status_code=303)


@app.post("/admin/companies/{company_id}/edit")
def admin_edit_company(
    company_id: int,
    isin: str = Form(...),
    name: str = Form(...),
    slug: str = Form(...),
    aliases: str = Form(""),
    keywords: str = Form(""),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter_by(id=company_id).first()
    if company:
        company.isin = isin
        company.name = name
        company.slug = slug
        company.aliases = [a.strip() for a in aliases.split(",") if a.strip()]
        company.keywords = keywords
        db.commit()
    return RedirectResponse("/admin/companies", status_code=303)


@app.post("/admin/companies/{company_id}/delete")
def admin_delete_company(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).filter_by(id=company_id).first()
    if company:
        db.delete(company)
        db.commit()
    return RedirectResponse("/admin/companies", status_code=303)


@app.get("/admin/articles", response_class=HTMLResponse)
def admin_articles(
    request: Request,
    category: Optional[str] = None,
    company: Optional[str] = None,
    page: int = Query(1, ge=1),
    db: Session = Depends(get_db),
):
    per_page = 20
    q = db.query(Article)
    if category:
        q = q.filter(Article.category == category)
    if company:
        q = q.filter(Article.company_slug == company)

    total = q.count()
    articles = q.order_by(desc(Article.published_at)).offset((page - 1) * per_page).limit(per_page).all()
    companies = db.query(Company).order_by(Company.name).all()

    return templates.TemplateResponse("articles.html", {
        "request": request,
        "articles": articles,
        "companies": companies,
        "total": total,
        "page": page,
        "pages": (total + per_page - 1) // per_page,
        "category": category,
        "company_filter": company,
    })


@app.get("/admin/runs", response_class=HTMLResponse)
def admin_runs(request: Request, db: Session = Depends(get_db)):
    runs = db.query(ScrapeRun).order_by(desc(ScrapeRun.id)).limit(50).all()
    return templates.TemplateResponse("runs.html", {"request": request, "runs": runs})


@app.post("/admin/scrape")
def admin_trigger_scrape(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_scraper_task)
    return RedirectResponse("/admin/runs", status_code=303)


def run_scraper_task():
    """Run the scraper pipeline in a background thread."""
    from scrapers import google_news, drhp, summarizer
    from scrapers.utils import now_iso

    db = SessionLocal()
    run = ScrapeRun(started_at=datetime.now(timezone.utc), status="running")
    db.add(run)
    db.commit()

    errors = []

    # 1. Google News
    try:
        new_articles, all_articles = google_news.scrape()
        # Import new articles into DB
        for a in new_articles:
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
                url_hash=a["id"], title=a.get("title", ""), url=a.get("url", ""),
                source_url=a.get("source_url", ""), source=a.get("source", ""),
                published_at=pub_at, category=a.get("category", ""),
                isin=a.get("isin"), company_name=a.get("company_name"),
                company_slug=a.get("company_slug"), snippet=a.get("snippet", ""),
                image_url=a.get("image_url"),
            ))
        db.commit()
        run.news_new = len(new_articles)
        run.news_total = len(all_articles)
    except Exception as e:
        errors.append(f"google_news: {e}")

    # 2. DRHP
    try:
        new_drhp, changed, all_drhp = drhp.scrape()
        for f_data in all_drhp:
            existing = db.query(DRHPFiling).filter_by(company=f_data["company"]).first()
            if existing:
                existing.status = f_data.get("status", existing.status)
                continue
            first_seen = None
            if f_data.get("first_seen"):
                try:
                    first_seen = datetime.fromisoformat(f_data["first_seen"])
                except (ValueError, TypeError):
                    pass
            db.add(DRHPFiling(
                company=f_data["company"], isin=f_data.get("isin"),
                filed_date=f_data.get("filed_date", ""), doc_type=f_data.get("doc_type", ""),
                status=f_data.get("status", ""), category=f_data.get("category", ""),
                drhp_url=f_data.get("drhp_url", ""), first_seen=first_seen,
            ))
        db.commit()
        run.drhp_total = len(all_drhp)
    except Exception as e:
        errors.append(f"drhp: {e}")

    # 3. Summarize
    try:
        count = summarizer.scrape()
        run.summaries_generated = count
        # Sync summaries to DB
        from scrapers.utils import load_json
        articles_data = load_json("news.json")
        for a in articles_data:
            if a.get("summary"):
                db_article = db.query(Article).filter_by(url_hash=a["id"]).first()
                if db_article and not db_article.summary:
                    db_article.summary = a["summary"]
        db.commit()
    except Exception as e:
        errors.append(f"summarizer: {e}")

    run.finished_at = datetime.now(timezone.utc)
    run.errors = errors
    run.status = "failed" if errors else "completed"
    db.commit()
    db.close()


# ─── JSON API ────────────────────────────────────────────────────────

@app.get("/api/articles")
def api_articles(
    category: Optional[str] = None,
    isin: Optional[str] = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(Article)
    if category:
        q = q.filter(Article.category == category)
    if isin:
        q = q.filter(Article.isin == isin)
    articles = q.order_by(desc(Article.published_at)).limit(limit).all()
    return [a.to_dict() for a in articles]


@app.get("/api/companies")
def api_companies(db: Session = Depends(get_db)):
    return [c.to_dict() for c in db.query(Company).order_by(Company.name).all()]


@app.post("/api/companies")
def api_add_company(
    isin: str = Form(...),
    name: str = Form(...),
    slug: str = Form(""),
    aliases: str = Form(""),
    keywords: str = Form(""),
    db: Session = Depends(get_db),
):
    if not slug:
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    alias_list = [a.strip() for a in aliases.split(",") if a.strip()]
    company = Company(isin=isin, name=name, slug=slug, aliases=alias_list, keywords=keywords)
    db.add(company)
    db.commit()
    return company.to_dict()


@app.get("/api/drhp")
def api_drhp(db: Session = Depends(get_db)):
    filings = db.query(DRHPFiling).order_by(desc(DRHPFiling.first_seen)).all()
    return [f.to_dict() for f in filings]


@app.get("/api/runs")
def api_runs(limit: int = 20, db: Session = Depends(get_db)):
    runs = db.query(ScrapeRun).order_by(desc(ScrapeRun.id)).limit(limit).all()
    return [r.to_dict() for r in runs]
