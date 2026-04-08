# Integrations & Contracts

End-to-end flows between the four subsystems, with file references.

## 1. Medusa ↔ Calcula

Bi-directional, keyed by ISIN. Authenticated via `CALCULA_WEBHOOK_SECRET`.

### 1a. Price push (Medusa → Calcula, event-driven)

```
admin edits variant price in Medusa admin
  → product.updated / product-variant.updated event
  → backend/src/subscribers/calcula-price-sync.ts
    (or calcula-variant-price-sync.ts)
  → resolve first INR variant price via query.graph
  → VALUE-ECHO CHECK: isLoopEchoPush(isin, priceInr)?
       yes → skip with log "echo of last value from Calcula"
       no  → continue
  → calcula.pushPriceToCalcula({ isin, price })
       datetime defaults to new Date().toISOString() so the new row is
       always the latest-by-datetime in Calcula's price_snapshot series
  → POST https://<calcula>/api/companies/by-isin/:isin/price
  → Calcula: writes CompanyPriceHistory row, bumps Company.price_version
```

### 1e. Reverse price sync (Calcula → Medusa variant price)

```
admin edits a price in Calcula's admin UI (or the scraper imports one)
  → PricesService.upsertOne → bumpPriceVersion
     ├ bumps priceVersion + contentUpdatedAt (Prisma transaction)
     ├ snapshotsService.invalidate(isin)   # drops the 5s in-memory cache
     └ webhookService.syncToMedusa(companyId)  # fire-and-forget
  → POST /webhooks/calcula at Medusa
  → backend/src/api/webhooks/calcula/route.ts verifies X-Webhook-Secret
  → calculaModule.handleVersionEnvelope(payload)
     ├ compares local vs. remote versions
     ├ needPrices=true → GET /api/companies/by-isin/:isin/snapshot/prices
     ├ writes JSON.stringify(snap) into company_record.price_snapshot
     ├ invalidates the snapshot route LRU via globalThis
     └ returns { updated, prices, latestPrice }
  → back in the route handler:
  → syncLatestPriceToMedusaVariant(req.scope, isin, latestPrice)
     (from backend/src/modules/calcula/variant-price-sync.ts — route-scope
      helper, NOT a method on the module service)
     ├ stores latestPrice in globalThis.__calculaLastFromCalcula[isin]
     ├ query.graph({ entity:"product", fields:[...] }) + in-memory isin filter
     ├ reads current INR price on first variant
     ├ if |current - latest| < 1e-9 → skip (already matches)
     └ else: updateProductVariantsWorkflow(req.scope).run({ selector, update })
  → Medusa fires product.updated / product-variant.updated events
  → subscribers run → isLoopEchoPush(isin, latestPrice) returns true → skip
  → storefront deal page reads the fresh variant.calculated_price.calculated_amount
```

**Loop-breaker (value-based):** See the rationale in §6 rule 4. Short version: `isLoopEchoPush(isin, p)` returns `true` iff `p` numerically equals `globalThis.__calculaLastFromCalcula[isin]`. The map is populated by `syncLatestPriceToMedusaVariant` on **every call**, before any early-exit, so even the "already matches" short-circuit still sets the map — closing the hole that let one bulk-editor save produce 6 loop pushes in the previous time-window implementation.

### 1b. Version envelope (Calcula → Medusa, push)

```
content write in Calcula (statements or prices)
  → bump Company.statements_version / price_version
  → Calcula webhook service POSTs envelope
  → POST /webhooks/calcula  (handled by backend/src/api/webhooks/calcula/route.ts)
  → calcula.handleVersionEnvelope(envelope)
  → compare envelope vs. local company_record versions
  → if stale: fetch snapshot from Calcula (see 1d) and update cache
```

### 1c. Drift reconciliation (Medusa → Calcula, cron)

```
backend/src/jobs/sync-calcula-snapshots.ts  (scheduled)
  → calcula.syncDrift()
  → GET /api/snapshots/versions-since?cursor=<last>
  → iterate changed ISINs
  → pull statements + prices snapshots (see 1d)
  → update company_record rows, advance cursor
```

### 1d. Snapshot pull (Medusa → Calcula)

```
GET /api/companies/by-isin/:isin/snapshot/statements   → statements_snapshot JSON
GET /api/companies/by-isin/:isin/snapshot/prices       → price_snapshot JSON (includes C/N/R event category)
GET /api/companies/by-isin/:isin/snapshot/news         → news_snapshot JSON (NewsEvent list)
GET /api/companies/by-isin/:isin/snapshot/editorial    → editorial_snapshot JSON ({ overview, prosCons })
```

All four are cached in `company_record` and served to the storefront without hitting Calcula on the hot path. `handleVersionEnvelope` runs four independent `needStatements`/`needPrices`/`needNews`/`needEditorial` branches in one pass so a write that bumps both news and editorial in the same envelope only does one round-trip.

### 1f. News events (Calcula → Medusa → Storefront)

```
admin creates/edits NewsEvent in Calcula admin (NewsEventsSection)
  → NewsEventsService.upsert → bumpNewsForCompany
    ├ bumps newsVersion + contentUpdatedAt
    ├ snapshotsService.invalidate(isin)  # drops all four caches
    └ webhookService.syncToMedusa(companyId)  # envelope includes news_version
  → Medusa handleVersionEnvelope → needNews=true
  → pulls /api/companies/by-isin/:isin/snapshot/news
  → writes company_record.news_snapshot + news_version
  → storefront NewsPanel + EventTimeline read via getSnapshot(isin, "news")
```

### 1g. Editorial (Calcula → Medusa → Storefront)

Same shape, but one `editorial` snapshot kind covers both `CompanyOverview` and `ProsCons`. Editing either table in Calcula's admin (`EditorialSection`) bumps a shared `editorialVersion` and fires one webhook. Medusa caches the bundled payload under `editorial_snapshot`. Storefront components `CompanyOverviewPanel` and `ProsConsPanel` both call `getSnapshot(isin, "editorial")` — the snapshot client deduplicates so only one network round-trip happens per tab render.

## 2. Medusa ↔ Storefront (REST)

Base URL: `NEXT_PUBLIC_MEDUSA_BACKEND_URL`. Publishable key on every store request.

### Products & deals

```
GET  /store/products?fields=+metadata
GET  /store/products/:id
GET  /store/marketplace-products                 # wrapped deal listing
```

### Financials (cached via calcula module)

```
GET  /store/calcula/isin/:isin                   # company_record row
GET  /store/calcula/isin/:isin/snapshot          # statements + prices JSON
```

Consumed by `storefront/src/lib/medusa.ts` (`calcula.getByIsin`, `calcula.getSnapshot`) and `lib/calcula.ts`.

### Cart & checkout

```
POST /store/carts                                # create cart
GET  /store/carts/:id                            # retrieve
POST /store/carts/:id/line-items                 # add item
PUT  /store/carts/:id/line-items/:lineId         # update
DELETE /store/carts/:id/line-items/:lineId       # remove
POST /store/carts/:id/complete                   # checkout (manual payment)
```

Fees are computed **client-side** in `CartContext.tsx`:
- Processing fee: 2% of investment
- Low-quantity fee: ₹250 if investment < ₹10,000

Checkout uses a manual payment provider — actual settlement happens off-platform via bank transfer instructions shown on `/checkout`.

### Auth (customer emailpass)

```
POST /auth/customer/emailpass/register           # returns token
POST /auth/customer/emailpass                    # login, returns token
GET  /store/customers/me                         # with Bearer token
POST /store/customers                            # attach Medusa customer to auth identity
```

Token is stored in `localStorage` as `medusa_auth_token` by `UserContext.tsx`.

### KYC flow

```
client                  storefront                 backend
  │                         │                         │
  │─ submit KYC form ──────▶│                         │
  │                         │── POST /store/upload ──▶│  (PAN + CMR files → /static)
  │                         │◀── file_url ────────────│
  │                         │── POST /store/kyc ─────▶│  (form data + file urls)
  │                         │                         │   writes customers.metadata.kyc_*
  │                         │                         │
admin                     admin UI                    │
  │── open KYC queue ──────▶ /admin/kyc-requests ────▶│  GET /admin/customer-kyc/:id
  │── approve / reject ────▶                         ─▶ PUT /admin/customer-kyc/:id
```

Validation helpers: `backend/src/admin/lib/kyc.ts` (PAN format, Aadhaar 12 digits, Demat 16 digits) and `backend/src/validators/kyc-validator.ts`.

## 3. news_event ↔ Storefront (static JSON)

No live request path — the Astro site publishes JSON files that the storefront fetches directly.

```
storefront deal detail (/deals/[id])
  → reads product.metadata.isin
  → fetch https://<news-site>/api/news/by-isin/:isin
  → render news panel
```

Other useful endpoints from `news_event/site/src/pages/api/`:
- `/api/news` — all tagged articles
- `/api/companies` — ISIN registry
- `/api/drhp` — filings

### Price chart category tags (shipped)

Price points in `CompanyPriceHistory` carry a `category` column (`C` / `N` / `R` / null). The storefront `PriceChart` renders each event marker in the category's colour, the tooltip shows a coloured category badge, and filter pills above the chart toggle visibility per category. Same vocabulary as `NewsEvent.category` so chart markers and the News panel stay in sync.

## 4. Product creation & ISIN linking

Medusa v2 admin has **no `product.create` injection zone**, so the stock Create Product form cannot carry a custom ISIN field. The create path is therefore ISIN-optional:

```
admin clicks "Create Product" in Medusa admin
  → POST /admin/products                    (no additional_data.isin)
  → middlewares.ts: isin is optional       (was required, caused blocked creates)
  → workflows/hooks/validate-product-isin.ts: logs & returns
  → product created with empty metadata.isin

admin opens the new product's details page
  → calcula-fields.tsx widget (zone: product.details.after)
  → shows "Link ISIN" input
  → PATCH /admin/products/:id  with { metadata: { ..., isin } }
  → subsequent saves hit POST /admin/calcula/:isin to fill the widget fields
```

If a product is created via an internal path that *can* send `additional_data.isin` (CSV import, a custom admin route, scripts), the workflow hook seeds the metadata + `company_record` row in the same request.

Products without an ISIN are tolerated by the rest of the pipeline:
- `calcula-price-sync` / `calcula-variant-price-sync` log `has no ISIN — skipping` and no-op.
- Store routes keyed on ISIN simply don't return a record for that product.
- The drift job and webhook handler only touch `company_record` rows, so products without ISIN are invisible to them.

ISIN is effectively a **soft invariant** — required for a product to behave as a *deal*, but not required for the row to exist.

## 5. Authentication summary

| Path | Auth |
|---|---|
| `/store/*` (public reads) | Publishable API key |
| `/store/*` (customer actions) | Bearer token from emailpass flow |
| `/admin/*` | Medusa session |
| `/webhooks/calcula` | `X-Webhook-Secret` matches `CALCULA_WEBHOOK_SECRET` |
| Calcula `/api/*` (from Medusa) | Webhook secret guard |
| Calcula `/graphql` (admin UI) | JWT issued by `auth` module |

## 6. Sync pipeline invariants (learned the hard way)

These are the non-obvious rules that keep Medusa's cache in lockstep with Calcula. Violating any of them reproduces "updates aren't syncing" symptoms. They are in the order you should check them when debugging.

1. **Wire format is snake_case.** `VersionEnvelope` on the wire is always `{isin, statements_version, price_version, news_version, editorial_version, content_updated_at}`. Medusa's `handleVersionEnvelope` reads those exact keys. A camelCase response from Calcula silently evaluates `undefined > local === false` and every refresh is a no-op. `news_version` and `editorial_version` are optional on the envelope type for back-compat with older Calcula deployments; a missing field is treated as "no news/editorial branch needed". Applies to:
   - `POST /webhooks/calcula` payload (pushed by Calcula's `WebhookService`)
   - `GET /api/snapshots/versions-since` response (polled by Medusa's drift cron)
   - `GET /api/companies/by-isin/:isin/versions` response (used by `forceRefresh`)
2. **Invalidate Calcula's 5-second snapshot cache before the webhook fires.** Every bump helper — `PricesService.bumpPriceVersion`, `FinancialsService.upsertFinancialValues`, `PeriodsService.bumpStatementsForCompany`, `NewsEventsService.bumpNewsForCompany`, `EditorialService.bumpEditorialForCompany` — must call `SnapshotsService.invalidate(isin)` immediately after the transaction commits and before `syncToMedusa`. `invalidate` drops all four in-memory caches (statements, prices, news, editorial) so no stale kind survives into Medusa's next pull.
3. **`pushPriceToCalcula` datetime defaults to `new Date().toISOString()`.** Previously it rounded to start-of-day-UTC, which broke "latest price" semantics whenever Calcula had later intraday rows — `extractLatestPriceFromSnapshot` would pick an older value and the reverse sync would silently overwrite the user's save. Using `now` guarantees the new row is strictly after any existing row and is always the tail of the sorted series.
4. **Loop breaker is value-based, not time-based.** The subscribers compare outgoing pushes to `globalThis.__calculaLastFromCalcula[isin]`. Equal → skip as echo; different → push. The map is populated in `syncLatestPriceToMedusaVariant` on every call, BEFORE any early-exit — so even the "already matches" short-circuit still sets it. The earlier 5-second time-window approach left the guard unset in the "already matches" branch and produced ≈6 loop pushes per user save.
5. **The variant-price reverse sync runs at ROUTE SCOPE, not module scope.** `syncLatestPriceToMedusaVariant(container, isin, latestPrice)` in `backend/src/modules/calcula/variant-price-sync.ts` uses `Modules.QUERY` and `updateProductVariantsWorkflow` which are not available inside a Medusa v2 custom module service's container. Calling it from the module (e.g., inside `handleVersionEnvelope`) throws silently in its `try/catch` and the variant never updates. The webhook route, the force-refresh routes, and the drift cron all call it with their full container (`req.scope` or the job's container).
6. **Never cache the Medusa snapshot route in the browser.** `/store/calcula/isin/:isin/snapshot` must send `Cache-Control: private, max-age=0, must-revalidate`. A `max-age>0` or `stale-while-revalidate` visibly freezes price charts for that many seconds after admin edits. The ETag keeps the cost low (304 = two column reads).
7. **Storefront snapshot cache TTL is 0.** `storefront/src/lib/snapshot.ts#CACHE_TTL_MS` must stay `0`. The cache exists only to hold a response body for conditional 304 replies; any positive TTL lets a tab serve stale data without touching the network.
8. **Both services share a SINGLE webhook secret named `CALCULA_WEBHOOK_SECRET`.** Used in both directions:
   - Medusa → Calcula: Medusa sends it on `callCalcula`; Calcula's `WebhookSecretGuard` verifies it.
   - Calcula → Medusa: Calcula sends it on `syncToMedusa`; Medusa's `/webhooks/calcula` route verifies it against `process.env.CALCULA_WEBHOOK_SECRET`.
   `webhook.service.ts` historically read an env called `MEDUSA_WEBHOOK_SECRET`, which was a *different name* — every real-time Calcula → Medusa webhook got rejected with 401 and sync only worked via the drift cron (which was itself broken, see rule 1). Now falls back to `MEDUSA_WEBHOOK_SECRET` only for back-compat. Set `CALCULA_WEBHOOK_SECRET` on both sides going forward.
9. **`MEDUSA_WEBHOOK_URL` must be set on Calcula**, otherwise `syncToMedusa` no-ops and you fall back to the 60s drift cron. The service logs this at `warn` level so it shows up in production logs.
10. **`CompaniesService.update` does NOT propagate to Medusa by design.** Editing a company's `name`/`sector`/`industry` in Calcula's admin UI won't update the Medusa `company_record`. Those fields are meant to be edited from Medusa's `calcula-fields.tsx` widget on the product details page, which writes to `company_record` directly via `upsertStaticFields`. If you need Calcula-side edits to propagate, you must (a) fire `syncToMedusa` from `CompaniesService.update` and (b) teach `handleVersionEnvelope` to refresh metadata fields even when versions are unchanged.

## 7. Where to look when things go wrong

| Symptom | First file to read |
|---|---|
| Deal page missing financials | `backend/src/api/store/calcula/isin/[isin]/route.ts` + `company_record` row |
| Stale statements | `backend/src/modules/calcula/index.ts` (`handleVersionEnvelope`, `syncDrift`) + `jobs/sync-calcula-snapshots.ts` |
| Price not reaching Calcula | `backend/src/subscribers/calcula-price-sync.ts` / `calcula-variant-price-sync.ts` |
| KYC not saving | `backend/src/api/store/kyc/route.ts` + `validators/kyc-validator.ts` |
| File upload errors | `backend/src/api/store/upload/route.ts` + `middlewares.ts` (multer) |
| News panel empty on deal | `news_event/config/companies.yml` alias coverage + Astro build output |
| Sync invariants broken | See section 6 above. Run through the 10 rules in order — one of them has been violated. |
| Bulk editor price save "not working" | Almost always either rule 3 (datetime-now in `pushPriceToCalcula`), rule 4 (value-based loop check in the subscribers), or rule 5 (reverse sync at route scope). Check the `[calcula.handleVersionEnvelope]`, `[variant-price-sync]`, and `[calcula-*-price-sync]` log lines — you should see at most ONE `pushPriceToCalcula` per user save. |
| Product creation blocked | `backend/src/workflows/hooks/validate-product-isin.ts` (should be optional-ISIN; if blocked again, check `backend/src/api/middlewares.ts` for the `additionalDataValidator` regression) |
