# Data Model & ISIN Join Key

## ISIN is the universal identifier

The **International Securities Identification Number** (12 chars, e.g. `INE0DJ201029`) is the single contract that ties the four subsystems together. There is no separate mapping table.

| Subsystem | Table / field | Role of ISIN |
|---|---|---|
| Medusa | `products.metadata.isin` | Product ↔ company link (soft invariant — linked post-create via the `calcula-fields.tsx` widget; not enforced at create time because Medusa v2 admin has no `product.create` injection zone) |
| Medusa | `company_record.isin` (unique) | Cache key for financial data pulled from Calcula |
| Calcula | `companies.isin` (unique) | Primary lookup for statements, metrics, prices |
| news_event | `companies.isin` (unique), `articles.isin`, `drhp_filings.isin` | Tag applied during scraping; used for per-company news views |
| Storefront | `product.metadata.isin` | Derived client-side, passed to `/store/calcula/isin/:isin` + news JSON |

## Medusa `company_record` — column groups

Location: `backend/src/modules/calcula/models/company-record.ts`.

| Group | Columns | Source |
|---|---|---|
| Identity | `isin` (PK-ish), `company_id`, `company_name`, `cin`, `sector`, `industry`, `description`, `listing_status` | Synced from Calcula |
| Admin-editable static (21) | `market_cap`, `valuation`, `pe_ratio`, `pb_ratio`, `roe_value`, `debt_to_equity`, `book_value`, `founded`, `headquarters`, `share_type`, `face_value`, `lot_size`, `total_shares`, `fifty_two_week_high`, `fifty_two_week_low`, `pan_number`, `rta`, `depository`, … | Edited in the admin `calcula-fields` widget |
| Cached JSON blobs | `statements_snapshot`, `price_snapshot` (daily prices + C/N/R events), `news_snapshot` (editorial NewsEvent list), `editorial_snapshot` (bundled overview + prosCons) | Pulled from Calcula |
| Versioning / freshness | `statements_version`, `price_version`, `news_version`, `editorial_version`, `content_updated_at`, `last_accessed_at` (throttled ~1/hr) | Compared against version envelopes from Calcula |

## Product metadata convention (Medusa)

Deal listings are modelled as Medusa `products`:

- `product.metadata.isin` — **soft invariant**, not enforced at create time. The stock Medusa v2 admin Create Product form cannot send custom fields (no `product.create` zone), so the middleware validator marks it optional and `workflows/hooks/validate-product-isin.ts` only seeds data when ISIN *is* provided. ISIN is linked post-create via the `calcula-fields.tsx` widget on the product details page, which PATCHes `metadata.isin` on `/admin/products/:id`. Products without ISIN are silently skipped by the sync subscribers.
- `product.metadata.sector`, etc. — convenience mirrors
- `product.variants` carry share quantities and INR prices
- Price updates on variants trigger `subscribers/calcula-price-sync.ts` → Calcula

## Customer metadata convention (Medusa)

KYC and manual investments are stored in `customers.metadata`:

- `metadata.kyc_status` — one of pending / submitted / approved / rejected
- `metadata.kyc_pan`, `metadata.kyc_aadhaar`, `metadata.kyc_dp_name`, `metadata.kyc_demat_number`
- `metadata.kyc_pan_file_url`, `metadata.kyc_cmr_file_url` — pointers into `/static`
- `metadata.manual_investments` — array of off-platform holdings surfaced on the dashboard

Validation helpers live in `backend/src/admin/lib/kyc.ts` and `backend/src/validators/kyc-validator.ts`.

## Calcula core models

| Model | Key fields |
|---|---|
| `Company` | `id`, `isin` (unique), `name`, `cin`, `sector`, `industry`, `listing_status`, `statements_version`, `price_version`, `news_version`, `editorial_version`, `content_updated_at` |
| `FinancialPeriod` | `id`, `company_id`, `fiscal_year`, `fiscal_quarter`, `period_start`, `period_end`, `is_audited` |
| `FinancialMetric` | `id`, `company_id`, `period_id`, `statement_type` (bs/pnl/cf/derived), `code`, `name`, `depth`, `order_code`, `is_calculated`, `formula`, `value`, `source` |
| `CompanyPriceHistory` | `id`, `company_id`, `datetime`, `price`, `note`, `link`, `category` (C / N / R / null) |
| `NewsEvent` | `id`, `company_id`, `occurred_at`, `category` (C / N / R), `title`, `body` (markdown), `source_url` |
| `CompanyOverview` | `id`, `company_id` (unique), `summary`, `business_model`, `competitive_moat`, `risks` — one row per company |
| `ProsCons` | `id`, `company_id` (unique), `pros`, `cons` — one row per company |
| `PlatformUser` | `id`, `username`, `password_hash`, `role` |

Versioning columns on `Company` are the authoritative freshness signal for Medusa's cache.

## news_event models

| Model | Key fields |
|---|---|
| `Company` | `isin` (unique), `name`, `slug`, `aliases` (json), `keywords` |
| `Article` | `url_hash` (unique), `title`, `url`, `isin` (indexed), `published_at`, `summary`, … |
| `DRHPFiling` | `isin` (indexed), `company`, `filed_date`, `doc_type`, `status`, `issue_size`, `link` |
| `KeywordGroup` | `name`, `query`, `category`, `enabled` |
| `ScrapeRun` | timing + per-scraper counters + error log |

## Cross-system matrix

| Concept | Medusa | Calcula | news_event |
|---|---|---|---|
| Company identity | `company_record.company_name` (cached) | `companies` (source) | `companies` (registry) |
| Sector / industry | `company_record.sector/industry` | `companies.sector/industry` | `companies.keywords` (indirect) |
| Statements | `company_record.statements_snapshot` (cache) | `FinancialPeriod` + `FinancialMetric` (source) | — |
| Prices (historic) | `company_record.price_snapshot` (cache) | `CompanyPriceHistory` (source) | `gmp_data.json` (GMP only) |
| Prices (live variant) | `product_variants.prices` (bidirectional — synced to Calcula by subscribers, and synced *from* Calcula by `variant-price-sync.ts` via the webhook/drift path) | `CompanyPriceHistory` (source + sink) | — |
| News | — | — | `articles` (source) |
| DRHP / GMP | — | — | `drhp_filings`, `gmp_data.json` |
| KYC | `customers.metadata.kyc_*` | — | — |
| Orders / cart | Medusa standard tables | — | — |
