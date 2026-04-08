# Architecture

## System overview

Four cooperating services, keyed by **ISIN**:

```
                       ┌────────────────────┐
                       │  Storefront (Next) │
                       │ deals.polemarch.in │
                       └─────────┬──────────┘
                                 │ REST (/store/*)
                                 ▼
   ┌──────────────┐   price   ┌──────────────────┐   drift/pull   ┌─────────────────┐
   │ news_event   │           │  Medusa backend  │◀──────────────▶│   Calcula API   │
   │  (Python)    │           │  (Node, Postgres)│   envelope     │ (NestJS/Prisma) │
   │  Astro JSON  │           │  company_record  │                │  authoritative  │
   │  /api/news   │──fetch───▶│  cache by ISIN   │                │  financials     │
   └──────────────┘           └──────────────────┘                └─────────────────┘
```

## Tech stack

| Layer | Tech |
|---|---|
| Medusa backend | Node 20, Medusa v2, Express, Postgres, Redis, multer, zod, helmet, `@medusajs/analytics-posthog` |
| Storefront | Next.js 16 App Router (Turbopack), React 19, Tailwind 4, ECharts (tree-shaken), zod |
| Calcula backend | NestJS, GraphQL (Apollo), Prisma, Postgres, JWT auth, WebhookService |
| Calcula frontend | Next.js (App Router), custom auth context, GraphQL via minimal fetch helper |
| news_event scrapers | Python 3.12, feedparser, httpx, BeautifulSoup, lxml, pyyaml, Anthropic SDK |
| news_event admin | FastAPI, SQLAlchemy, Jinja2 |
| news_event public site | Astro (static output, Tailwind) |

## ISIN as the universal join key

Every subsystem stores and indexes on ISIN (e.g. `INE0DJ201029`):

| Subsystem | Where ISIN lives |
|---|---|
| Medusa | `products.metadata.isin`, `company_record.isin` |
| Calcula | `companies.isin` (unique) |
| news_event | `companies.isin`, `articles.isin`, `drhp_filings.isin` |
| Storefront | Looked up via product metadata, passed to `/store/calcula/isin/:isin` and news JSON |

There is **no separate mapping table** — ISIN is the contract. `product.metadata.isin` is not enforced at create time (Medusa v2 admin has no `product.create` injection zone). It is linked post-create via the `calcula-fields.tsx` widget on the product details page, which PATCHes `metadata.isin`.

## Data flow narratives

### 1. Price sync (Medusa ↔ Calcula, bidirectional)

**Medusa → Calcula (event-driven push):**
1. Admin updates a variant price in Medusa (any admin path).
2. Subscribers `backend/src/subscribers/calcula-price-sync.ts` (on `product.updated`) and `calcula-variant-price-sync.ts` (on `product-variant.updated`) fire.
3. Each subscriber first calls `globalThis.__calculaIsLoopEchoPush(isin, priceInr)`. If the new price equals the last value we received from Calcula for this ISIN, it's a loop echo → skip.
4. Otherwise: `calcula.pushPriceToCalcula({ isin, price })` → POST `/api/companies/by-isin/:isin/price` with `datetime = new Date().toISOString()`.

**Calcula → Medusa (webhook + reverse sync):**
1. Calcula's `PricesService.upsertOne` writes the row, `bumpPriceVersion` increments `priceVersion`, invalidates the 5s snapshot cache, fires `syncToMedusa(companyId)`.
2. Medusa's `POST /webhooks/calcula` route verifies `X-Webhook-Secret` matches `CALCULA_WEBHOOK_SECRET`.
3. Route calls `calcula.handleVersionEnvelope(payload)` → compares local versions → pulls `/snapshot/prices` → writes `price_snapshot` into `company_record`.
4. Route then calls `syncLatestPriceToMedusaVariant(req.scope, isin, latestPrice)` — this must run at the **route scope**, not the module scope (Medusa v2 module containers don't have the Query Graph or core workflows).
5. The helper records `latestPrice` in `globalThis.__calculaLastFromCalcula[isin]`, resolves the product via `metadata.isin`, and runs `updateProductVariantsWorkflow` to sync the INR price. If it already matches, no-op.
6. The subsequent `product-variant.updated` event fires our own subscribers, but they see `lastFromCalcula[isin] === outgoingPrice` and skip as a loop echo.

### 2. Version envelope (Calcula → Medusa, push fallback)

Fires for every Calcula write (prices, statements, periods, news events, editorial). `WebhookService.syncToMedusa` reads the current `Company` row, builds the snake_case envelope `{ isin, company_id, company_name, statements_version, price_version, news_version, editorial_version, content_updated_at }`, POSTs to Medusa. Medusa's `handleVersionEnvelope` compares versions and pulls whichever snapshots are stale. Four independent branches: `needStatements`, `needPrices`, `needNews`, `needEditorial`. Each branch fetches the relevant `/api/companies/by-isin/:isin/snapshot/*` endpoint and writes the raw text into the matching `company_record.*_snapshot` column.

### 3. Drift reconciliation (Medusa cron, 60s)

`backend/src/jobs/sync-calcula-snapshots.ts` runs every minute:
1. Queries Medusa's `company_record` for `max(content_updated_at)` (projected single-row read).
2. Calls Calcula `GET /api/snapshots/versions-since?since=<highWater>&limit=500`.
3. For each drifted envelope, calls `handleVersionEnvelope` with bounded concurrency 8 (`mapLimit`).
4. Collects `priceUpdatedIsins` and runs `syncLatestPriceToMedusaVariant` for each — the job container has full Medusa container access, unlike module scope.

This catches anything the real-time webhook missed (delivery failure, Medusa restart, secret mismatch during rotation).

### 4. News tagging (news_event cron, ~15 min)

1. `scrapers/main.py` orchestrates `google_news.py`, `drhp.py`, `gmp.py`, `summarizer.py`.
2. `google_news.py` pulls RSS feeds from `config/keywords.yml` + per-company queries from `config/companies.yml`.
3. Articles are fuzzy-matched to company aliases and tagged with ISIN.
4. `summarizer.py` calls Anthropic Claude to generate article summaries.
5. Output written to `data/articles.json`, `data/by-isin/*.json`, then published via Astro to `/api/news`, `/api/news/by-isin/:isin`.

### 5. Storefront deal render

1. Storefront fetches `GET /store/products?handle=…&region_id=…` → product + variant with `calculated_price`.
2. `variant.calculated_price.calculated_amount` drives the headline "Rs. X" price on the deal page.
3. For financials / chart / news / editorial: `getSnapshot(isin, "statements" | "prices" | "news" | "editorial")` → `/store/calcula/isin/:isin/snapshot?kind=…`.
4. Cache layer: memory Map → sessionStorage → network. `CACHE_TTL_MS = 0` means every call is a conditional GET using the stored ETag; a 304 reply reuses the cached body.
5. Medusa responds with `Cache-Control: private, max-age=0, must-revalidate`. Browsers always revalidate — no stale data after admin edits.
6. Components composed on the deal page: `PriceChart` (prices kind with C/N/R markers), `FinancialStatements` (statements kind), `CompanyOverviewPanel` / `ProsConsPanel` (editorial kind), `NewsPanel` / `EventTimeline` (news kind).
7. The ETag `"<s>:<p>:<n>:<e>"` is composed of all four version numbers so any kind's bump invalidates every cached body for that ISIN.

## Deployment

- `deals.polemarch.in` — Storefront (Next.js)
- `calcula.in` — Calcula admin frontend
- Backend subdomains of `polemarch.in` host the Medusa backend and Calcula API
- `backend/render.yaml` describes the Medusa web service + Postgres + Redis
- News Event's Astro site can be deployed to Cloudflare Pages
