# Calcula — Financial Data Engine

Location: `calcula/`. Monorepo with a NestJS backend (authoritative financials) and a **Next.js** admin frontend. Consumed by the Medusa backend via REST, authenticated with a webhook secret.

## Directory layout

```
calcula/
├── apps/
│   ├── backend/                  # NestJS + GraphQL + Prisma
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/           # Guards, decorators, shared services
│   │   │   ├── prisma/           # PrismaService / module
│   │   │   └── modules/
│   │   │       ├── analytics/
│   │   │       ├── auth/         # JWT + role-based guards
│   │   │       ├── companies/    # Company CRUD + GraphQL
│   │   │       ├── financials/   # Statement line items
│   │   │       ├── periods/      # Fiscal period management
│   │   │       ├── prices/       # Price history ingestion + queries
│   │   │       ├── snapshots/    # Snapshot pull / version endpoints
│   │   │       └── taxonomy/     # Sectors / industries
│   │   ├── prisma/schema.prisma
│   │   └── package.json
│   └── frontend/                 # Next.js admin UI
│       ├── app/                  # App Router
│       │   ├── login/
│       │   ├── admin/
│       │   │   ├── companies/
│       │   │   └── taxonomy/
│       │   └── company/[id]/     # Company detail (statements, periods, price history)
│       ├── components/
│       │   ├── admin/            # Page sections (price-history-section.tsx, etc.)
│       │   └── ui/               # Modal, form controls, auth-context
│       ├── lib/                  # gql client, queries, utilities
│       └── types/                # Shared domain types
├── docs/
│   ├── PHASE_1_SCOPE.md
│   ├── RUN.md
│   └── DEPLOY_HANDOFF.md
├── scripts/
├── README.md
└── package.json                  # Monorepo workspaces root
```

## Purpose

Calcula is the **authoritative source of truth** for:

- Company metadata (ISIN, CIN, sector, industry, description, listing status)
- Financial statements (Balance Sheet, P&L, Cash Flow) by fiscal period
- Derived metrics (ratios, growth)
- Price history (daily + corporate actions)

Medusa caches snapshots of this data in its `company_record` table keyed by ISIN. Calcula's **versioning columns** drive cache invalidation.

## Prisma models (summary)

### `Company`
- `id` UUID, `name`, `isin` (unique), `cin`, `sector`, `industry`, `listing_status`, `country` (default "IN"), `description`
- **Versioning:** `statements_version`, `price_version`, `content_updated_at` — bumped whenever write endpoints mutate dependent data; used by Medusa for drift detection.
- Relations: `periods[]`, `metrics[]`, `prices[]`

### `FinancialPeriod`
- `id`, `company_id`, `fiscal_year`, `fiscal_quarter`, `period_start`, `period_end`, `is_audited`
- Relations: `company`, `values[] → FinancialMetric`

### `FinancialMetric`
- `id`, `company_id`, `period_id`
- `statement_type` enum: `balance_sheet | pnl | cashflow | derived`
- `code` (e.g. `revenue_from_operations`), `name`, `depth`, `order_code`
- `is_calculated`, `formula`
- `value` (Decimal), `source` enum: `manual | derived`

### `CompanyPriceHistory`
- `id` BigInt autoincrement, `company_id`, `datetime` Timestamptz, `price` Decimal(18,4)
- `note`, `link` (for corporate actions, GMP notes)
- Unique: `(company_id, datetime)`
- Index: `(company_id, datetime DESC)` for time-series queries

### `PlatformUser`
- `id`, `username` unique, `password_hash`, `role` enum (`ADMIN`), timestamps.

## Backend modules

| Module | Responsibility |
|---|---|
| `auth` | Login, JWT issuance, guards |
| `companies` | Company CRUD, by-ISIN lookups |
| `periods` | Fiscal period CRUD — **must call `bumpStatementsForCompany` on every write** (upsert + delete) so Medusa's cache sees new columns. See "Version-bump invariants" below. |
| `financials` | Statement line items (tree + flat views). Bumps `statementsVersion` + invalidates snapshot cache on every write. |
| `prices` | Price history ingestion + queries, with C/N/R category column. Bumps `priceVersion` + invalidates snapshot cache on every write. Exposes `deleteBulk(companyId, ids[])` for the admin bulk-delete action (single version bump for the whole batch). |
| `news-events` | CRUD for `NewsEvent` rows (title, body markdown, C/N/R category, source URL). Bumps `newsVersion` + invalidates cache on every write. Rendered by the storefront `NewsPanel` and `EventTimeline` components. |
| `editorial` | CRUD for `CompanyOverview` (long-form narrative) and `ProsCons`. Both bump a single shared `editorialVersion` — Medusa caches them together under the `editorial` snapshot kind. GraphQL queries are named `companyNarrative` / `companyProsCons` (the analytics module already owns `companyOverview`). |
| `snapshots` | Snapshot pull + drift (`versions-since`). Four kinds: `statementsByIsin`, `pricesByIsin`, `newsByIsin`, `editorialByIsin`. Exposes `invalidate(isin)` which drops **all four** 5s in-memory caches so other services stay consistent. |
| `taxonomy` | Sectors / industries |
| `analytics` | Internal analytics helpers |

### Version-bump invariants (learned from debugging the sync pipeline)

Every write that changes what Medusa caches **must** do three things in order:

1. **Bump the relevant version on `Company`** (`statementsVersion` or `priceVersion`) and set `contentUpdatedAt = new Date()`. This is what Medusa's drift cron polls on.
2. **Call `snapshotsService.invalidate(isin)`** immediately after the transaction commits and *before* the webhook fires. The `SnapshotsService` in-memory cache (5s TTL per ISIN) otherwise serves the pre-write snapshot to Medusa's webhook handler, which then "locks in" stale data under the new version number.
3. **Call `webhookService.syncToMedusa(companyId)`** last (fire-and-forget). The envelope is snake_case (`isin`, `statements_version`, `price_version`, `content_updated_at`) — Medusa's `/webhooks/calcula` handler reads those exact keys.

`PricesService.bumpPriceVersion`, `FinancialsService.upsertFinancialValues`, and `PeriodsService.bumpStatementsForCompany` all follow this pattern. `CompaniesService.update` does **not** (by design — company metadata edits are expected to go through Medusa's `calcula-fields.tsx` widget on the product details page).

**Guards (`common/`):** `jwt-auth.guard`, `roles.guard`, `webhook-secret.guard`, `public.decorator`, `roles.decorator`.

**`WebhookService` (`common/services/webhook.service.ts`):** Sends the version envelope to Medusa's `/webhooks/calcula`. Reads the shared secret from `CALCULA_WEBHOOK_SECRET` (falls back to the legacy `MEDUSA_WEBHOOK_SECRET` env var for deployments that set it by the old name). Requires `MEDUSA_WEBHOOK_URL` to be set — otherwise logs a `warn` and real-time sync is disabled (falls back to Medusa's drift cron).

## Endpoints consumed by Medusa

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/companies/by-isin/:isin/snapshot/statements` | GET | Statements JSON for caching |
| `/api/companies/by-isin/:isin/snapshot/prices` | GET | Price history JSON for caching (includes event `category` field) |
| `/api/companies/by-isin/:isin/snapshot/news` | GET | NewsEvent list for caching |
| `/api/companies/by-isin/:isin/snapshot/editorial` | GET | Bundled `{ overview, prosCons }` for caching |
| `/api/companies/by-isin/:isin/versions` | GET | Full version envelope for force-refresh |
| `/api/snapshots/versions-since?since=<iso>&limit=<n>` | GET | Drift index — companies with `contentUpdatedAt > since`. **Returns snake_case** (`statements_version`, `price_version`, `news_version`, `editorial_version`, `content_updated_at`) to match Medusa's envelope reader. |
| `/api/companies/by-isin/:isin/price` | POST | Receive variant price from Medusa |
| `/webhooks/medusa` | POST (outgoing) | Push version envelope to Medusa (not an inbound endpoint) |
| `/graphql` | POST | Admin UI queries/mutations |

All inbound Medusa traffic uses the webhook secret (`webhook-secret.guard`). Admin UI uses JWT.

## Admin frontend (`apps/frontend`)

- Next.js App Router (not Refine/Mantine/Vite — those were considered earlier but not used)
- Pages for **companies, periods, statements, prices, login**
- Statement editor provides a tree + flat view over `FinancialMetric` rows per period.

## Role in the larger system

- **Source of truth**: any financial number visible on Polemarch Deals originates here.
- **Versioning**: writes bump `statements_version` / `price_version`; Medusa uses these to decide whether its cache is stale.
- **Bi-directional price sync**: receives variant prices from Medusa, and is the authoritative store for price history charts shown on the storefront.

## Editorial CMS content types (shipped April 2026)

Calcula is the editorial CMS for Polemarch. The storefront deal detail page pulls these from Calcula tables through the snapshot cache:

| Content type | Table | Snapshot kind | Storefront rendering |
|---|---|---|---|
| Narrative | `company_overview` | `editorial` | `CompanyOverviewPanel` — about card with collapsible Business Model / Moat / Risks sections |
| Investment thesis | `pros_cons` | `editorial` | `ProsConsPanel` — emerald/rose two-column bullet list |
| News + corporate events | `news_events` | `news` | `NewsPanel` (filterable card) + `EventTimeline` (vertical list) — same data, two renderings |
| Price tag | `company_price_history.category` | `prices` | C/N/R marker colour on `PriceChart` |

The CompanyOverview and ProsCons tables are bundled into one `editorial` snapshot kind with a single `editorialVersion` column on `Company` — saving either one bumps the version and fires one webhook. NewsEvents have their own `news` kind and `newsVersion` column because events stream in at much higher frequency.
