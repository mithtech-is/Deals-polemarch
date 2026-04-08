# news_event — News, DRHP, GMP aggregator

Location: `news_event/`. Python-based pipeline that scrapes Google News, SEBI DRHP filings (Chittorgarh), and Grey Market Premium (GMP), tags everything by **ISIN**, and publishes a static JSON API plus an admin dashboard.

## Directory tree

```
news_event/
├── scrapers/
│   ├── __init__.py
│   ├── main.py                 # Orchestrator: runs scrapers, summarizer, alerts
│   ├── google_news.py          # RSS scraper; ISIN-tags articles
│   ├── drhp.py                 # DRHP filings scraper (Chittorgarh)
│   ├── gmp.py                  # GMP scraper (Chittorgarh)
│   ├── summarizer.py           # Anthropic Claude API summaries
│   ├── alerts.py               # Email alerts (Emailit API)
│   ├── generate_api.py         # Build JSON files consumed by Astro
│   └── utils.py                # Date, JSON I/O, fuzzy matching helpers
├── config/
│   ├── companies.yml           # Company registry: ISIN + aliases + per-company keywords
│   └── keywords.yml            # Generic keyword groups (unlisted, ipo_pipeline, …)
├── data/                       # Scraper output
│   ├── articles.json           # All tagged articles
│   ├── drhp_filings.json
│   ├── gmp_data.json
│   ├── meta.json               # Last-run metadata
│   └── by-isin/                # Articles indexed by ISIN
│       └── INE*.json
├── backend/                    # FastAPI admin dashboard
│   ├── app.py
│   ├── models.py               # SQLAlchemy models
│   ├── db.py
│   ├── migrate.py
│   ├── templates/              # Jinja2 pages
│   └── static/
├── site/                       # Astro static site (public)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── index.astro
│   │   │   ├── news/
│   │   │   │   ├── index.astro
│   │   │   │   └── [isin].astro
│   │   │   ├── company/[slug].astro
│   │   │   └── api/            # JSON endpoints (see below)
│   │   ├── layouts/, components/, styles/
│   ├── astro.config.mjs
│   └── dist/                   # Built output (static HTML + JSON)
├── scripts/                    # Scheduled execution helpers
├── docs/
│   └── superpowers/specs/2026-04-05-unlisted-pulse-design.md
├── requirements.txt
└── .env.example                # ANTHROPIC_API_KEY, EMAILIT_API_KEY (optional)
```

## SQLAlchemy models (admin DB)

### `Company`
- `id` PK, `isin` unique indexed, `name`, `slug`, `aliases` (JSON list), `keywords` (text), `created_at`
- Join key with Medusa + Calcula: **ISIN**

### `Article`
- `id` PK, `url_hash` unique indexed
- `title`, `url`, `source_url` (resolved), `source`
- `published_at` indexed, `category`
- `isin` indexed, `company_name`, `company_slug`
- `snippet` (first ~200 chars), `summary` (AI-generated), `image_url`, `full_text`
- `created_at`

### `DRHPFiling`
- `id`, `company`, `isin` indexed, `filed_date`, `doc_type`, `status`, `issue_size`, `exchange`, `link`, `created_at`

### `KeywordGroup`
- `id`, `name`, `query` (Google News RSS query), `category`, `enabled`

### `ScrapeRun`
- `id`, `started_at`, `finished_at`
- `news_total`, `news_new`
- `drhp_total`, `drhp_new`, `drhp_changed`
- `gmp_total`, `gmp_big_moves`
- `alerts_sent`, `summaries_generated`
- `errors` (JSON array)

## Scraper flow (cron, ~every 15 min)

```
python -m scrapers.main
  ├─ google_news.scrape()
  │   ├─ Fetch RSS from config/keywords.yml + per-company queries (companies.yml)
  │   ├─ Parse, dedupe by url_hash
  │   ├─ Fuzzy-match company aliases → tag with ISIN
  │   ├─ Diff against data/articles.json → detect new
  │   └─ Write data/articles.json (+ data/by-isin/*.json)
  ├─ drhp.scrape()
  │   ├─ Scrape Chittorgarh DRHP table
  │   ├─ Fuzzy-match to companies.yml → attach ISIN
  │   └─ Diff against data/drhp_filings.json
  ├─ gmp.scrape()
  │   ├─ Scrape GMP table
  │   └─ Detect "big moves" deltas
  ├─ alerts.send_alerts()            # email notifications (optional)
  ├─ summarizer.scrape()             # Anthropic Claude summaries for new articles
  └─ Save data/meta.json with run stats; insert ScrapeRun row
```

## Public JSON API (Astro)

Built to `site/dist/api/`:

| Endpoint | Shape |
|---|---|
| `GET /api/news` | `{ articles: [{ id, title, url, source, published_at, category, isin, company_name, company_slug, snippet, summary }...] }` |
| `GET /api/news/by-isin/:isin` | `{ isin, company_name, articles: [...] }` |
| `GET /api/companies` | `{ companies: [{ isin, name, slug, aliases }...] }` |
| `GET /api/drhp` | `{ filings: [{ company, isin, filed_date, status, issue_size, exchange, link }...] }` |

The storefront can fetch `/api/news/by-isin/:isin` from a deal detail page to render a news panel.

## Astro pages

- `/` — news homepage with stats
- `/news` — listing with search / filter
- `/news/[isin]` — dynamic page per ISIN
- `/company/[slug]` — company overview + associated news
- `/api/*` — JSON endpoints above

Deployment target: Cloudflare Pages (static) or any static host.

## Admin dashboard (FastAPI)

`backend/app.py` serves:

- **Dashboard** — overview, recent articles, last run stats
- **Companies** — CRUD for the registry (mirrors `companies.yml`)
- **Articles** — list + search + manual editing
- **DRHP** — filings viewer
- **Scrape runs** — history + error log

Templates in `backend/templates/` (Jinja2). DB initialized via `backend/db.py` / `backend/migrate.py`.

## Integration with Polemarch

- `config/companies.yml` is the ISIN registry — aliases are used to tag articles during scraping. Each entry has `isin`, `name`, `slug`, `aliases[]`, `keywords` — the fuzzy matcher in `google_news.py` compares article text against these to attach an ISIN tag.
- The storefront uses the **same ISIN** (`product.metadata.isin`) as Medusa to fetch news from the Astro JSON API. The deal detail page (`storefront/src/app/deals/[id]/page.tsx`) can call `fetch('/api/news/by-isin/:isin')` against the deployed Astro site (or a local `dist/` during dev) and render a news panel below the financials table.
- The admin dashboard (`backend/app.py`) is internal — used by the ops team to review, edit, or retag articles. The storefront never hits it.
- **No direct code link exists between the scraper and Medusa.** The two systems share nothing except the ISIN contract, which is intentional — the scraper can be deployed and iterated on independently of the commerce stack.

### Data-shape contract with the storefront

The storefront treats the `/api/news/by-isin/:isin` endpoint as a read-only third-party JSON source. To add a news panel on the deal page, the storefront needs:

```ts
type NewsResponse = {
  isin: string
  company_name: string
  articles: Array<{
    id: number
    title: string
    url: string
    source: string
    source_url: string | null
    published_at: string       // ISO 8601
    category: string           // e.g. "ipo_pipeline", "unlisted", "corporate_action"
    snippet: string            // first ~200 chars
    summary: string | null     // AI-generated, may be null for fresh articles
    image_url: string | null
  }>
}
```

`published_at` is what the storefront should sort on; `summary` is what to render in the card body with fallback to `snippet`.

### C/N/R category alignment (shipped on the Calcula side)

The storefront already uses a standardized C/N/R tag vocabulary for **two** data sources:

- `Calcula.CompanyPriceHistory.category` — stamped on individual price points, drives chart marker colour
- `Calcula.NewsEvent.category` — stamped on curated news events, drives news panel and timeline marker colour

Both use the same three values and the same palette in the storefront (`C` = emerald corporate, `N` = amber news, `R` = rose regulatory). The scraper still categorizes articles via `KeywordGroup.category` as free-form strings — if you want the **scraper-sourced** news to feed into the same storefront `NewsPanel`, the mapping should be:

- `ipo_pipeline`, `fundraising`, `earnings` → `C`
- `media_coverage`, `rumors`, `general_news` → `N`
- `sebi`, `compliance`, `penalty` → `R`

This is where a scraper enhancement could inject into the Calcula editorial pipeline: run `google_news.py` → classify via keyword mapping → POST to `upsertNewsEvent` on Calcula's GraphQL API with the right category. The scraper output would then flow through Calcula → Medusa snapshot → storefront just like editor-curated events.

## Relevant env vars

```
ANTHROPIC_API_KEY=...            # for summarizer
EMAILIT_API_KEY=...              # optional, for alerts
```
