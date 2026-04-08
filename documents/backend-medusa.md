# Backend — Medusa v2

Location: `backend/`. Medusa v2 app on Node 20 + Postgres + Redis. Houses the commerce engine, the custom `calcula` module (financial data cache keyed by ISIN), KYC review, and the admin dashboard customizations.

## Directory tree (`backend/src`)

```
backend/src/
├── admin/
│   ├── routes/
│   │   ├── bulk-editor/         # Admin page: bulk product + price editor
│   │   ├── kyc-requests/        # Admin page: pending KYC reviews
│   │   └── posthog-status/      # Admin page: analytics status
│   ├── widgets/
│   │   ├── calcula-fields.tsx          # Product-detail widget: 21 admin-editable static fields
│   │   ├── category-trending-sector.tsx
│   │   ├── customer-kyc.tsx            # Customer-detail widget: KYC viewer/approver
│   │   └── product-trending.tsx
│   └── lib/kyc.ts               # PAN / Aadhaar / Demat validators
├── api/
│   ├── admin/
│   │   ├── calcula/
│   │   │   ├── [isin]/route.ts         # GET company_record by ISIN
│   │   │   ├── [isin]/refresh/         # POST force refresh
│   │   │   ├── bulk/                   # POST batch import
│   │   │   ├── by-isin/                # POST price update by ISIN
│   │   │   ├── prices/bulk/            # POST ingest price history CSV
│   │   │   └── refresh-bulk/           # POST refresh stale records
│   │   ├── customer-kyc/               # GET/PUT review & approve KYC
│   │   ├── debug/                      # Diagnostic helpers
│   │   ├── posthog-status/             # GET analytics integration status
│   │   └── products/                   # CSV share-product import
│   ├── store/
│   │   ├── calcula/
│   │   │   ├── route.ts                # GET list company records
│   │   │   ├── [companyId]/route.ts    # GET by company id
│   │   │   └── isin/[isin]/            # GET by ISIN (+ /snapshot)
│   │   ├── kyc/                        # POST submit KYC form
│   │   ├── marketplace-products/       # GET list/detail deals
│   │   ├── notifications/              # GET/POST customer notifications
│   │   └── upload/                     # POST file upload (PAN, CMR) → /static
│   ├── webhooks/
│   │   └── calcula/                    # POST version envelope from Calcula
│   └── middlewares.ts                  # multer, CORS, mask, rate limits
├── jobs/
│   └── sync-calcula-snapshots.ts       # Cron: drift reconciliation with Calcula
├── modules/
│   ├── calcula/                        # Custom Medusa module (see below)
│   │   ├── index.ts                    # Service: handleVersionEnvelope, forceRefresh, syncDrift, pushPriceToCalcula
│   │   ├── variant-price-sync.ts       # Route-scope helper: reverse price sync to Medusa variant
│   │   ├── models/
│   │   └── migrations/
│   └── polemarch/                      # Stub module registered in config
├── subscribers/
│   ├── calcula-price-sync.ts           # product.updated → value-echo check → push price to Calcula
│   ├── calcula-variant-price-sync.ts   # variant.updated → value-echo check → push price
│   └── notification-handler.ts
├── utils/                              # logger, validate-body, mask-data, csv
├── validators/                         # kyc-validator (and others)
├── workflows/
│   └── hooks/validate-product-isin.ts  # Enforce metadata.isin on create
└── index.ts                            # Module loader
```

Top-level: `medusa-config.ts`, `package.json`, `render.yaml`, `static/` (uploaded files).

## `calcula` module (deep-dive)

Files:
- `modules/calcula/index.ts` — Module service: `handleVersionEnvelope`, `forceRefresh`, `syncDrift`, `pushPriceToCalcula`, `upsertStaticFields`, `bulkUpsertStaticFields`, `bulkUpsertPrices`, `getRawRow`, `getByIsin`. Also exports two pure helpers: `extractLatestPriceFromSnapshot(snap)` and `isLoopEchoPush(isin, price)`.
- `modules/calcula/variant-price-sync.ts` — **Route-scope helper** `syncLatestPriceToMedusaVariant(container, isin, latestPrice)`. Lives outside the module service because Medusa v2 module containers are isolated and do not have access to `Modules.QUERY` or core workflows. Called from the webhook route, the force-refresh routes, and the drift cron.
- `modules/calcula/models/company-record.ts` — Mikro-ORM model for the cache table.
- `modules/calcula/migrations/*.ts` — Schema migrations.

### `company_record` table

**Join key:** `isin` (unique, indexed)

Columns grouped by role:

| Group | Columns |
|---|---|
| Identity (Calcula-synced) | `company_id`, `company_name`, `cin`, `sector`, `industry`, `description`, `listing_status` |
| Admin-editable static (21) | `market_cap`, `valuation`, `pe_ratio`, `pb_ratio`, `roe_value`, `debt_to_equity`, `book_value`, `founded`, `headquarters`, `share_type`, `face_value`, `lot_size`, `total_shares`, `fifty_two_week_high`, `fifty_two_week_low`, `pan_number`, `rta`, `depository`, … |
| Cached JSON blobs | `statements_snapshot` (P&L, Balance Sheet, Cash Flow tree), `price_snapshot` (daily prices + corporate actions + C/N/R events), `news_snapshot` (NewsEvent list), `editorial_snapshot` (overview + prosCons bundled) |
| Versioning / freshness | `statements_version`, `price_version`, `news_version`, `editorial_version`, `content_updated_at`, `last_accessed_at` (throttled ~1/hr) |

### Module service — key functions (in `index.ts`)

- `getByIsin(isin)` — Read cached record (full parse).
- `getRawRow(isin, kind?)` — **Preferred** projected read; returns text blobs unparsed for the streaming store route.
- `handleVersionEnvelope(envelope)` — Compare snake_case envelope vs. local `statements_version` / `price_version`, pull stale snapshots, invalidate route LRU, log decision. Returns `{ updated, statements, prices, latestPrice, isin }` so the route handler can run the reverse variant sync at route scope.
- `forceRefresh(isin)` — Unconditional pull of BOTH snapshots. Bypasses the version comparison so it can recover from "stale data stored under correct version number" scenarios. Returns `{ ok, updated, latestPrice, isin }`.
- `syncDrift()` — Ask Calcula `versions-since?since=<highWater>`. Bounded-concurrency reconciliation with `mapLimit(8)`. Returns `{ checked, updated, priceUpdatedIsins }`.
- `pushPriceToCalcula({ isin, price })` — POST to Calcula `/api/companies/by-isin/:isin/price` with `datetime = new Date().toISOString()` by default. Returns `{ ok, result }`. Never throws.
- `upsertStaticFields(isin, data)` — Write admin-editable fields. Invalidates route cache.
- `bulkUpsertStaticFields(rows)` — Loop version with per-row outcomes.
- `bulkUpsertPrices(rows)` — Merge daily price points into cached `price_snapshot`, dedupe by timestamp, bump version only on change.
- `callCalcula(path, init?)` — HTTP client using `CALCULA_API_URL` and `CALCULA_WEBHOOK_SECRET`.

**Exported pure helpers** (importable from route handlers):
- `extractLatestPriceFromSnapshot(snap)` → `number | null` — pulls the last `[ts, price]` tuple from `snap.prices` and returns the price.
- `isLoopEchoPush(isin, price)` → `boolean` — true if `price` numerically equals the last value we received from Calcula for this ISIN. Used by the subscribers to distinguish echo pushes from legitimate edits.

### Reverse variant price sync (`variant-price-sync.ts`)

```ts
syncLatestPriceToMedusaVariant(container, isin, latestPrice)
  → { ok, skipped?, reason?, previous?, next?, error? }
```

Runs at route scope. Steps:
1. Stores `latestPrice` in `globalThis.__calculaLastFromCalcula[isin]` **before** any early-exit, so the subscribers' echo check sees the value even when the variant already matches.
2. Calls `query.graph({ entity: "product", fields: ["id","metadata","variants.id","variants.prices.*"] })` and in-memory filters by `metadata.isin === isin` (JSONB query-graph filter is inconsistent across Medusa versions — in-memory scan is fine at N ≈ tens of deals).
3. Reads the first INR price off the first variant.
4. Skips if the variant already matches (`|current - latest| < 1e-9`).
5. Otherwise runs `updateProductVariantsWorkflow(container).run({ selector, update: { prices: [{ currency_code: "inr", amount: latestPrice }] } })`.
6. Never throws — logs and returns structured result.

### `polemarch` module

Stub module registered in `medusa-config.ts` for platform-wide helpers and migrations (see `modules/polemarch/migrations/`).

## API routes

### Store (public, publishable key or customer bearer)

| Endpoint | Method | Purpose |
|---|---|---|
| `/store/calcula` | GET | List all company records |
| `/store/calcula/:companyId` | GET | Company detail by internal id |
| `/store/calcula/isin/:isin` | GET | Company record by ISIN |
| `/store/calcula/isin/:isin/snapshot?kind=...` | GET | Cached snapshot JSON blob. Accepts `kind=prices\|statements\|news\|editorial\|both` (default `both` returns statements + prices; news and editorial are their own kinds). `Cache-Control: private, max-age=0, must-revalidate` — browsers always revalidate. 304 on unchanged data via ETag `"<statements_version>:<price_version>:<news_version>:<editorial_version>"`. |
| `/store/marketplace-products` | GET | List/detail deal wrappers over Medusa products |
| `/store/kyc` | POST | Submit KYC form |
| `/store/upload` | POST | Upload PAN / CMR file → `static/` |
| `/store/notifications` | GET/POST | Customer notifications |

### Admin (session auth)

| Endpoint | Method | Purpose |
|---|---|---|
| `/admin/calcula/:isin` | GET | Read company record for the product widget |
| `/admin/calcula/:isin/refresh` | POST | Force-refresh from Calcula |
| `/admin/calcula/bulk` | POST | Batch product import |
| `/admin/calcula/refresh-bulk` | POST | Batch refresh stale records |
| `/admin/calcula/prices/bulk` | POST | Ingest price history CSV |
| `/admin/calcula/by-isin/…` | POST | Update price for one ISIN |
| `/admin/products/…` | POST | CSV share-product import |
| `/admin/customer-kyc/:id` | GET / PUT | Review / approve customer KYC |
| `/admin/posthog-status` | GET | Analytics integration status |
| `/admin/debug` | * | Diagnostic helpers |

### Webhooks

| Endpoint | Method | Purpose |
|---|---|---|
| `/webhooks/calcula` | POST | Receive version envelope from Calcula (verified by `X-Webhook-Secret`) |

## Admin UI customizations

**Widgets** (`src/admin/widgets/`)

- `calcula-fields.tsx` — product detail widget rendering the 21 admin-editable static fields from `company_record`.
- `customer-kyc.tsx` — customer detail widget for KYC review (PAN, Aadhaar, DP, Demat, uploaded file links).
- `product-trending.tsx`, `category-trending-sector.tsx` — trending product / sector controls.

**Routes** (`src/admin/routes/`)

- `kyc-requests/page.tsx` — pending KYC queue
- `bulk-editor/page.tsx` — bulk product + price editor
- `posthog-status/page.tsx` — analytics state

## Subscribers

| File | Event | Action |
|---|---|---|
| `calcula-price-sync.ts` | `product.updated` | Resolve first INR variant price via `query.graph`. Value-echo check via `globalThis.__calculaIsLoopEchoPush(isin, price)` — skip if the price numerically equals the last value received from Calcula. Otherwise `calcula.pushPriceToCalcula({ isin, price })`. |
| `calcula-variant-price-sync.ts` | `product-variant.updated` | Same logic via `variant.product.metadata.isin`. Handles the admin "Edit Prices" spreadsheet which updates variant prices directly. |
| `notification-handler.ts` | notification events | Fan out notifications. |

**Loop-breaker (value-based):** Set in `variant-price-sync.ts` on every call (before any early-exit). Replaces the earlier "do-not-push-for-5s" time window, which both leaked loops (early-exit left no guard) and blocked legitimate edits within the window. See [integrations.md §1e](./integrations.md).

## Jobs

- `sync-calcula-snapshots.ts` — 1-minute cron.
  1. Calls `calcula.syncDrift()` → projected high-water query → `versions-since?since=…` → bounded-concurrency `handleVersionEnvelope` loop.
  2. For each ISIN in `result.priceUpdatedIsins`, re-reads the cached `price_snapshot`, extracts the latest tuple, and runs `syncLatestPriceToMedusaVariant(container, isin, latest)` — the job container has full Medusa scope.
  3. Logs checked/updated counts on every run so "is the cron alive" is visible in logs.

## Workflow hooks

- `workflows/hooks/validate-product-isin.ts` — if `additional_data.isin` is supplied at product create time (e.g. via CSV import or a custom admin route), this hook writes it to `product.metadata.isin` and seeds a `company_record` row. **ISIN is NOT enforced at create time** because Medusa v2 admin has no `product.create` injection zone — the stock Create Product form cannot send `additional_data.isin`. ISIN is instead set post-create from the `calcula-fields.tsx` widget on `product.details.after` (it PATCHes `metadata.isin` on `/admin/products/:id`). Products without ISIN are tolerated elsewhere in the pipeline — the `calcula-price-sync` subscribers explicitly skip them.

## Config — `medusa-config.ts`

Important entries:

- Postgres URL, Redis URL
- `JWT_SECRET`, `COOKIE_SECRET`
- CORS config for admin, store, and authentication origins
- Custom module registrations: `calcula`, `polemarch`, `@medusajs/analytics-posthog`
- Publishable API key config

## Relevant env vars

- `DATABASE_URL`, `REDIS_URL`
- `JWT_SECRET`, `COOKIE_SECRET`
- `CALCULA_API_URL` — base URL of the Calcula NestJS service (e.g. `https://calcula-api.polemarch.in`)
- `CALCULA_WEBHOOK_SECRET` — **single shared secret** used in BOTH directions. Medusa signs outbound `callCalcula` requests with it; Medusa verifies inbound `/webhooks/calcula` requests against it. Must also be set on the Calcula side under the same name.
- `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`
- `POSTHOG_API_KEY` (optional)
