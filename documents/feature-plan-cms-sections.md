# Feature Plan: Storefront CMS Sections + Price Chart Upgrades

**Status: ✅ ALL PHASES SHIPPED (April 2026).** This document is retained as the historical design record. For the current shape of the code see `backend-medusa.md`, `calcula.md`, and `storefront.md`.

| Phase | Status | Key artefacts |
|---|---|---|
| 1 — Price tag categories (C/N/R) | ✅ Shipped | `CompanyPriceHistory.category`, chart marker palette, filter pills |
| 2 — Chart timeframes (Daily/Weekly/Custom) | ✅ Shipped | `downsample()`, `CustomRangePopover`, granularity toggle |
| 3 — News & events panel | ✅ Shipped | `NewsEvent` model, `news` snapshot kind, `NewsPanel`, `NewsEventsSection` admin |
| 4 — Pros & Cons panel | ✅ Shipped | `ProsCons` model, `editorial` snapshot kind, `ProsConsPanel` |
| 5 — Company Overview panel | ✅ Shipped | `CompanyOverview` model, folded into `editorial`, `CompanyOverviewPanel` |
| 6 — Event Timeline | ✅ Shipped | Reuses `NewsEvent` data, `EventTimeline` component |
| 7a — Calcula admin bulk ops | ✅ Shipped | `deleteBulk`, checkboxes, bulk-edit modal |
| 7b — Bulk edit category | ✅ Shipped (folded into 7a) | `category` is one of the bulk-edit fields |

End-to-end verified against the live stack on 2026-04-08. All four codebases type-check clean. See the dated design below for the original rationale.

---

**Depends on:** Sync pipeline as described in [integrations.md](./integrations.md) (must be stable first — it now is).

## Goals

Pull together six product-detail improvements + two chart upgrades + one Calcula admin upgrade under a single rollout. The theme is: **Calcula becomes the editorial CMS, Medusa caches, storefront renders**. No new services.

1. **Price data categories (C / N / R)** on every `CompanyPriceHistory` row so the `PriceChart` can render coloured markers for corporate events, news, and regulatory notices.
2. **Chart timeframes: Daily, Weekly, Custom date range.** Extend the existing 1M / 6M / 1Y / 3Y / 5Y / MAX selector.
3. **News & events panel** on the deal detail page — merging scraper-sourced articles from `news_event` with any editorial notes from Calcula.
4. **Pros & Cons panel** — author-curated investment thesis, one row per company.
5. **Company Overview panel** — long-form narrative replacing the terse `description` field.
6. **Timeline of major events** — vertical timeline on the deal page, reading from the same event source as the chart markers.
7. **Bulk edit + bulk delete** in the Calcula Price Data admin section — multi-select checkboxes with batch operations, so editors don't have to delete 50 rows one at a time.

All data flows through the same contract: **new Calcula tables → new snapshot kinds → new `company_record` columns → new `?kind=...` query param on `/store/calcula/isin/:isin/snapshot` → new storefront React components**. This mirrors the existing statements and prices path and requires no new infrastructure.

## Context / why this shape

- Calcula already owns authoritative financial data. Extending it with editorial content types keeps one source of truth and reuses the existing version/webhook/cache invalidation pipeline.
- `news_event` stays independent (Python scrapers, separate deploy) but the storefront merges its `/api/news/by-isin/:isin` output with Calcula's editorial news stream in a single panel.
- Chart markers and the timeline read from the same events source, so there's one editorial surface for "notable moments" and two rendering surfaces.

## Phase 0 — Prerequisites (already done)

- ✅ Sync pipeline invariants ([integrations.md §6](./integrations.md)) are stable:
  snake_case wire format, snapshot cache invalidation, value-based loop breaker, datetime-now in `pushPriceToCalcula`, route-scope variant sync, `Cache-Control: private, max-age=0, must-revalidate`, `CACHE_TTL_MS = 0` on the storefront.
- ✅ `PeriodsService.bumpStatementsForCompany` exists and fires `syncToMedusa`.
- ✅ `company_record` has `statements_snapshot`, `price_snapshot`, `statements_version`, `price_version`, `content_updated_at`.

## Phase 1 — Price tag categories (C / N / R)

**Goal:** every price point can carry a tag; chart renders a coloured marker.

### 1.1 Calcula Prisma schema
Add to `CompanyPriceHistory`:
```prisma
category String? // "C" | "N" | "R" (null = untagged)
```
Migration: `calcula/apps/backend/prisma/migrations/<ts>_price_category/migration.sql`.

### 1.2 Calcula write path
- `PricesService.upsertOne` and `upsertBulk` accept an optional `category` in the DTO.
- `PricesService.bumpPriceVersion` still runs (no change — the snapshot content changes, version must bump).
- `SnapshotsService.pricesByIsin` includes `category` in the event array:
  ```ts
  events: { datetime, price, note, link, category }[]
  ```
- Admin UI (`calcula/apps/frontend/src/pages/prices/`) gets a `<Select>` on the price form with the three tags + "Untagged".

### 1.3 Snapshot schema (wire contract)
Extend `PriceSnapshot.events[]` in `storefront/src/lib/snapshot.ts`:
```ts
type PriceEvent = {
  datetime: string
  price: number
  note: string | null
  link: string | null
  category: "C" | "N" | "R" | null   // NEW
}
```
No version bump needed (old rows will have `category: null`).

### 1.4 Chart rendering
In `storefront/src/components/product/PriceChart.tsx`:
- Event markers (`markPoint`) already exist — extend the ECharts `itemStyle.color` per event based on `category`:
  - `C` (corporate) → emerald
  - `N` (news) → amber
  - `R` (regulatory) → rose
  - `null` → slate (current behaviour)
- Tooltip gains a category label next to the date.
- Add a filter toggle above the chart: `[C] [N] [R]` checkboxes to hide/show markers by category. Derived state, no useEffect.

### 1.5 news_event propagation (optional phase 1.5)
If the scraper should auto-tag, extend `news_event/scrapers/google_news.py` and `drhp.py` to emit `category` on their output JSON (Article gets a `category` column). The storefront news panel (Phase 3) uses this to filter its own cards.

## Phase 2 — Chart timeframes

**Goal:** add Daily, Weekly, and Custom date range modes to the existing range selector.

### 2.1 Downsampling strategy
`CompanyPriceHistory` rows can be any datetime (typically irregular intraday). Define three modes in `PriceChart.tsx`:

| Mode | Behaviour |
|---|---|
| `Daily` | Bucket by UTC day, take the last row of each day. Current default. |
| `Weekly` | Bucket by ISO week (Mon–Sun), take the last row of each week. |
| `Custom` | Date-range picker → filter `points[]` to `startMs ≤ ts ≤ endMs`, no downsampling. |

All three operate on the existing `snapshot.prices: [ts, price][]` series — no new endpoint, no new data. Downsampling is pure client-side `useMemo`.

### 2.2 UI
- Add a `Granularity` dropdown next to the existing range buttons: `Daily` / `Weekly`.
- The existing range buttons (1M / 6M / 1Y / 3Y / 5Y / MAX) are **date-range presets**, not granularity choices. Keep them.
- Add a `Custom` button that opens a date-range picker (use `@radix-ui/react-popover` + native `<input type="date">` for minimum dependencies). When a custom range is active, the preset buttons deselect.

### 2.3 State shape
```ts
type RangeKey = "1M" | "6M" | "1Y" | "3Y" | "5Y" | "MAX" | "CUSTOM"
type Granularity = "daily" | "weekly"
const [granularity, setGranularity] = useState<Granularity>("daily")
const [customRange, setCustomRange] = useState<[Date, Date] | null>(null)
```

Derive `visiblePoints` via `useMemo(() => downsample(snapshot.prices, granularity).filter(inRange(range, customRange)), [snapshot, granularity, range, customRange])`.

## Phase 3 — News & events panel

**Goal:** "News" section on the deal detail page showing (a) editorial news from Calcula + (b) scraper news from `news_event`, chronologically merged.

### 3.1 Calcula: new `NewsEvent` table
```prisma
model NewsEvent {
  id         String    @id @default(uuid()) @db.Uuid
  companyId  String    @map("company_id") @db.Uuid
  occurredAt DateTime  @map("occurred_at") @db.Timestamptz(6)
  category   String    // "C" | "N" | "R" — same vocabulary as price tags
  title      String
  body       String    // markdown
  sourceUrl  String?   @map("source_url")
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)

  company    Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@index([companyId, occurredAt(sort: Desc)])
  @@map("news_events")
}
```

### 3.2 New snapshot kind `news`
- `SnapshotsService.newsByIsin(isin)` returns `{ isin, newsVersion, contentUpdatedAt, events: NewsEvent[] }`.
- `Company.newsVersion Int @default(0)` added, bumped in a new `NewsEventsService.upsert` / `delete` path via the shared `bump-and-webhook` helper.
- New Calcula endpoint: `GET /api/companies/by-isin/:isin/snapshot/news`.

### 3.3 Medusa cache
- New columns on `company_record`: `news_snapshot TEXT`, `news_version TEXT`.
- Mikro-ORM migration to add both.
- `handleVersionEnvelope` gains a `needNews = payload.news_version > local.news_version` branch and pulls `/snapshot/news` when set.
- `VersionEnvelope` type on the wire gains `news_version: number`.
- Calcula's `WebhookService` includes `news_version` in the envelope.
- ETag on `/store/calcula/isin/:isin/snapshot` becomes `"<s>:<p>:<n>"` so news bumps invalidate the cache.

### 3.4 Storefront component `<NewsPanel isin=…>`
- `getSnapshot(isin, "news")` → `BundleResponse.news`.
- Also fetches `/api/news/by-isin/:isin` from the `news_event` Astro site in parallel (best-effort; falls back to empty if site is down).
- Merges both streams by `occurred_at` (DESC), dedupes on URL.
- Renders cards with category badge (C/N/R), title, date, first 200 chars of body, external link, "expand" → full body in a modal.
- Filter pills at top: `[All] [C] [N] [R]` — client-side.

## Phase 4 — Pros & Cons panel

**Goal:** author-curated investment thesis.

### 4.1 Calcula: `ProsCons` table
```prisma
model ProsCons {
  id         String   @id @default(uuid()) @db.Uuid
  companyId  String   @unique @map("company_id") @db.Uuid // one row per company
  pros       String   // markdown bullet list
  cons       String
  updatedAt  DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  company    Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  @@map("pros_cons")
}
```

### 4.2 Snapshot reuse (no new kind)
Pros and Cons don't need their own version — they rarely change. Fold them into a broader editorial kind:

- Introduce a single new snapshot kind `editorial` that bundles `pros_cons` + `company_overview` + `timeline` (Phase 5, 6) into one payload.
- `Company.editorialVersion Int` + new column on `company_record`.
- One endpoint, one version, one pull — three components read slices.

Rationale: these three content types rarely change and are all edited by the same admins in the same sitting. One snapshot + one version bump keeps the pipeline simple.

### 4.3 Storefront `<ProsConsPanel>`
- Two-column layout: green pros / rose cons, each a bulleted list rendered from markdown.
- Collapsible on mobile (defaults to collapsed).

## Phase 5 — Company Overview panel

**Goal:** Replace the single-line `description` with a long-form section.

### 5.1 Calcula: `CompanyOverview` table
```prisma
model CompanyOverview {
  id         String   @id @default(uuid()) @db.Uuid
  companyId  String   @unique @map("company_id") @db.Uuid
  summary    String   // markdown, ~500 words
  businessModel String? @map("business_model")
  competitiveMoat String? @map("competitive_moat")
  risks      String?
  updatedAt  DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  company    Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  @@map("company_overview")
}
```
Folded into the `editorial` snapshot kind from Phase 4.

### 5.2 Storefront `<CompanyOverview>`
- Reads `snapshot.editorial.overview`.
- Renders as collapsible "About" card.
- Markdown rendered via `react-markdown` + `remark-gfm` (if not already in the bundle, consider a minimal markdown pass-through instead).

## Phase 6 — Timeline of major events

**Goal:** vertical timeline on the deal page showing all C/N/R events chronologically.

### 6.1 Data source
No new table — **read from the same `NewsEvent` table as Phase 3**. The timeline and the news panel are two views over the same data.

### 6.2 Storefront `<EventTimeline>`
- Reads `snapshot.news.events` (or `editorial.events` if folded into editorial kind).
- Renders a vertical line with dated nodes, colored by category.
- Clicking a node scrolls the NewsPanel to the matching card (smooth scroll via `scrollIntoView`).

## Phase 7 — Calcula admin: bulk edit + bulk delete for Price Data

**Goal:** Let editors multi-select rows in the Price Data section and (a) delete all selected rows in one click, or (b) edit a common field (price, note, link, category) across all selected rows.

### 7.1 Current state
`calcula/apps/frontend/components/admin/price-history-section.tsx` (438 lines) has:
- Single-row add via modal
- Single-row edit via modal (pre-filled from the row)
- Single-row delete with `confirm()`
- CSV import (`UPSERT_COMPANY_PRICE_BULK_MUTATION`)
- No selection state, no batch UI

### 7.2 Backend: new bulk-delete mutation
Current mutations in `calcula/apps/backend/src/modules/prices/prices.service.ts`:
- `upsertOne`
- `upsertBulk` (already exists — used by CSV import)
- `deleteOne`

**Add:** `deleteBulk(companyId: string, ids: string[])` that:
1. Verifies all ids belong to the given `companyId` (prevent cross-company deletes via crafted request).
2. Runs `prisma.companyPriceHistory.deleteMany({ where: { id: { in: bigIds }, companyId } })`.
3. Calls `bumpPriceVersion(companyId)` ONCE for the whole batch (not N times).
4. Invalidates snapshot cache, fires webhook.

Add corresponding GraphQL mutation + resolver + REST controller route:
- GraphQL: `deletePriceBulk(companyId: ID!, ids: [ID!]!): Boolean`
- REST (for webhook-secret integrators): `POST /api/companies/:companyId/price/delete-bulk` with body `{ ids: string[] }`.

**`upsertBulk`** already exists and is used for the "edit same field across many rows" flow — the frontend constructs a merged-input array and calls it. No backend change needed for bulk edit.

### 7.3 Frontend state shape
Add to `PriceHistorySection`:
```ts
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
const [bulkEditModal, setBulkEditModal] = useState<null | BulkEditDraft>(null)

type BulkEditDraft = {
  mode: "price" | "note" | "link" | "category" | "clear-event"
  value: string | null
}
```

`selectedIds` is cleared whenever `rows` reloads (after any save/delete).

### 7.4 Table UI changes
- Add a checkbox column as the first column of the table.
- Header checkbox implements "select all / none" tri-state (checked / unchecked / indeterminate).
- Row checkboxes toggle an individual row's presence in `selectedIds`.
- When `selectedIds.size > 0`, the top toolbar shows a contextual action bar:
  ```
  [3 selected] [Bulk Edit ▾] [Delete Selected] [Clear Selection]
  ```
- The "Bulk Edit" dropdown opens a modal with a radio group for which field to edit, plus an input for the new value, plus a "Clear event (remove note + link)" preset.

### 7.5 Bulk delete flow
1. User ticks rows, clicks "Delete Selected".
2. `confirm("Delete N selected rows? This cannot be undone.")`.
3. Call `gql(DELETE_PRICE_BULK_MUTATION, { companyId, ids: [...selectedIds] }, token)`.
4. Clear `selectedIds`, reload, show success toast.

### 7.6 Bulk edit flow
1. User ticks rows, picks "Bulk Edit → Price" (or Note / Link / Category / Clear event).
2. Modal prompts for the new value.
3. On submit, build an `entries` array:
   ```ts
   const entries = rows
     .filter(r => selectedIds.has(r.id))
     .map(r => ({
       datetime: r.datetime,  // unchanged
       price: mode === "price" ? Number(value) : r.price,
       note:  mode === "note"  ? (value || null) : (mode === "clear-event" ? null : r.note),
       link:  mode === "link"  ? (value || null) : (mode === "clear-event" ? null : r.link),
       category: mode === "category" ? value : r.category,
     }))
   ```
4. Call `UPSERT_COMPANY_PRICE_BULK_MUTATION` with the full list.
5. Server upserts every row (existing `(companyId, datetime)` unique constraint means each hits an update path, not an insert).
6. `bumpPriceVersion` fires once at the end of `upsertBulk` → one webhook to Medusa → one reverse sync.

### 7.7 Safety rails
- The "Delete Selected" button should require the count in the button label (`Delete 12 rows`) to force intent.
- Bulk category edit is the easiest way to tag a historical batch after the Phase 1 schema migration lands. Wire this early so editors can backfill.
- Keep the CSV importer as-is — it's the power-user path for very large batches (>100 rows).

### 7.8 Frontend files to touch
- `calcula/apps/frontend/components/admin/price-history-section.tsx` — add selection state + action bar + bulk-edit modal.
- `calcula/apps/frontend/lib/queries.ts` — add `DELETE_PRICE_BULK_MUTATION`.
- `calcula/apps/frontend/types/domain.ts` — extend `CompanyPricePoint` with `category` after Phase 1 ships.

### 7.9 Dependency on Phase 1
Bulk editing `category` requires Phase 1 (C/N/R schema). Without Phase 1, only price/note/link/delete work. Ship Phase 7 in two stages:
- **7a**: selection + bulk delete + bulk edit for price/note/link/clear-event. Ships independently.
- **7b**: category column + bulk edit for category. Ships after Phase 1.

## Phase rollout order

1. **Phase 7a (bulk select + bulk delete + bulk edit of existing fields)** — pure Calcula admin work, no schema changes, immediate productivity win.
2. **Phase 2 (chart timeframes)** — purely client-side, no schema work.
3. **Phase 1 (price tags C/N/R)** — adds the `category` column; low risk.
4. **Phase 7b (bulk edit category)** — trivial once phases 1 and 7a are in.
5. **Phase 3 (news panel + `NewsEvent` table)** — introduces the first new snapshot kind; pipeline work.
6. **Phase 4–5–6 (editorial snapshot)** — bundle pros/cons + overview + timeline into a single new kind. Ship in one PR since they share storage and wire format.

Each phase is independent at the data layer. Phases 3 and 4–6 must update the ETag format together (`"<s>:<p>:<n>:<e>"`).

## Critical files to modify

### Calcula backend
- `calcula/apps/backend/prisma/schema.prisma` — add `category` to `CompanyPriceHistory`, add `NewsEvent`, `ProsCons`, `CompanyOverview`, add `newsVersion` / `editorialVersion` to `Company`
- `calcula/apps/backend/src/modules/prices/prices.service.ts` — accept `category` in DTO
- `calcula/apps/backend/src/modules/snapshots/snapshots.service.ts` — add `newsByIsin` and `editorialByIsin`, return snake_case `{isin, *_version, content_updated_at, ...}`
- `calcula/apps/backend/src/common/services/webhook.service.ts` — include `news_version` + `editorial_version` in the envelope
- NEW: `calcula/apps/backend/src/modules/news-events/*` (module + service + resolver + controller)
- NEW: `calcula/apps/backend/src/modules/editorial/*` (module for pros/cons + overview)

### Medusa backend
- `backend/src/modules/calcula/models/company-record.ts` — add `news_snapshot`, `news_version`, `editorial_snapshot`, `editorial_version` text columns
- Migration under `backend/src/modules/calcula/migrations/`
- `backend/src/modules/calcula/index.ts` — extend `VersionEnvelope`, `handleVersionEnvelope`, `getRawRow` `kind` union, ETag format
- `backend/src/api/store/calcula/isin/[isin]/snapshot/route.ts` — extend the `Kind` union and body assembly

### Storefront
- `storefront/src/lib/snapshot.ts` — extend `BundleResponse`, add `editorial` and `news` kinds, update cache key logic
- `storefront/src/components/product/PriceChart.tsx` — category markers, filter pills, granularity dropdown, custom date range picker
- NEW: `storefront/src/components/product/NewsPanel.tsx`
- NEW: `storefront/src/components/product/ProsConsPanel.tsx`
- NEW: `storefront/src/components/product/CompanyOverview.tsx`
- NEW: `storefront/src/components/product/EventTimeline.tsx`
- `storefront/src/app/deals/[id]/page.tsx` — compose the new sections

### news_event (optional, Phase 1.5)
- `news_event/scrapers/google_news.py` + `drhp.py` — emit `category` on output
- `news_event/site/src/pages/api/news.astro` + `news/by-isin/[isin].astro` — include `category` in JSON

## Verification plan per phase

### Phase 1 — Price tags
- Calcula unit test: post a price with `category: "C"`, read via `/snapshot/prices`, assert event has category.
- Contract test: bump price → webhook → Medusa snapshot contains the category.
- Storefront visual test: load deal page, confirm markers render in the correct colors; toggle the C/N/R filter and confirm only the right markers stay.

### Phase 2 — Chart timeframes
- Unit test on the downsampling function with a fixed series.
- Visual: switch Daily ↔ Weekly with a known dataset (e.g., 1 year of daily prices) and confirm the line smooths correctly.
- Custom range: pick a range that has no data → empty-state, pick a range that spans data → correct zoom.

### Phase 3–6 — Snapshot kinds
- Create a `NewsEvent` in Calcula admin → verify `news_version` bumps in both DBs → storefront panel shows the item within the HTTP round-trip (no drift cron wait).
- Force-refresh via `/admin/calcula/:isin/refresh` should also refresh the news + editorial blobs (extend the helper).
- Verify the ETag short-circuits — second load of the deal page should 304 on everything.

## Out of scope (explicit non-goals)

- No mobile-specific layouts beyond the existing Tailwind responsive classes.
- No permissions layer beyond Calcula's existing admin JWT — any editor can write to any company's editorial content.
- No i18n for editorial content. English only in Phase 1.
- No full-text search over news or overview content. Add later if needed.
- No analytics on which panels users interact with. Add via PostHog later.

## Open questions

1. Should `R` (Regulatory) be a distinct tag or rolled into `N` for simplicity? The user's initial spec explicitly allows both approaches. **Default:** ship all three; the filter pill is trivial.
2. Should the news panel merge Calcula editorial + scraper output into a single list, or two tabs? **Default:** merged + filter pills (preserves chronological signal).
3. Timeline — same data as news, or separate curation? **Default:** same data, different rendering.
4. Do we need Pros/Cons versioning? They rarely change, and the editorial snapshot bundles them — no individual version. **Default:** no separate version.

Flag any of these at kickoff before implementation starts.
