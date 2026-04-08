# Data Handling

This document describes how the Polemarch deals platform ingests, stores,
serves, and renders the data behind product pages — price history, financial
statements, company metadata, and derived metrics. It is the reference every
new contributor should read before adding a new field, a new data source, or
a new downstream consumer (web, mobile, or external integration).

The platform is composed of three cooperating systems:

- **Calcula** — the authoritative source of financial data. An external NestJS
  + GraphQL service that owns line items, periods, daily price points, events,
  and statements. Not owned by this repo but referenced throughout.
- **Medusa backend** (`backend/`) — the commerce layer and the *cache of
  record* for the storefront. Every ISIN the store serves has a locally cached
  copy of its Calcula data in a single Postgres row.
- **Storefront** (`storefront/`) — Next.js 16 app that renders product /
  deal detail pages. Never talks to Calcula directly; always talks to Medusa.
- **Calcula admin frontend** (`calcula/apps/frontend/`) — a separate
  Next.js app used by internal editors to mutate the authoritative
  data. Out of scope for most storefront work.

```
 ┌─────────────┐   push+pull    ┌──────────────────┐    REST     ┌────────────┐
 │   Calcula   │ ◀────────────▶ │   Medusa backend │ ◀─────────▶ │ Storefront │
 │ (authoritative, GraphQL)    │ (cache + commerce)│              │  (Next.js) │
 └─────────────┘                └──────────────────┘              └────────────┘
                                         │
                                         ▼
                                    Postgres
                                    (company_record)
```

---

## 1. System overview

### What counts as "product data" on this platform

Every product in the Medusa catalog IS an unlisted share. Each product is
identified by an **ISIN** (e.g. `INE0DJ201029`), stored on the product's
`metadata.isin` field. ISIN is a **soft invariant** — not enforced at
create time because Medusa v2 admin has no `product.create` injection
zone and the stock Create Product form cannot send custom fields. The
`productsCreated` workflow hook at
`backend/src/workflows/hooks/validate-product-isin.ts` seeds
`company_record` data when `additional_data.isin` IS provided (CSV
import, custom routes), and logs-and-returns otherwise. ISIN is linked
post-create via the `calcula-fields.tsx` widget on the product details
page, which PATCHes `metadata.isin`. Products without ISIN are tolerated
by every sync path — the subscribers simply log and skip.

Alongside the stock Medusa product row, every ISIN has a row in the
`company_record` table owned by the **calcula module**
(`backend/src/modules/calcula/`). This row carries:

1. **21 admin-editable static fields** — sector, market cap, P/E, ROE, CIN,
   PAN, RTA, HQ, etc. Set by admins via the product-detail widget
   (`backend/src/admin/widgets/calcula-fields.tsx`) or the bulk editor
   (`backend/src/admin/routes/bulk-editor/page.tsx`).
2. **Cached JSON blobs** pulled from Calcula:
   - `statements_snapshot` — full P&L / Balance Sheet / Cash Flow trees,
     yearly and quarterly.
   - `price_snapshot` — full daily price series `[timestamp_ms, price][]`
     plus `events[]` (corporate actions, note + link).
3. **Version and freshness metadata** — `statements_version`,
   `price_version`, `content_updated_at`, `last_accessed_at`.

The storefront renders the chart and financial statements straight from the
cached blobs. It does not know Calcula exists.

### Who talks to whom

| Caller | Callee | Protocol | Purpose |
|---|---|---|---|
| Medusa ⟶ Calcula | `/api/companies/by-isin/:isin/snapshot/{prices,statements}` | HTTPS + `X-Webhook-Secret` | Pull a fresh snapshot on demand |
| Medusa ⟶ Calcula | `/api/snapshots/versions-since?since=...` | same | Drift index for the minute cron |
| Medusa ⟶ Calcula | `/api/companies/by-isin/:isin/price` | same | Push a new price from Medusa (bulk editor / product update) |
| Calcula ⟶ Medusa | `POST /webhooks/calcula` | HTTPS + `X-Webhook-Secret` | Push a version envelope when Calcula writes |
| Storefront ⟶ Medusa | `/store/calcula/isin/:isin/snapshot?kind=...` | HTTPS + `x-publishable-api-key` | Fetch cached snapshot |
| Admin UI ⟶ Medusa | `/admin/calcula/...`, `/admin/products/...` | HTTPS + session | Read/write admin data |

---

## 2. Data storage

### 2.1 The `company_record` Postgres table

Defined at `backend/src/modules/calcula/models/company-record.ts`. One row per
ISIN. Key columns:

| Column | Type | Purpose |
|---|---|---|
| `id` | text (pk) | UUID from Medusa's id generator |
| `isin` | text | **The lookup key**, e.g. `INE0DJ201029` |
| `company_id` | text | Calcula's internal UUID for the company |
| `company_name` | text | Display name |
| `cin`, `pan_number`, `rta`, `depository` | text | Regulatory fields |
| `sector`, `industry`, `founded`, `headquarters`, `share_type`, `listing_status` | text | Company profile |
| `market_cap`, `valuation`, `pe_ratio`, `pb_ratio`, `roe_value`, `debt_to_equity`, `book_value`, `fifty_two_week_high`, `fifty_two_week_low`, `face_value`, `lot_size`, `total_shares` | text | Financial highlights (stored as text to allow currency symbols/units) |
| `description` | text | Long-form company description |
| `overview_data`, `ratios_data`, `trends_data` | text | Legacy JSON blobs, still read by some UI paths |
| `statements_snapshot` | text | **JSON blob** — full `StatementsSnapshot` payload |
| `statements_version` | text | Integer-as-text; bumps when statements change |
| `price_snapshot` | text | **JSON blob** — full `PriceSnapshot` payload |
| `price_version` | text | Integer-as-text; bumps when prices change |
| `content_updated_at` | text | ISO timestamp of the last successful sync |
| `last_accessed_at` | text | ISO timestamp, throttled to ≤ 1 write per ISIN per hour |
| `synced_at` | text | ISO timestamp used by legacy endpoints |

**Why `text` and not `jsonb` for the blobs:**

- `text` columns get TOAST-compressed by Postgres automatically — storage is
  near-parity with `jsonb` but reads don't pay a deserialize cost on the DB
  side.
- We never query inside the blobs from SQL. The only filters we run on the
  row (`sector`, `market_cap`, `share_type`, `industry`) are on the top-level
  text columns.
- Keeping the blobs as text lets the store route emit them directly to the
  wire without a `JSON.parse` + `JSON.stringify` round-trip (see §5.2).

**Why strings for numeric-looking fields:**

- `market_cap` could be `"₹ 18,000 Cr"` or `"18,000,000,000"` depending on
  the data source. Leaving the column as text keeps admin entry flexible and
  the storefront's formatter has full control.
- If you need a numeric version for sorting or aggregation, add a parallel
  numeric column and populate it from the text on save — do not flip the
  text column to numeric.

### 2.2 JSON blob shapes

The canonical TypeScript definitions live at `storefront/src/lib/snapshot.ts`
(lines 13–80). A condensed version:

```ts
type StatementRow = {
  lineItemId: string;    // Calcula UUID
  code: string;          // machine code, e.g. "revenue_from_operations"
  name: string;          // display name, e.g. "Revenue from Operations"
  depth: number;         // 0 = top level, 1+ = nested under parent
  orderCode: string;     // sort key within siblings
  isCalculated: boolean; // derived row (bolded in UI)
  formula: string | null;
  values: (number | null)[]; // one per period in the parent group
};

type StatementsGroup = {
  periods: PeriodHeader[];           // FY2024, Q1 FY2025, …
  statements: Record<"pnl" | "balance_sheet" | "cashflow" | "derived",
                     { rows: StatementRow[] }>;
};

type StatementsSnapshot = {
  isin: string;
  statementsVersion: number;
  contentUpdatedAt: string;
  currency: string;
  yearly:    StatementsGroup;
  quarterly: StatementsGroup;
};

type PriceSnapshot = {
  isin: string;
  priceVersion: number;
  contentUpdatedAt: string;
  prices: [number, number][];   // [timestamp_ms, price]
  events: PriceEvent[];         // { datetime, price, note, link }
};
```

**Hierarchy in statements.** Statement trees use flat row arrays with a
`depth` field. Row `j > i` is a descendant of row `i` while `depth(j) >
depth(i)` and no row in between has `depth ≤ depth(i)`. A row is a **leaf**
when the next row's depth is ≤ its own. The storefront's collapse logic in
`storefront/src/components/product/FinancialStatements.tsx` builds
`directLeafChildren: Map<parentIdx, leafIdxs[]>` from this flat array in one
pass. Any client that reuses this shape can port that rule directly.

### 2.3 Client caches

The storefront has a three-tier cache in front of the Medusa snapshot route,
implemented in `storefront/src/lib/snapshot.ts`:

1. **Memory `Map`** — keyed by `(isin, kind)`. **`CACHE_TTL_MS = 0`** — the
   cache stores the parsed body so a 304 reply can reuse it; it is NOT a
   time-based bypass. Every `getSnapshot()` call issues a network request
   carrying the previous ETag. Previously 60s, which visibly froze price
   charts for up to a minute after admin edits.
2. **`sessionStorage`** — same key. Survives cross-page navigation
   inside the tab so a user going deals → detail → back → detail doesn't
   refetch.
3. **Network** — `/store/calcula/isin/:isin/snapshot?kind=...`. Sends
   `If-None-Match: "<statements_version>:<price_version>"` using the ETag
   from the previous response. A `304` short-circuits and reuses the already
   parsed payload.

Nothing is persisted to `localStorage`; everything is per-tab.

### 2.4 Server-side route cache

The store route itself has a **process-local LRU** keyed by `(isin, kind)`
with a 10 second TTL (max 500 entries), defined at
`backend/src/api/store/calcula/isin/[isin]/snapshot/route.ts`. It stores the
already-assembled JSON response body as a string, so repeat hits within the
10s window never touch the DB or the calcula module.

Invalidation is push-based: any write path in the calcula module calls
`invalidateRouteCacheForIsin(isin)` which reaches the route cache via
`globalThis.__calculaInvalidateRouteCache` (looked up by name to avoid a
circular import between the route file and the module).

### 2.5 Retention

There is **no TTL on the backend blobs**. The `company_record` row persists
until manually deleted. The cron (`backend/src/jobs/sync-calcula-snapshots.ts`)
only ever overwrites a row, never removes one. `last_accessed_at` is tracked
but not used for eviction — it exists purely as telemetry for a potential
future "evict cold ISINs" job.

Client caches: `CACHE_TTL_MS = 0` — every call issues a network request.
The server LRU expires after 10 seconds (this is fine; it's keyed on
the ISIN's version which changes on every Calcula write). The browser
HTTP cache respects `Cache-Control: private, max-age=0, must-revalidate`
sent by the store route, so browsers always revalidate. A 304 reply
only reads two version columns on the server and returns zero body
bytes, so the "no browser cache" choice is near-free.

---

## 3. Data flow

### 3.1 Ingestion — Calcula → Medusa

There are **two independent paths** that keep the Medusa cache fresh:

#### Push path (webhook)

```
Calcula writes → Calcula HTTP POST /webhooks/calcula
    envelope = { isin, company_id, company_name,
                 statements_version, price_version,
                 content_updated_at }
  ↓
backend/src/api/webhooks/calcula/route.ts validates the shared secret
  ↓
calculaModule.handleVersionEnvelope(envelope)
  ↓
Compare envelope versions to row.{statements_version, price_version}
  ↓
If stale, GET /api/companies/by-isin/:isin/snapshot/{statements,prices}
  ↓
JSON.stringify the snapshot into the row's text columns
  ↓
UPDATE company_record SET …, content_updated_at = envelope.content_updated_at
  ↓
invalidateRouteCacheForIsin(isin)   // drop the process LRU entry
```

The webhook is fire-and-forget on the Calcula side; Medusa returns 200 as
soon as the envelope is enqueued. No queue, no workflow, just an async
handler.

#### Pull path (cron)

`backend/src/jobs/sync-calcula-snapshots.ts` runs every minute. It calls
`calculaModule.syncDrift()`:

```ts
// 1. High-water = max(content_updated_at) — a single projected query.
const topRow = await this.listCompanyRecords({}, {
  select: ["content_updated_at"],
  take: 1,
  order: { content_updated_at: "DESC" },
});
const since = topRow[0]?.content_updated_at || new Date(0).toISOString();

// 2. Ask Calcula what's drifted since then.
const drifted = await callCalcula(
  `/api/snapshots/versions-since?since=${since}&limit=500`
);

// 3. Reconcile in parallel (bounded concurrency 8).
await mapLimit(drifted, 8, env => this.handleVersionEnvelope(env));
```

This catches anything the webhook missed (Calcula temporarily down, secret
mismatch, etc.). The projected query is critical — an earlier version loaded
every row in memory and triggered per-minute GC pressure.

#### Manual path

- `POST /admin/calcula/:isin/refresh` — admin button in bulk editor,
  calls `calculaModule.forceRefresh(isin)` which unconditionally fetches
  versions then runs `handleVersionEnvelope`.
- `POST /admin/calcula/refresh-bulk` — body `{ isins: string[] }`. Same as
  above but for a list.

### 3.2 Push — Medusa → Calcula

When an admin edits a product variant's INR price (in the bulk editor or
the standard product detail page), Medusa **writes back** to Calcula so the
price history stays authoritative:

```
Admin saves new variant price
  ↓
product.updated / product-variant.updated event
  ↓
calcula-price-sync / calcula-variant-price-sync subscriber fires
  ↓
isLoopEchoPush(isin, priceInr)? — skip if the new value equals the
last value we received FROM Calcula (race-free value-based loop breaker)
  ↓
calculaModule.pushPriceToCalcula({ isin, price })
  ↓
POST /api/companies/by-isin/:isin/price   (Calcula API)
  body = { datetime: new Date().toISOString(), price, note, link }
  ↓
Calcula upserts the row at a strictly-increasing datetime (so it's
always the tail of the sorted series — what "latest price" means for
the chart and the reverse sync) and bumps priceVersion
  ↓
Calcula fires its webhook back to Medusa
  ↓
handleVersionEnvelope compares versions → needPrices=true
  ↓
pulls fresh price snapshot, writes to company_record.price_snapshot
  ↓
returns { latestPrice } to the route handler
  ↓
route calls syncLatestPriceToMedusaVariant(req.scope, isin, latestPrice)
  ↓
variant price in Medusa's pricing module is updated (or skipped if match)
  ↓
cache converges automatically without a manual refresh
```

Implemented in:
- `backend/src/modules/calcula/index.ts#pushPriceToCalcula` — datetime
  defaults to `new Date().toISOString()`. Called from the subscribers and
  from `/admin/calcula/by-isin/:isin/price`.
- `backend/src/modules/calcula/variant-price-sync.ts#syncLatestPriceToMedusaVariant`
  — route-scope helper; never called from inside the module service (the
  module container doesn't have access to core workflows in Medusa v2).

### 3.3 Admin write — static fields

Admin fields (sector, industry, CIN, etc.) are updated via Medusa only.
They do not round-trip to Calcula.

```
Admin edits fields in the widget or bulk editor
  ↓
POST /admin/calcula/:isin   { sector: "...", market_cap: "...", ... }
  ↓
calculaModule.upsertStaticFields(isin, data)
  ↓
UPDATE company_record SET …
  ↓
invalidateRouteCacheForIsin(isin)
```

Bulk path: `POST /admin/calcula/bulk` with `{ rows: [...] }` →
`bulkUpsertStaticFields` which loops the single-row path and returns per-row
outcomes.

### 3.4 Read — Storefront → Medusa

Hot path:

```
React component mounts:
  useEffect(() => getSnapshot(isin, "prices").then(setSnapshot), [isin])
  ↓
snapshot.ts: cacheKey = "INE…::prices"
  ├─ memory Map hit?     → return payload
  ├─ sessionStorage hit? → populate memory, return
  └─ miss                ↓
  fetch("/store/calcula/isin/INE…/snapshot?kind=prices",
        { headers: { "x-publishable-api-key": …,
                     "If-None-Match": priorEtag  // optional }})
  ↓
Medusa store route:
  ├─ routeCache.get("INE…::prices") hit?  → use cached body string
  └─ miss:
     calculaModule.getRawRow(isin, "prices")
       → listCompanyRecords({ isin },
            { select: ["id","isin","company_name","price_version","…","price_snapshot"] })
     → touchLastAccessed(id, isin)   // ≤1 write per hour per ISIN
     → assemble body via string concatenation (no JSON.parse)
     → cache in routeCache with etag = "<statements_version>:<price_version>"
  ↓
If If-None-Match matches entry.etag → return 304 (0 bytes)
Else
  setHeader("ETag", entry.etag)
  setHeader("Cache-Control", "private, max-age=0, must-revalidate")
  setHeader("Access-Control-Expose-Headers", "ETag, Cache-Control")
  res.end(entry.body)
  ↓
Storefront JSON.parse once; store the parsed payload in memory + session.
  ↓
Component renders directly off the parsed object. All subsequent UI
interactions (range change, zoom, event pin, collapse, tab switch) run off
that in-memory object with zero further network calls.
```

### 3.5 Render — client components

**PriceChart** (`storefront/src/components/product/PriceChart.tsx`):

1. Fetch once via `getSnapshot(isin, "prices")`.
2. `useMemo` builds an ECharts option from `snapshot.prices` (`[ts, price][]`)
   and `snapshot.events` (rendered as `markPoint` entries with an `_event`
   payload attached for click handlers).
3. Range selector (1M/6M/1Y/3Y/5Y/MAX) zooms via `dataZoom.startValue/endValue`
   — the whole series is always loaded, the range just windows the view.
4. Click on an event marker → custom React popover pinned over the canvas,
   clamped to the chart's bounding box. Dismissed on outside click or range
   change.
5. Expand button toggles a fullscreen modal that re-uses the same body JSX.

The ECharts import is **tree-shaken**: only `LineChart`, `GridComponent`,
`TooltipComponent`, `DataZoomComponent`, `MarkPointComponent`,
`MarkLineComponent`, `AxisPointerComponent`, and `CanvasRenderer` are pulled
in. Cuts the chunk from ~1.3 MB to ~400 KB.

**FinancialStatements** (`storefront/src/components/product/FinancialStatements.tsx`):

1. Fetch once via `getSnapshot(isin, "statements")`.
2. Picks `snapshot[mode].statements[statement].rows` based on
   Yearly/Quarterly + tab state.
3. `useMemo` computes `directLeafChildren: Map<parentIdx, leafIdxs[]>` from
   the flat `depth` array.
4. On first render, `collapsed = new Set(directLeafChildren.keys())` — every
   parent that owns leaf children starts collapsed.
5. Expand-all button toggles between `new Set()` and `new Set(…keys())`.
6. Clicking a parent row toggles only its direct leaf children — sub-parents
   (e.g. "Revenue" under "Profit and Loss") never disappear.

All state lives in component state. Switching tabs, toggling rows, and
expand-all never trigger a network request.

---

## 4. APIs and interfaces

### 4.1 Store API (used by the storefront, publishable key auth)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/store/calcula` | List all companies with optional `?sector`, `?market_cap`, `?share_type`, `?industry` filters. |
| `GET` | `/store/calcula/:companyId` | Lookup by Calcula's internal UUID. |
| `GET` | `/store/calcula/isin/:isin` | Full `company_record` row by ISIN (static fields + parsed blobs). |
| `GET` | `/store/calcula/isin/:isin/snapshot?kind=prices\|statements\|both` | **The hot path.** Streamed raw JSON, ETag-driven. |
| `GET` | `/store/products/:id` | Standard Medusa product endpoint; carries `metadata.isin`. |
| `POST` | `/store/upload` | File upload for KYC / cart attachments (unrelated to chart/statements). |
| `GET` | `/store/notifications*` | Customer notifications (unrelated). |

**Auth:** every store endpoint requires the `x-publishable-api-key` header.
Store it in `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` in the storefront env.

### 4.2 Admin API (session or bearer auth)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/admin/calcula/:isin` | Full row for the product-detail widget. |
| `POST` | `/admin/calcula/:isin` | Upsert the 21 static fields for one ISIN. |
| `POST` | `/admin/calcula/:isin/refresh` | Force refresh this ISIN's blobs from Calcula. |
| `POST` | `/admin/calcula/bulk` | `{ rows: [...] }` — bulk static-field upsert from bulk editor. |
| `POST` | `/admin/calcula/refresh-bulk` | `{ isins: [...] }` — bulk force-refresh. |
| `POST` | `/admin/calcula/prices/bulk` | Multipart CSV or JSON `{ rows }`; merges daily prices into `price_snapshot`. |
| `POST` | `/admin/products/import-shares` | Shares-focused bulk importer. Accepts multipart CSV with `title`, `isin`, and any of the 21 calcula fields. Rejects e-commerce-only columns (`weight`, `length`, `height`, `width`, `material`, `origin_country`, `hs_code`, `mid_code`, `shipping_profile_id`). |
| `POST` | `/admin/products` | Standard Medusa product create. `additional_data.isin` is **optional** — the stock admin form cannot send custom fields so enforcement here was removed. ISIN is linked post-create via the product-detail widget. |

### 4.3 Webhooks

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/webhooks/calcula` | Calcula → Medusa version envelope. Header: `X-Webhook-Secret` must match `CALCULA_WEBHOOK_SECRET`. Body: `{ isin, company_id, company_name, statements_version, price_version, content_updated_at }`. |

### 4.4 Calcula module service (in-process)

The `calcula` module (`backend/src/modules/calcula/index.ts`) is Medusa's
canonical abstraction for all this data. Resolve it with
`req.scope.resolve("calcula")` inside a route, or
`container.resolve("calcula")` inside a workflow/hook.

Key methods:

| Method | Purpose |
|---|---|
| `handleVersionEnvelope(payload)` | Core push-path write. Pulls stale snapshots and updates the row. |
| `forceRefresh(isin)` | Unconditional refetch. |
| `syncDrift()` | Cron reconciliation. |
| `getSnapshot(isin, kind)` | Parsed bundle (legacy API). |
| `getRawRow(isin, kind)` | **Preferred** — projected row read, returns text blobs unparsed. |
| `getByIsin(isin)` | Full parsed row (both blobs + all static fields). |
| `getByCompanyId(companyId)` | Same, keyed by Calcula's UUID. |
| `listByFilters(filters)` | Server-side filter by sector/market_cap/share_type/industry. |
| `upsertStaticFields(isin, data)` | Single-row write of the 21 admin fields. |
| `bulkUpsertStaticFields(rows)` | Parallel version with per-row results. |
| `bulkUpsertPrices(rows)` | Merge daily price points into `price_snapshot`, dedupe by timestamp, bump version only on change. |
| `pushPriceToCalcula({ isin, price, … })` | Push a price edit back to Calcula. |

All write methods invalidate the route LRU for the affected ISIN.

### 4.5 Environment configuration

Backend (`backend/.env` or process env):

```
CALCULA_API_URL=https://calcula.example.com
CALCULA_WEBHOOK_SECRET=<shared-secret>
IMPORT_SHARES_CURRENCY=inr                   # default for CSV variant_price
```

Storefront (`storefront/.env.local`):

```
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_…
```

---

## 5. Extensibility

### 5.1 Add a new static field

1. Add the column to `backend/src/modules/calcula/models/company-record.ts`.
2. Generate a migration: `npx medusa db:generate calcula`.
3. Run the migration: `npx medusa db:migrate`.
4. Add the key to the `fieldKeys` array in
   `CalculaModuleService.upsertStaticFields` in `backend/src/modules/calcula/index.ts`.
5. Add the key to the widget field list in
   `backend/src/admin/widgets/calcula-fields.tsx` (pick one of the three
   sub-sections: Company Profile / Financial Highlights / Regulatory).
6. Add the key to `CALCULA_FIELDS` in
   `backend/src/admin/routes/bulk-editor/page.tsx` so it shows up in the
   spreadsheet grid.
7. Add it to the `CALCULA_FIELDS` array in
   `backend/src/api/admin/products/import-shares/route.ts` so the CSV
   importer writes it through.
8. Mirror it on the storefront: add a row to the `Company Details` grid in
   `storefront/src/app/deals/[id]/page.tsx`.

No change to the snapshot route or the Calcula push/pull paths is needed —
static fields don't round-trip to Calcula.

### 5.2 Add a new kind of snapshot data

If you need a new JSON blob on the row (say, `analyst_reports_snapshot`):

1. Add the `text` column + a matching `_version` column to the model and
   generate a migration.
2. Extend the `Kind` union in
   `backend/src/api/store/calcula/isin/[isin]/snapshot/route.ts` and add a
   branch in the body-assembly that inlines the new blob.
3. Extend `getRawRow`'s `select` logic so only the blob asked for is pulled.
4. Add a new webhook or sync path in `calculaModule.handleVersionEnvelope`
   that fetches and stores the new blob.
5. Mirror the types in `storefront/src/lib/snapshot.ts` so the client
   parses them consistently.
6. Build a new client component (or extend an existing one) that calls
   `getSnapshot(isin, "<new-kind>")`.

The ETag format `"<statements_version>:<price_version>"` should be extended
to include the new version (`"<s>:<p>:<new>"`) so conditional GETs still
short-circuit correctly.

### 5.3 Add a new write endpoint

Use the existing admin routes as templates:

- **Single-ISIN write**: copy `backend/src/api/admin/calcula/[isin]/route.ts`,
  call `calculaModule.upsertStaticFields` or add a new service method.
- **Bulk write**: copy `backend/src/api/admin/calcula/bulk/route.ts`,
  delegate to a new service method that loops and returns per-row outcomes.
- **CSV import**: copy
  `backend/src/api/admin/calcula/prices/bulk/route.ts` for the multipart
  handling pattern. Use `parseCsvToObjects` from `backend/src/utils/csv.ts`
  — do not reimplement CSV parsing.

**Always call `invalidateRouteCacheForIsin(isin)` after any write** so the
process LRU drops the stale entry. If you forget, clients will see
up-to-60-seconds-stale data until the next HTTP cache expiry.

### 5.4 Add a new storefront component

- Never call Calcula directly. Never call Medusa admin routes.
- Always go through `getSnapshot(isin, kind)` from
  `storefront/src/lib/snapshot.ts`.
- Respect the `(isin, kind)` cache key — if your component only needs price
  data, pass `kind="prices"` so you don't pollute the statements cache slot
  or pay for a larger payload.
- Never persist snapshot data to `localStorage` — it's per-tab by design.
- Use types from `storefront/src/lib/snapshot.ts` and do not reinvent them.

### 5.5 Add a new write path from the storefront

Short answer: don't. The storefront is read-only for snapshot data. Writes
go through the Medusa admin routes, which require a session.

If you genuinely need a customer-scoped write (e.g. a "favorite this deal"
feature), add a store route under `backend/src/api/store/` and guard it
with `authenticate("customer", ["session", "bearer"])` in
`backend/src/api/middlewares.ts`, following the pattern used by
`/store/notifications*` and `/store/kyc*`.

---

## 6. Integration readiness

The cache layer is designed to make adding new downstream consumers cheap.

### 6.1 Mobile app (Flutter/React Native)

Everything the mobile app needs is already exposed:

- **Same store API** — point the mobile HTTP client at
  `NEXT_PUBLIC_MEDUSA_BACKEND_URL` with the same publishable key. The store
  routes already allow any `Origin` via the standard Medusa CORS config.
- **Same JSON shapes** — mirror `storefront/src/lib/snapshot.ts` in Dart /
  Swift / Kotlin. The contract is stable.
- **Same freshness semantics** — use the `ETag` header for conditional GETs
  (the server already sets `Access-Control-Expose-Headers: ETag,
  Cache-Control` so it's readable in JS and via any native HTTP client).
- **Same collapse rule** — the `directLeafChildren` logic is ~20 lines and
  ports verbatim.

For the chart specifically: use `flutter_echarts` to reuse the same option
builder (the option JSON is platform-agnostic), or bind `snapshot.prices`
to a native chart library like `syncfusion_flutter_charts` / `fl_chart`.

### 6.2 News + editorial CMS (shipped April 2026)

Two new snapshot kinds were added on top of `statements` and `prices`:

- **`news`** — curated `NewsEvent` rows. Schema: `id, company_id, occurred_at, category (C/N/R), title, body (markdown), source_url`. Owner module: `calcula/apps/backend/src/modules/news-events`. Version column: `Company.newsVersion` → `company_record.news_version`. Storefront consumers: `NewsPanel`, `EventTimeline`.
- **`editorial`** — bundles `CompanyOverview` (one per company: `summary`, `business_model`, `competitive_moat`, `risks`) + `ProsCons` (one per company: `pros`, `cons` as markdown bullet lists). Owner module: `calcula/apps/backend/src/modules/editorial`. Version column: `Company.editorialVersion` → `company_record.editorial_version`. Storefront consumers: `CompanyOverviewPanel`, `ProsConsPanel`.

Both kinds follow the same contract as `statements` and `prices`:
1. New columns `news_snapshot TEXT`, `news_version TEXT`, `editorial_snapshot TEXT`, `editorial_version TEXT` on `company_record` via `Migration20260408010000`.
2. `VersionEnvelope` extended with `news_version: number`, `editorial_version: number` (both optional for back-compat).
3. `handleVersionEnvelope` added `needNews` and `needEditorial` branches that pull from `/api/companies/by-isin/:isin/snapshot/news` and `/api/companies/by-isin/:isin/snapshot/editorial`.
4. Store snapshot route accepts `?kind=news` and `?kind=editorial`.
5. ETag composed of all four version numbers: `"<s>:<p>:<n>:<e>"`.
6. Calcula admin adds `NewsEventsSection` and `EditorialSection` to the company detail page.

This is the template for adding future CMS content types — see "Extend a new snapshot kind" in §5.2.

### 6.3 Alerts / price triggers

Same shape as news:

1. `alerts` module owns an `alert` table: `{ id, customer_id, isin,
   direction, threshold_price, created_at, last_fired_at }`.
2. Listen to the `calcula` module's write path via a Medusa subscriber
   (`backend/src/subscribers/price-updated.ts`) that fires whenever
   `price_version` bumps in `handleVersionEnvelope`. Cross-check any
   matching alert rows and trigger a notification.
3. Route `/store/alerts` (customer-authenticated) for CRUD from the
   storefront.

### 6.4 Third-party data enrichment

If you want to blend in another data source (e.g. ESG scores, sector
benchmarks):

- **As a new column** on `company_record` if the data is a small, stable
  scalar per ISIN (e.g. `esg_score: text`).
- **As a new table** joined on `isin` if the data is a list or needs its
  own version history (e.g. `sector_benchmark_snapshot`).
- **As a new JSON blob** on `company_record` if it needs the same webhook
  + version + freshness model as Calcula. Follow §5.2.

Never put live third-party URLs in the storefront. Always proxy through
Medusa so API keys stay server-side and CORS stays predictable.

---

## 7. Best practices

### Data layer

- **One source of truth per field.** Calcula owns prices and statements.
  Medusa owns the 21 admin fields. Don't duplicate; the push-path from
  Medusa to Calcula (prices) is the only exception, and it converges via
  the webhook.
- **Use `getRawRow` in new store routes**, not `getSnapshot`. The former
  avoids the JSON round-trip; the latter exists for backward compatibility.
- **Always invalidate after writes.** Every mutation to a `company_record`
  row must call `invalidateRouteCacheForIsin(isin)` in the service method,
  not in the route handler. This keeps the invariant local to the write
  path.
- **Store blobs as `text`, not `jsonb`.** `text` is faster to read and
  lets the store route stream the body without a parse/stringify. TOAST
  compresses large text automatically.
- **Don't add columns you'll query via SQL inside JSON.** If you need to
  filter on a field, put it on its own column. The JSON blobs are opaque
  from SQL's perspective and should stay that way.
- **Always use `parseCsvToObjects`** from `backend/src/utils/csv.ts` for
  CSV work. Do not re-implement CSV parsing.

### API layer

- **ETag format is `"<statements_version>:<price_version>"`.** When you add
  a new snapshot kind, extend the ETag so every version bump invalidates
  cached bodies correctly.
- **All snapshot responses set `Cache-Control: private, max-age=0,
  must-revalidate`.** Never cache snapshot responses in the browser or a
  CDN — the ETag short-circuit keeps the cost low (304 reads only the two
  version columns). A `public` + `max-age>0` visibly freezes price charts
  after admin edits.
- **Use `Access-Control-Expose-Headers`** when you add custom response
  headers you want the browser to read — CORS hides them by default.
- **Never block on Calcula in a store route.** Read from
  `company_record` only. If the row is empty, return 404 and let the cron
  catch up.
- **Additional-data validation lives in middleware.** To accept an optional
  custom field on product create, add an entry like
  `additionalDataValidator: { isin: z.string().optional() }` to
  `backend/src/api/middlewares.ts`, then consume it in a
  `createProductsWorkflow.hooks.productsCreated` hook. **Do not require
  custom fields here** — Medusa v2 admin's stock Create Product form
  cannot send `additional_data`, so a required validator makes every
  create fail. If you need enforcement, do it at the widget level on
  `product.details.after` (which has access to the full form state
  post-creation).

### Workflow layer

- **Always use workflow hooks** (`productsCreated`, etc.) for cross-cutting
  validation and seeding. Don't put business rules in route handlers.
- **Wire new hooks via the barrel**
  `backend/src/workflows/hooks/index.ts` so Medusa's autoloader picks them
  up.
- **Bounded concurrency for batch jobs.** Use `mapLimit` from
  `backend/src/modules/calcula/index.ts` — don't spawn unbounded
  `Promise.all` loops that slam Calcula.

### Client layer

- **Cache keys are `(isin, kind)`.** Never strip the kind; different
  components need different payloads.
- **Conditional GET is automatic** once you use `getSnapshot`. If you
  handroll a fetch, don't — refactor to go through the helper.
- **Tree-shake ECharts.** New chart components must use the
  `echarts/core` + `echarts.use([...])` pattern from `PriceChart.tsx`.
  Never `import ReactECharts from "echarts-for-react"` directly, that
  pulls the whole ~1.3 MB bundle.
- **No data-layer state in React components.** Components call
  `getSnapshot` in a `useEffect` and store the result in local state.
  Don't introduce Redux / Zustand for this data — the cache layer is
  already the store.
- **Hierarchy walks use `depth`, not recursion.** Follow the
  `directLeafChildren` pattern in `FinancialStatements.tsx` for any
  similar tree render.

### Testing

- **Type-check is the primary gate.** Run `npx tsc --noEmit` in both
  `backend/` and `storefront/` before every PR.
- **Build the backend before shipping any route change.**
  `cd backend && npm run build` — the admin dashboard bundle catches
  widget-level TSX errors that `tsc --noEmit` misses.
- **Live-check the snapshot route with curl.** Example:
  ```bash
  curl -sD - "http://localhost:9000/store/calcula/isin/<ISIN>/snapshot?kind=prices" \
    -H "x-publishable-api-key: $NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY"
  ```
  Look for `ETag`, `Cache-Control`, and non-zero body size.
- **Verify conditional GET returns 304**:
  ```bash
  curl -sD - ".../snapshot?kind=prices" \
    -H "x-publishable-api-key: …" \
    -H 'If-None-Match: "<etag-from-previous-call>"'
  ```

### Sync pipeline (read integrations.md for the full invariant list)

- **Snake_case wire format in both directions.** `VersionEnvelope` on the wire is `{isin, statements_version, price_version, content_updated_at}`. Any Calcula endpoint returning camelCase silently breaks Medusa's drift cron.
- **Invalidate Calcula's 5s snapshot cache on every write** before the webhook fires. `PricesService.bumpPriceVersion`, `FinancialsService.upsertFinancialValues`, `PeriodsService.bumpStatementsForCompany` all do this.
- **`pushPriceToCalcula` datetime = `new Date()`**, not start-of-day. The new row must be the tail of the sorted series so `extractLatestPriceFromSnapshot` picks it.
- **Loop breaker is value-based.** Subscribers compare outgoing pushes to `globalThis.__calculaLastFromCalcula[isin]`. Equal → skip; different → push. The map is set in `syncLatestPriceToMedusaVariant` before any early-exit.
- **Variant reverse sync runs at ROUTE scope.** `syncLatestPriceToMedusaVariant(container, isin, latest)` from `backend/src/modules/calcula/variant-price-sync.ts`. Never call it from inside the module service — module containers lack `Modules.QUERY` and core workflows.

### Operations

- **The minute cron is idempotent.** Safe to restart Medusa at any time.
  On startup, the cron reads the latest `content_updated_at` and picks up
  wherever it left off.
- **Webhook secret rotation**: set `CALCULA_WEBHOOK_SECRET` on both
  services simultaneously. During rotation, the old secret will be
  rejected; the cron will catch any missed updates within one minute.
- **Growth monitoring**: `company_record` grows monotonically. Watch
  `pg_total_relation_size('company_record')` and the average
  `octet_length(statements_snapshot)` if you want to plan cold-storage
  eviction. `last_accessed_at` is already tracked and can drive a
  future eviction job.
- **Do not enable Postgres JSONB indexes** on the snapshot columns. They
  are opaque by design and any attempt to index into them will pay a
  serialization tax on every write.

---

## 8. File reference

Key files to read in order when onboarding:

1. `backend/src/modules/calcula/models/company-record.ts` — the schema.
2. `backend/src/modules/calcula/index.ts` — the service, the push/pull
   paths, and the bulk methods.
3. `backend/src/api/store/calcula/isin/[isin]/snapshot/route.ts` — the
   hot-path read endpoint with LRU + ETag + streaming body.
4. `backend/src/api/webhooks/calcula/route.ts` — the push-path entry point.
5. `backend/src/jobs/sync-calcula-snapshots.ts` — the pull-path cron.
6. `backend/src/api/middlewares.ts` — authentication, CSV multer, and the
   `additionalDataValidator` for ISIN enforcement.
7. `backend/src/workflows/hooks/validate-product-isin.ts` — the hook that
   forces every product to have an ISIN.
8. `backend/src/admin/widgets/calcula-fields.tsx` — the single-product
   editor.
9. `backend/src/admin/routes/bulk-editor/page.tsx` — the bulk editor.
10. `storefront/src/lib/snapshot.ts` — the client cache + conditional GET.
11. `storefront/src/components/product/PriceChart.tsx` — the tree-shaken
    ECharts integration.
12. `storefront/src/components/product/FinancialStatements.tsx` — the
    collapsible statements tree.
13. `storefront/src/app/deals/[id]/page.tsx` — the deal detail page that
    composes everything.

If you read those thirteen files in order, you will understand every write
path, every read path, every cache tier, and every rendering concern in
this system.
