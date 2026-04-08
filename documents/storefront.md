# Storefront — Next.js 16

Location: `storefront/`. Public investor-facing site. Next.js 16 App Router (Turbopack dev), React 19, Tailwind 4, ECharts (tree-shaken).

## Directory tree (`storefront/src`)

```
storefront/src/
├── app/                          # App Router pages (flat, no route groups)
│   ├── layout.tsx                # Root layout: providers (User, Cart, Toast)
│   ├── page.tsx                  # Home: hero, featured deals
│   ├── globals.css
│   ├── deals/
│   │   ├── page.tsx              # Deal listing + filters
│   │   └── [id]/page.tsx         # Deal detail (financials + chart + news)
│   ├── dashboard/
│   │   ├── page.tsx              # Portfolio, KYC status, manual holdings
│   │   └── kyc/page.tsx          # KYC form + file uploads
│   ├── cart/page.tsx             # Cart review, fee breakdown
│   ├── checkout/page.tsx         # Manual-transfer payment instructions
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── forgot-password/
│   ├── account/
│   ├── kyc/                      # (alt KYC entry)
│   ├── cmr-copy/                 # CMR upload flow
│   ├── trending-sectors/
│   ├── knowledge/                # Knowledge hub (categories + articles)
│   ├── about/, contact/
│   ├── careers/, partner-with-us/, why-choose-us/
│   ├── privacy/, terms/, disclaimer/, sebi-guidelines/, cancellation-policy/
├── components/
│   ├── deals/                    # Deal-list / deal-card components
│   ├── home/                     # Home sections (FeaturedDeals, etc.)
│   ├── layout/                   # Navigation, Footer, shell
│   └── product/
│       ├── FinancialStatements.tsx   # Collapsible P&L / BS / CF, Yearly ↔ Quarterly, year picker
│       ├── PriceChart.tsx            # ECharts time series (tree-shaken), C/N/R markers, filter pills, Daily/Weekly, Custom date range
│       ├── NewsPanel.tsx             # Editorial news, C/N/R filter pills, markdown snippets
│       ├── EventTimeline.tsx         # Vertical chronological timeline of NewsEvent data
│       ├── ProsConsPanel.tsx         # Two-column emerald/rose bullet card
│       └── CompanyOverviewPanel.tsx  # Long-form narrative + collapsible sub-sections
├── context/
│   ├── UserContext.tsx           # Auth session + Medusa customer
│   ├── CartContext.tsx           # Cart state + fee calculations
│   └── ToastContext.tsx          # Toast notifications
├── lib/
│   ├── medusa.ts                 # Primary REST client
│   ├── calcula.ts                # Calcula-specific helpers
│   ├── snapshot.ts               # Types for statements / price snapshots
│   ├── metadata.ts               # SEO / next metadata helpers
│   └── api/                      # Additional per-domain clients
└── data/
    └── deals.ts                  # Static / seed deal content for home
```

Top level: `next.config.ts`, `tailwind.config.ts`, `package.json`, `.env.local`.

## Pages by route

### Public

| Route | Purpose |
|---|---|
| `/` | Home: hero, featured deals, “how it works” |
| `/deals` | Deal listing with filters (sector, market cap, share type) |
| `/deals/[id]` | Deal detail: company info, financial snapshot, price chart, news, add-to-cart |
| `/knowledge` + subpages | Education hub (categories and articles) |
| `/trending-sectors` | Trending sectors landing |
| `/about`, `/contact`, `/careers`, `/partner-with-us`, `/why-choose-us` | Info |
| `/privacy`, `/terms`, `/disclaimer`, `/sebi-guidelines`, `/cancellation-policy` | Legal |

### Protected / auth

| Route | Purpose |
|---|---|
| `/login` | Medusa customer emailpass login |
| `/register` | Two-step signup: auth identity + Medusa customer |
| `/forgot-password` | Password reset |
| `/account` | Account settings |
| `/dashboard` | Portfolio summary, KYC status, manual holdings |
| `/dashboard/kyc` | KYC form: PAN, Aadhaar, DP, Demat, file uploads |
| `/kyc`, `/cmr-copy` | KYC-related sub-flows |
| `/cart` | Cart items, fees, proceed to checkout |
| `/checkout` | Order summary + manual transfer instructions |

## Contexts

### `UserContext.tsx`
- Stores current `session`, Medusa customer, and auth token in `localStorage` (`medusa_auth_token`).
- `login()`, `register()`, `logout()`, `refreshSession()`.
- Used by pages that need auth; unauthenticated access redirects to `/login`.

### `CartContext.tsx`
- Persists Medusa cart id in `localStorage`.
- Line items + fee calculations:
  - Processing fee: **2% of investment**
  - Low-quantity fee: **₹250 if investment < ₹10,000**
- `addItem()`, `updateItem()`, `removeItem()`, `clearCart()` — all delegate to Medusa cart endpoints.

### `ToastContext.tsx`
- Simple success / error / info toast notifications with auto-dismiss.

## API client — `lib/medusa.ts`

Wraps REST calls to the Medusa backend. Uses `NEXT_PUBLIC_MEDUSA_BACKEND_URL` + `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`.

Groups:

- **products** — `list(regionId)`, `retrieve(id, regionId)` (pricing requires `region_id`)
- **carts** — `create`, `retrieve`, `update`, `addItem`, `updateItem`, `removeItem`, `complete`
- **customers** — `register`, `login`, `me`, `update`
- **regions** — `list`
- **calcula** — `getByIsin(isin)`, `getSnapshot(isin)` (→ `/store/calcula/isin/:isin[...]`)

Also exports `mapMedusaToDeal(product)` which reads `variant.calculated_price.calculated_amount` as the headline `deal.price` displayed on the deal detail page.

`lib/calcula.ts` layers Calcula-specific helpers (including `getCompanyFinancials(isin)` which calls `/store/calcula/isin/:isin` — NOTE: this endpoint requires `x-publishable-api-key` just like every other `/store/*` route; a missing header returns 400).

## Snapshot client — `lib/snapshot.ts`

Handles the three-tier cache in front of Medusa's `/store/calcula/isin/:isin/snapshot` route:

1. **Memory `Map`** keyed by `(isin, kind)` — fastest tier, holds the parsed body for 304 replies.
2. **`sessionStorage`** — same key; survives cross-page navigation within the tab.
3. **Network** — conditional GET with the previously stored ETag in `If-None-Match`. A `304` reuses the already-parsed body.

**`CACHE_TTL_MS = 0`** — every `getSnapshot()` call issues a network request and sends the ETag from the cached entry. The cache is **body storage for 304 responses**, not a time-based bypass. Previously 60s, which froze price charts for up to a minute after admin edits and was the symptom behind "updates aren't syncing" reports.

Matching server-side: Medusa's `/snapshot` route sends `Cache-Control: private, max-age=0, must-revalidate` with ETag `"<statements_version>:<price_version>"`. Browsers always revalidate; 304 responses only touch two version columns on the server.

## Price chart (PriceChart.tsx)

`storefront/src/components/product/PriceChart.tsx` renders the deal's price history. Subscribes to `getSnapshot(isin, "prices")` and derives everything else from the returned `PriceSnapshot`.

**Controls above the chart:**
- **Range buttons** — `1M` / `6M` / `1Y` / `3Y` / `5Y` / `MAX`. Windows the chart to that trailing range.
- **Custom** — opens `CustomRangePopover` with two `<input type="date">` fields clamped to the snapshot's min/max. Apply switches the range to `CUSTOM`. End date is inclusive (+24h-1ms on apply).
- **Daily / Weekly** — segmented granularity toggle. `downsample(points, granularity)` buckets by UTC day or ISO week (Mon-anchored) and keeps the last point in each bucket. Pure client-side, no network.
- **Category filter pills** — one per tag that actually has events. Click to hide/show markers by category. Only renders when the snapshot has at least one event.

**Category markers:**
- `C` = Corporate (emerald `#059669`)
- `N` = News (amber `#d97706`)
- `R` = Regulatory (rose `#e11d48`)
- Untagged legacy events = slate `#64748b` with `•` instead of a letter

Tooltip shows the coloured category badge + full label when the hovered point is an event. Filtered-out categories are excluded from both the marker and the tooltip.

ECharts is tree-shaken: only `LineChart`, `GridComponent`, `TooltipComponent`, `DataZoomComponent`, `MarkPointComponent`, `MarkLineComponent`, `AxisPointerComponent`, and `CanvasRenderer` are pulled in.

## News, events, and editorial panels

Four components on the deal detail page read from the two new snapshot kinds:

| Component | Snapshot kind | Data source |
|---|---|---|
| `NewsPanel` | `news` | `bundle.news.events` — full NewsEvent list with markdown body + filter pills |
| `EventTimeline` | `news` | Same list, rendered as a vertical chronological timeline. Defaults to 30 most recent, toggle for "Show all". |
| `ProsConsPanel` | `editorial` | `bundle.editorial.prosCons` — parses markdown bullet lists into two-column layout. Hidden entirely if the company has no pros/cons curated. |
| `CompanyOverviewPanel` | `editorial` | `bundle.editorial.overview` — renders `summary` with a minimal markdown renderer (no `react-markdown` dependency), expandable sections for business model / moat / risks. |

All four share the standard three-tier cache via `getSnapshot` — memory Map → sessionStorage → conditional GET with ETag. `NewsPanel` and `EventTimeline` both hit `kind=news`; the snapshot client deduplicates so only one network call fires. Same for the two editorial components.

## Year selector (FinancialStatements)

`FinancialStatements.tsx` exposes a **year picker** dropdown above the P&L / Balance Sheet / Cash Flow tabs:

- `availableYears` — derived from `snapshot[mode].periods[].fiscalYear`, deduped, sorted DESC.
- `selectedYears` — `Set<number> | null`. `null` means "show all", empty set means "user cleared all" (empty state).
- `projectedSelectedYears` — `useMemo` that filters the user's selection to only years present in the current view (`mode` = yearly or quarterly). If the intersection is empty, falls back to `null` ("show all") so switching between modes or companies never strands the user on an empty table.
- `visiblePeriodIndices` — indices into `group.periods` that survive the filter. Used to slice both the period headers AND each row's `values[]` array — they stay index-aligned.

The old approach used a `useEffect` that reset `selectedYears` on `isin` / `mode` change. That tripped React 19's `react-hooks/set-state-in-effect` lint and caused cascading re-renders. The derived-state pattern is both lint-clean and a UX win — switching Yearly ↔ Quarterly now preserves the year filter when both views share the same years.

## Static data

- `src/data/deals.ts` — seed/featured deal content used on the home page.

## Env vars

```
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://api...
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
```
