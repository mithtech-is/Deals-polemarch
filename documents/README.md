# Polemarch Deals — Documentation

Polemarch Deals is a platform for investing in unlisted / pre-IPO Indian shares. It is composed of **four subsystems** unified by **ISIN** as the universal join key:

```
           ┌─────────────────────────────────────────────┐
           │               ISIN (e.g. INE0DJ201029)      │
           └─────────────────────────────────────────────┘
             ▲            ▲              ▲           ▲
             │            │              │           │
         ┌───┴───┐   ┌────┴────┐   ┌─────┴────┐  ┌───┴────┐
         │ Medusa│   │ Calcula │   │News Event│  │Store-  │
         │backend│   │(finance)│   │(scrapers)│  │front   │
         └───┬───┘   └────┬────┘   └─────┬────┘  └───┬────┘
             │            │              │           │
       products,     authoritative   articles,   user-facing
       carts,        financials &    DRHP, GMP,  deal pages,
       KYC, orders   prices          news API    cart, KYC
```

## Subsystems

| Folder | Role | Stack |
|---|---|---|
| [`backend/`](./backend-medusa.md) | Commerce engine, KYC, cached financials, admin dashboard | Medusa v2, Node 20, Postgres |
| [`storefront/`](./storefront.md) | Public investor site | Next.js 16 App Router, React 19, Tailwind 4 |
| [`calcula/`](./calcula.md) | Authoritative source of company financials, periods, prices; editorial CMS | NestJS + GraphQL, Prisma, Next.js admin |
| [`news_event/`](./news-event.md) | News / DRHP / GMP scrapers tagged by ISIN | Python 3.12, FastAPI, Astro |

## Documents in this folder

| File | Purpose |
|---|---|
| [architecture.md](./architecture.md) | High-level architecture, tech stack, deployment, data flows, ISIN contract |
| [backend-medusa.md](./backend-medusa.md) | Medusa backend deep-dive (modules, API routes, admin widgets, subscribers, jobs, hooks) |
| [storefront.md](./storefront.md) | Next.js storefront deep-dive (pages, components, contexts, API client, snapshot cache) |
| [calcula.md](./calcula.md) | Calcula app deep-dive (NestJS backend, Prisma models, write-path invariants, Next.js admin) |
| [news-event.md](./news-event.md) | News scraper deep-dive (Python scrapers, FastAPI admin, Astro JSON API, storefront contract) |
| [data-model-and-isin.md](./data-model-and-isin.md) | Data model reference and ISIN join-key matrix across all four subsystems |
| [integrations.md](./integrations.md) | Inter-service flows and contracts. Authoritative reference for the sync pipeline invariants (snake_case wire format, snapshot cache invalidation, value-based loop breaker, Cache-Control rules) |
| [data_handling.md](./data_handling.md) | Long-form data handling reference — blob shapes, storage, client caches, extensibility guide |
| [feature-plan-cms-sections.md](./feature-plan-cms-sections.md) | Historical design record. **All 7 phases shipped.** See subsystem docs for the current shape. |

## Current state (April 2026)

### Sync pipeline

1. **Wire format is snake_case** on the envelope: `statements_version`, `price_version`, `news_version`, `editorial_version`, `content_updated_at`. Medusa's `handleVersionEnvelope` reads those exact keys. See [integrations.md §6](./integrations.md).
2. **Single shared webhook secret** under `CALCULA_WEBHOOK_SECRET` on both services. Calcula's `MEDUSA_WEBHOOK_SECRET` is a back-compat fallback only.
3. **Four snapshot kinds** between Calcula and Medusa: `statements`, `prices`, `news`, `editorial`. Each has its own version column on `Company` / `company_record` and its own `kind=...` query param on the store route. ETag is `"<s>:<p>:<n>:<e>"`.
4. **Calcula's snapshot cache is invalidated on every write** (`PricesService`, `FinancialsService`, `PeriodsService`, `NewsEventsService`, `EditorialService` all bump version + invalidate + fire webhook in that order).
5. **Value-based loop breaker**: Medusa subscribers compare outgoing price pushes against `globalThis.__calculaLastFromCalcula[isin]`; equal → skip as echo, different → push. Race-free and loss-free.
6. **`pushPriceToCalcula` uses `new Date()` as the default datetime** so the new row is always the latest-by-datetime in the price_snapshot series.
7. **Medusa `/store/calcula/isin/:isin/snapshot` sends `Cache-Control: private, max-age=0, must-revalidate`** with ETag short-circuit. Browsers always revalidate.
8. **Storefront `CACHE_TTL_MS = 0`** — every call issues a conditional GET; cache only holds the body for 304 replies.
9. **ISIN is optional at product create** (no `product.create` injection zone in Medusa v2 admin). ISIN is linked post-create via the `calcula-fields.tsx` widget on the product details page.

### Deal detail page composition

1. Header price (`variant.calculated_price.calculated_amount`) + buy box
2. `PriceChart` — C/N/R event markers, filter pills, Daily/Weekly granularity toggle, Custom date range picker, 1M/6M/1Y/3Y/5Y/MAX presets
3. `FinancialStatements` — collapsible P&L / Balance Sheet / Cash Flow with year-selector dropdown
4. `CompanyOverviewPanel` — markdown narrative + collapsible Business Model / Moat / Risks sections
5. `ProsConsPanel` — two-column curated investment thesis
6. `NewsPanel` — filterable by C/N/R with expandable bodies and source links
7. `EventTimeline` — vertical chronological view of the same `NewsEvent` data

See [integrations.md](./integrations.md) for the full failure modes that produced these invariants.

## Deployment domains

- Storefront → `deals.polemarch.in`
- Calcula admin frontend → `calcula.in`
- Medusa backend + Calcula backend → subdomains of `polemarch.in`
