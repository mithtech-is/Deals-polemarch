# UnlistedPulse - Pre-IPO & Unlisted Shares News Aggregator

## Context

No single platform aggregates unlisted/pre-IPO share news the way Zerodha Pulse does for listed markets. Investors tracking this space must manually check 10+ sources. UnlistedPulse solves this by aggregating news, DRHP filings, and GMP data into a single dashboard with instant alerts for important events.

**Polemarch Integration:** This system also serves as the news backend for Polemarch Deals (existing web app with a company database). Each company is identified by ISIN. The static site exposes JSON endpoints that Polemarch reads to display news on each company's deal page.

## Architecture

```
Cron (every 15 min)
  └→ Python scrapers (3 modules)
       ├→ Google News RSS parser
       ├→ SEBI DRHP scraper (via Chittorgarh)
       └→ GMP scraper (via Chittorgarh)
       │
       ├→ Write to data/*.json
       ├→ Diff detection → Alert via Emailit (new DRHP, big GMP moves)
       │
       └→ Astro build → Wrangler deploy to Cloudflare Pages
```

**Stack:**
- Scrapers: Python 3.12+ (feedparser, httpx, beautifulsoup4, pyyaml)
- Frontend: Astro (static site generator)
- Hosting: Cloudflare Pages (via Wrangler CLI)
- Alerts: Emailit API (1M emails/month free)
- Scheduling: System cron on local laptop

## Data Sources

### 1. Google News RSS

**Feed URL format:**
```
https://news.google.com/rss/search?q={url_encoded_query}&hl=en-IN&gl=IN&ceid=IN:en
```

**Keyword groups (configured in `config/keywords.yml`):**

```yaml
keyword_groups:
  unlisted:
    query: '"unlisted shares" OR "unlisted stock" OR "pre-IPO shares" OR "pre IPO India"'
    category: unlisted

  ipo_pipeline:
    query: '"upcoming IPO" OR "DRHP filed" OR "IPO approved SEBI" OR "IPO listing"'
    category: ipo
```

**Company-specific queries are auto-generated from `config/companies.yml`** (see below).

## Company Registry (`config/companies.yml`)

Source of truth for all tracked companies. Each company has an ISIN (join key with Polemarch), a canonical name, aliases for matching, and keywords for Google News queries.

```yaml
companies:
  - isin: INE0DJ201029
    name: API Holdings Limited
    slug: api-holdings
    aliases:
      - API Holdings
      - Pharmeasy
      - PharmEasy
    keywords: '"API Holdings" OR "Pharmeasy" OR "PharmEasy IPO"'

  - isin: INE516Y01024
    name: National Stock Exchange of India
    slug: nse
    aliases:
      - NSE
      - National Stock Exchange
    keywords: '"NSE IPO" OR "National Stock Exchange IPO"'

  - isin: INE0NDW01019
    name: Oravel Stays Limited
    slug: oyo
    aliases:
      - OYO
      - OYO Rooms
      - PRISM Hotels
    keywords: '"OYO IPO" OR "PRISM IPO" OR "Oravel Stays"'

  - isin: INE018E01016
    name: Flipkart Private Limited
    slug: flipkart
    aliases:
      - Flipkart
    keywords: '"Flipkart IPO" OR "Flipkart listing"'

  - isin: INE0JME01010
    name: PhonePe Private Limited
    slug: phonepe
    aliases:
      - PhonePe
    keywords: '"PhonePe IPO" OR "PhonePe unlisted"'

  - isin: INE03WK01018
    name: Imagine Marketing Limited
    slug: boat
    aliases:
      - boAt
      - Imagine Marketing
    keywords: '"boAt IPO" OR "Imagine Marketing IPO"'
  # Add more companies as needed
```

**How matching works:**
1. Google News RSS: Each company's `keywords` field becomes a separate RSS query
2. Article matching: After fetching, article titles/snippets are checked against all `aliases` (case-insensitive) to tag the ISIN
3. DRHP/GMP matching: Company names from Chittorgarh are fuzzy-matched against `aliases` to attach ISINs
4. Unmatched articles (from generic keyword groups) get `isin: null`

**Parser output per article:**
```json
{
  "id": "hash of url",
  "title": "NSE IPO: 20 merchant banks appointed...",
  "url": "https://original-source.com/article",
  "source": "BusinessToday",
  "published_at": "2026-04-05T10:30:00Z",
  "category": "ipo",
  "isin": "INE516Y01024",
  "company_name": "National Stock Exchange of India",
  "company_slug": "nse",
  "snippet": "First 200 chars of description..."
}
```

**Deduplication:** Hash of article URL. If the same URL appears across multiple keyword queries, keep the first occurrence.

### 2. SEBI DRHP Filings

**Source:** https://www.chittorgarh.com/report/upcoming-ipos-drhp-filed/158/all/

This page has a structured HTML table with columns:
- Company Name
- Filing Date
- Issue Size
- Status (Filed / Under Review / Approved)
- Exchange (NSE/BSE)

**Scraper approach:** Use httpx + BeautifulSoup to parse the table. Compare against previous `data/drhp_filings.json` to detect new filings.

**Output per filing:**
```json
{
  "company": "SRI Technologies Ltd",
  "isin": "INE...",
  "filed_date": "2026-01-30",
  "issue_size": "500 Cr",
  "status": "Under Review",
  "exchange": "NSE",
  "drhp_url": "https://nsearchives.nseindia.com/...",
  "first_seen": "2026-01-31T08:15:00Z"
}
```

### 3. GMP Data

**Source:** https://www.chittorgarh.com/newportal/ipo_gray_market_premium.asp

HTML table with columns:
- IPO Name
- IPO Price
- GMP (Rs)
- GMP (%)
- Estimated Listing Price
- IPO Date

**Scraper approach:** Same as DRHP - httpx + BeautifulSoup table parsing.

**Output per entry:**
```json
{
  "company": "SBI Cards",
  "isin": "INE...",
  "ipo_price": 755,
  "gmp": 80,
  "gmp_percent": 10.6,
  "estimated_listing": 835,
  "ipo_date": "2026-04-10",
  "updated_at": "2026-04-05T10:00:00Z"
}
```

## Alert System

**Trigger conditions:**
1. **New DRHP filing** - company not previously in `drhp_filings.json`
2. **DRHP status change** - e.g., "Filed" → "Approved"
3. **Big GMP move** - GMP changes by more than 20% since last scrape
4. **New major news** - article title contains a tracked company name AND is from a top-tier source (ET, Moneycontrol, LiveMint, BusinessToday)

**Email delivery:**
- Emailit REST API: `POST https://api.emailit.com/v2/emails` with Bearer auth
- Send to a configured subscriber list (start with just your email)
- Subject: `[UnlistedPulse] {event_type}: {summary}`
- Body: HTML email with link to the article/filing + link to dashboard

**Config:**
```yaml
alerts:
  emailit_api_key: "${EMAILIT_API_KEY}"
  sender: "alerts@unlistedpulse.com"  # or whatever domain you have
  subscribers:
    - "your@email.com"
  thresholds:
    gmp_change_percent: 20  # alert if GMP moves more than this %
```

## Polemarch Integration

Polemarch Deals reads news from the static site's JSON endpoints. The Astro build outputs API-like JSON files alongside HTML pages:

**Static JSON endpoints (in `site/public/api/`):**
- `/api/news.json` - all news articles (last 7 days)
- `/api/news/by-isin/{isin}.json` - news filtered by company ISIN
- `/api/drhp.json` - all DRHP filings
- `/api/gmp.json` - current GMP data
- `/api/companies.json` - company registry with ISINs

Polemarch fetches `/api/news/by-isin/INE0DJ201029.json` to show API Holdings news on its deal page. ISIN is the join key.

These JSON files are generated during the Astro build step as static files alongside the HTML pages.

## Frontend (Astro)

### Pages

1. **`/` (Home/Dashboard)** - four sections:
   - Latest News (most recent 20 articles, paginated)
   - DRHP Tracker (table of all filings with status badges)
   - GMP Watch (table of active IPO GMPs, sorted by date)
   - Trending (companies mentioned most in the last 7 days)

2. **`/news`** - full news feed with category filters (unlisted / ipo / company-specific)

3. **`/company/[slug]`** - per-company page with all related news, DRHP status, GMP if applicable

### Design

- Clean, minimal design similar to Zerodha Pulse
- Light theme, good typography
- Cards for news articles (title, source, time ago, category badge)
- Tables for DRHP and GMP data
- Responsive (mobile-first)
- Tailwind CSS via Astro integration

### Data Loading

Astro reads from `data/*.json` at build time. No client-side API calls needed since the site is fully static and rebuilt every 15 minutes.

## Project Structure

```
News/
├── config/
│   ├── keywords.yml          # Keyword groups for generic queries + alert thresholds
│   └── companies.yml         # Company registry: ISIN, name, aliases, keywords
├── scrapers/
│   ├── __init__.py
│   ├── main.py               # Orchestrator: run all scrapers, detect changes, send alerts
│   ├── google_news.py        # Google News RSS parser
│   ├── drhp.py               # SEBI DRHP scraper
│   ├── gmp.py                # GMP scraper
│   ├── alerts.py             # Emailit integration + diff detection
│   └── utils.py              # Shared helpers (hashing, date parsing, etc.)
├── data/
│   ├── news.json             # Aggregated news articles
│   ├── drhp_filings.json     # DRHP filing tracker
│   ├── gmp.json              # GMP data
│   └── meta.json             # Last scrape timestamps, stats
├── site/                     # Astro project
│   ├── astro.config.mjs
│   ├── package.json
│   ├── src/
│   │   ├── layouts/
│   │   │   └── Base.astro
│   │   ├── components/
│   │   │   ├── NewsCard.astro
│   │   │   ├── DRHPTable.astro
│   │   │   ├── GMPTable.astro
│   │   │   └── TrendingCompanies.astro
│   │   └── pages/
│   │       ├── index.astro
│   │       ├── news.astro
│   │       └── company/
│   │           └── [slug].astro
│   └── public/
│       └── favicon.svg
├── scripts/
│   └── run.sh                # Cron entry: scrape → build → deploy
├── requirements.txt
└── wrangler.toml             # Cloudflare Pages config
```

## Cron Flow (`scripts/run.sh`)

```bash
#!/bin/bash
cd /Users/manojmbhat/Coding/News

# 1. Run scrapers
python -m scrapers.main

# 2. Copy data to Astro
cp data/*.json site/src/data/

# 3. Build Astro
cd site && npm run build

# 4. Deploy to Cloudflare Pages
npx wrangler pages deploy dist/ --project-name unlisted-pulse
```

Crontab entry: `*/15 * * * * /Users/manojmbhat/Coding/News/scripts/run.sh >> /tmp/unlisted-pulse.log 2>&1`

## Data Retention

- `news.json`: Keep last 7 days of articles (prune older entries on each run)
- `drhp_filings.json`: Keep all (small dataset, grows slowly)
- `gmp.json`: Keep current + last 30 days of history for trend display
- `meta.json`: Overwritten each run

## Verification Plan

1. Run each scraper individually and check JSON output
2. Verify deduplication works (run same scraper twice, count should not double)
3. Trigger alert conditions manually and verify email delivery via Emailit
4. Build Astro site locally and verify all 4 dashboard sections render
5. Deploy to Cloudflare Pages and verify the live site
6. Set up cron and verify end-to-end after 2-3 cycles
