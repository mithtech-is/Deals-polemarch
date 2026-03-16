# Polemarch Technical Documentation and Knowledge Transfer

## 1. Project Overview

### What Polemarch does

Polemarch is a full-stack marketplace for discovering and submitting purchase requests for unlisted shares and pre-IPO shares. The frontend is a custom investor-facing web app built with Next.js. The backend is a Medusa JS v2 server that provides product, cart, customer, checkout, order, and admin capabilities.

The repository implements a transaction-request workflow rather than an online instant-settlement exchange:

1. Investors browse deals sourced from Medusa products.
2. Investors register and log in as Medusa customers.
3. Investors complete KYC by uploading PAN and CMR documents.
4. Investors add share quantities to a cart.
5. Investors go through a checkout flow that shows manual bank transfer instructions.
6. The cart is still completed through Medusa using the manual payment provider.
7. An order record is created in Medusa.
8. The success page asks the investor to continue the transaction on WhatsApp with the Polemarch team.

### Target users

- Investors looking to buy unlisted shares or pre-IPO allocations
- Internal operations/compliance users reviewing KYC submissions
- Admin users accessing the Medusa Admin dashboard enabled by the backend

### Implemented product features

- Deal marketplace backed by Medusa products
- Featured deals on the homepage
- Deal detail pages with pricing and financial metadata
- Investor registration and login
- Persistent cart backed by Medusa carts
- Checkout flow using Medusa manual payment
- Investor dashboard with recent orders
- KYC submission with document upload
- Admin KYC review page
- Manual investment tracking stored in customer metadata
- Static knowledge hub and legal/informational pages

### Important scope notes

- There are no custom Medusa modules, workflows, or migrations in this repository.
- KYC and manual holdings are stored in `customer.metadata`.
- The contact form, newsletter form, and forgot-password flow are UI-only in this codebase.
- The upload endpoint stores files on the backend filesystem under `backend/static`.

## 2. System Architecture

### High-level architecture

```text
Next.js App Router frontend
  |
  | HTTP fetch (Store API, Auth API, custom Admin/KYC endpoints)
  v
Medusa JS v2 backend
  |
  | Core Medusa modules/services
  v
PostgreSQL

Supplementary runtime pieces
- Medusa Admin dashboard enabled on backend
- Manual payment provider configured in Medusa
- File uploads written to backend/static
- Redis referenced in Render deployment config
```

### Frontend architecture

The frontend lives in `storefront/src` and uses the App Router:

- `src/app`: route-level pages
- `src/components`: reusable UI
- `src/context`: client-side global state
- `src/lib/medusa.ts`: API client wrapper for all backend calls
- `src/data`: static content for knowledge hub and homepage helper content

State management is simple React context plus local component state:

- `UserContext` manages session state and current customer
- `CartContext` manages cart ID, cart items, totals, and cart mutations
- `ToastContext` manages temporary toast messages

There is no Redux, Zustand, TanStack Query, or server action layer in this repository.

### Backend architecture

The backend is mostly standard Medusa with a few customizations:

- Medusa config in `backend/medusa-config.ts`
- Manual payment provider configured as `pp_system_default`
- Custom middleware in `backend/src/api/middlewares.ts`
- Custom APIs:
  - `POST /store/upload`
  - `GET /admin/kyc`
  - `POST /admin/kyc/:id/verify`
  - `POST /admin/kyc/:id/reject`

There are no custom services, repositories, subscribers, jobs, or modules in `backend/src`.

### Database architecture

The repository does not define custom SQL schema or migrations. The application relies on Medusa-managed persistence in PostgreSQL.

At the application level, the code clearly uses these Medusa domains:

- customers
- products
- product variants
- regions
- carts
- cart line items
- shipping options / shipping methods
- payment collections
- payment sessions
- orders

Custom business data is stored in customer metadata:

- KYC fields
- manual investment holdings

### Authentication flow architecture

```text
Register:
Frontend -> POST /auth/customer/emailpass/register
         -> receives auth token
         -> POST /store/customers with Bearer token
         -> customer created

Login:
Frontend -> POST /auth/customer/emailpass
         -> receives token
         -> token stored in localStorage as medusa_auth_token
         -> frontend calls /store/customers/me

Authenticated requests:
Frontend adds Authorization: Bearer <token>
         -> Medusa Store/Auth/Admin endpoints
```

### Order processing flow architecture

```text
Deal page
  -> add variant to Medusa cart
Cart page
  -> adjust line items
Checkout page
  -> update cart email
  -> fetch shipping options
  -> attach first shipping option if any
  -> create payment collection
  -> initialize manual payment session (pp_system_default)
  -> complete cart
  -> Medusa creates order
Success page
  -> user is sent to WhatsApp handoff
Dashboard
  -> fetches customer orders from /store/orders
```

### Request flow and API communication

- All frontend API communication is centralized in [`medusa.ts`](/D:/Users/KillerKoli/Desktop/Deals%20Polemarch/storefront/src/lib/medusa.ts).
- Most requests use `credentials: "include"`.
- Publishable-key-based requests send `x-publishable-api-key`.
- Authenticated requests also send `Authorization: Bearer <token>`.
- Product pages use server-side fetching in App Router pages for initial marketplace rendering.
- Cart, checkout, dashboard, and KYC flows are client-side.

## 3. Technology Stack

### Frontend

| Technology | Version | Source |
| --- | --- | --- |
| Next.js | 16.1.6 | `storefront/package-lock.json` |
| React | 19.2.3 | `storefront/package-lock.json` |
| React DOM | 19.2.3 | `storefront/package-lock.json` |
| TypeScript | `^5` | `storefront/package.json` |
| Tailwind CSS | 4.2.1 | `storefront/package-lock.json` |
| `@tailwindcss/postcss` | `^4` | `storefront/package.json` |
| Lucide React | 0.577.0 | `storefront/package-lock.json` |
| ESLint | `^9` | `storefront/package.json` |

### Backend

| Technology | Version | Source |
| --- | --- | --- |
| Medusa Framework | 2.13.3 | `backend/package-lock.json` |
| Medusa core package | 2.13.3 | `backend/package-lock.json` |
| Medusa Dashboard | 2.13.3 | `backend/package-lock.json` |
| Medusa Admin SDK | 2.13.3 | `backend/package-lock.json` |
| PostgreSQL driver (`pg`) | 8.20.0 | `backend/package-lock.json` |
| TypeScript | `^5.3.3` | `backend/package.json` |
| Node target in deployment | 20.11.1 | `backend/render.yaml` |

### Infrastructure and runtime

| Item | Evidence in repo |
| --- | --- |
| PostgreSQL | `DATABASE_URL` in backend config |
| Redis | `REDIS_URL` in `backend/render.yaml` |
| Render deployment | `backend/render.yaml` |
| Local file storage for uploads | `backend/src/api/store/upload/route.ts` |
| Medusa Admin enabled | `admin.disable: false` in `backend/medusa-config.ts` |

## 4. Project Directory Structure

### Repository root

```text
.
├─ backend/                 Medusa backend app
├─ storefront/              Next.js frontend app
├─ tmp/                     Misc workspace content
├─ website summary/         Misc workspace content
├─ PROJECT_OVERVIEW.md      Existing project note
└─ POLEMARCH_TECHNICAL_DOCUMENTATION.md
```

### Backend structure

```text
backend/
├─ src/
│  ├─ api/
│  │  ├─ admin/kyc/         Custom admin KYC endpoints
│  │  ├─ store/upload/      Custom upload endpoint
│  │  └─ middlewares.ts     Multer upload middleware + static file serving
│  └─ index.ts              Backend source entry point placeholder
├─ static/                  Uploaded KYC files at runtime
├─ medusa-config.ts         Medusa and module configuration
├─ package.json             Backend dependencies and scripts
├─ render.yaml              Render deployment config
├─ create-db.js             Local helper to create PostgreSQL DB
├─ test-db.js               Local helper to test DB connectivity
└─ .env / .env.template     Environment variables
```

#### Backend folder purpose

- `src/api`: all custom backend code in this repository
- `src/api/middlewares.ts`: disables body parsing for uploads and wires Multer
- `src/api/admin/kyc`: review and status update APIs for customer KYC metadata
- `src/api/store/upload`: receives uploaded documents and saves them on disk
- `static`: document files served back via `/static/*`

### Storefront structure

```text
storefront/
├─ src/
│  ├─ app/                  Next.js App Router pages
│  ├─ components/           Reusable UI components
│  ├─ context/              Cart, user, and toast state
│  ├─ data/                 Static content
│  └─ lib/                  Medusa client and metadata utilities
├─ public/                  Public assets
├─ package.json             Frontend dependencies and scripts
├─ next.config.ts           Image host config
├─ postcss.config.mjs       PostCSS config
├─ tsconfig.json            TS config
└─ .env.local               Frontend env vars
```

#### Key App Router pages

- `/`: homepage
- `/deals`: marketplace
- `/deals/[id]`: deal detail
- `/cart`: cart
- `/checkout`: checkout
- `/login`: login
- `/register`: registration
- `/dashboard`: investor dashboard
- `/dashboard/kyc`: KYC submission
- `/admin/kyc`: internal KYC review UI
- `/knowledge`: static knowledge hub
- `/about`, `/contact`, `/privacy`, `/terms`, `/disclaimer`: informational/legal pages

### Important frontend files

- [`medusa.ts`](/D:/Users/KillerKoli/Desktop/Deals%20Polemarch/storefront/src/lib/medusa.ts): all API calls and Medusa-to-Deal mapping
- [`CartContext.tsx`](/D:/Users/KillerKoli/Desktop/Deals%20Polemarch/storefront/src/context/CartContext.tsx): cart lifecycle and local cart ID persistence
- [`UserContext.tsx`](/D:/Users/KillerKoli/Desktop/Deals%20Polemarch/storefront/src/context/UserContext.tsx): customer session management
- [`dashboard/page.tsx`](/D:/Users/KillerKoli/Desktop/Deals%20Polemarch/storefront/src/app/dashboard/page.tsx): dashboard, manual holdings, recent orders
- [`dashboard/kyc/page.tsx`](/D:/Users/KillerKoli/Desktop/Deals%20Polemarch/storefront/src/app/dashboard/kyc/page.tsx): full KYC workflow
- [`checkout/page.tsx`](/D:/Users/KillerKoli/Desktop/Deals%20Polemarch/storefront/src/app/checkout/page.tsx): manual-transfer checkout logic

## 5. Feature Breakdown

### Deal marketplace

**Purpose**

Expose Medusa products as investable deals.

**Files involved**

- `storefront/src/app/deals/page.tsx`
- `storefront/src/components/deals/MarketplaceClient.tsx`
- `storefront/src/components/deals/DealFilters.tsx`
- `storefront/src/components/home/DealCard.tsx`
- `storefront/src/lib/medusa.ts`

**Data flow**

1. Frontend fetches `/store/regions`.
2. Frontend fetches `/store/products` with `region_id` and a `fields` projection.
3. `mapMedusaToDeal` converts product data into the UI deal shape.
4. Client-side filters apply search, sector, and sort logic.

**APIs used**

- `GET /store/regions`
- `GET /store/products`

### Deal detail

**Purpose**

Show detailed info for a single deal and let the user add quantity to cart.

**Files involved**

- `storefront/src/app/deals/[id]/page.tsx`
- `storefront/src/components/product/FinancialsTable.tsx`

**Data flow**

1. Fetch region list.
2. Fetch one product from `/store/products/:id`.
3. Map product metadata into a detail view.
4. If user is not logged in, redirect to `/login?redirect=/deals/:id`.
5. Add the first variant to cart using selected quantity.

**APIs used**

- `GET /store/regions`
- `GET /store/products/:id`
- `POST /store/carts/:id/line-items`

### Cart system

**Purpose**

Persist a Medusa cart between sessions and manage share quantities.

**Files involved**

- `storefront/src/context/CartContext.tsx`
- `storefront/src/app/cart/page.tsx`

**Data flow**

1. Cart ID is stored in `localStorage` as `medusa_cart_id`.
2. On startup the app fetches regions and attempts to retrieve the existing cart.
3. If no cart exists, a new cart is created lazily when the first item is added.
4. Cart state is refreshed from Medusa after add/update/delete operations.

**APIs used**

- `GET /store/regions`
- `POST /store/carts`
- `GET /store/carts/:id`
- `POST /store/carts/:id/line-items`
- `POST /store/carts/:id/line-items/:line_item_id`
- `DELETE /store/carts/:id/line-items/:line_item_id`

### Checkout flow

**Purpose**

Turn the Medusa cart into an order while instructing the user to make a manual bank transfer.

**Files involved**

- `storefront/src/app/checkout/page.tsx`
- `storefront/src/lib/medusa.ts`
- `backend/medusa-config.ts`

**Data flow**

1. User must be logged in.
2. Checkout updates the cart email.
3. It fetches shipping options and automatically adds the first one if present.
4. It creates a payment collection.
5. It initializes a payment session using provider `pp_system_default`.
6. It completes the cart.
7. On success, the frontend displays the order summary and a WhatsApp CTA.

**APIs used**

- `POST /store/carts/:id`
- `GET /store/shipping-options?cart_id=...`
- `POST /store/carts/:id/shipping-methods`
- `POST /store/payment-collections`
- `POST /store/payment-collections/:id/payment-sessions`
- `POST /store/carts/:id/complete`

### Order placement and tracking

**Purpose**

Store completed orders in Medusa and show them in the investor dashboard.

**Files involved**

- `storefront/src/app/checkout/page.tsx`
- `storefront/src/app/dashboard/page.tsx`

**Data flow**

1. Completed checkout returns Medusa order data.
2. Dashboard fetches `/store/orders`.
3. Dashboard derives a user-facing status label from Medusa order fields:
   - canceled -> `Cancelled`
   - fulfillment_status `fulfilled` -> `Shares Delivered`
   - payment_status `captured` -> `Payment Confirmed`
   - otherwise -> `Order Received`

**APIs used**

- `POST /store/carts/:id/complete`
- `GET /store/orders`

### Investor authentication

**Purpose**

Create customers, authenticate them, and fetch the current profile.

**Files involved**

- `storefront/src/app/login/page.tsx`
- `storefront/src/app/register/page.tsx`
- `storefront/src/context/UserContext.tsx`
- `storefront/src/lib/medusa.ts`

**Data flow**

1. Registration uses Medusa's two-step auth flow.
2. Login stores a customer token in `localStorage`.
3. The app fetches `/store/customers/me` to resolve the logged-in customer.

**APIs used**

- `POST /auth/customer/emailpass/register`
- `POST /store/customers`
- `POST /auth/customer/emailpass`
- `GET /store/customers/me`
- `POST /store/customers/me`
- `DELETE /auth/logout`
- `GET /auth/session`

### KYC system

**Purpose**

Collect PAN, Aadhaar, Demat, DP, and document uploads for compliance review.

**Files involved**

- `storefront/src/app/dashboard/kyc/page.tsx`
- `backend/src/api/store/upload/route.ts`
- `backend/src/api/middlewares.ts`
- `backend/src/api/admin/kyc/...`
- `storefront/src/app/admin/kyc/page.tsx`

**Data flow**

1. User fills KYC form.
2. PAN and CMR files are uploaded to `POST /store/upload`.
3. Upload endpoint writes the files to `backend/static`.
4. Form submission updates `customer.metadata` with KYC fields and `kyc_status: submitted`.
5. Admin page fetches pending/submitted KYC customers.
6. Admin verifies or rejects by updating customer metadata.

**APIs used**

- `POST /store/upload`
- `POST /store/customers/me`
- `GET /admin/kyc`
- `POST /admin/kyc/:id/verify`
- `POST /admin/kyc/:id/reject`

### Manual investment tracking

**Purpose**

Let investors record holdings purchased outside Polemarch.

**Files involved**

- `storefront/src/app/dashboard/page.tsx`

**Data flow**

1. Dashboard reads `user.metadata.manual_investments`.
2. Add/delete operations update `customer.metadata` through `/store/customers/me`.
3. Portfolio totals combine manual holding amounts plus Medusa order totals.

**APIs used**

- `POST /store/customers/me`
- `GET /store/customers/me`
- `GET /store/orders`

### Knowledge hub and content pages

**Purpose**

Provide static educational, legal, and marketing content.

**Files involved**

- `storefront/src/app/knowledge/...`
- `storefront/src/data/knowledge.ts`
- `storefront/src/app/about/page.tsx`
- `storefront/src/app/contact/page.tsx`
- `storefront/src/app/privacy/page.tsx`
- `storefront/src/app/terms/page.tsx`
- `storefront/src/app/disclaimer/page.tsx`

**Notes**

- All knowledge content is static in the repo.
- No CMS or backend API is used for content.

## 6. Complete API Documentation

This section lists every API endpoint explicitly referenced or implemented in the repository.

### API conventions used by the frontend

**Base URL**

- `NEXT_PUBLIC_MEDUSA_BACKEND_URL`
- Defaults to `http://localhost:9000`

**Common headers**

```http
Content-Type: application/json
x-publishable-api-key: <NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY>
```

**Authenticated headers**

```http
Authorization: Bearer <medusa_auth_token>
```

**Credentials**

- The frontend sends `credentials: include` on nearly all requests.

---

### 6.1 Product and region APIs

#### GET `/store/regions`

**Purpose**

Fetch available Medusa regions. The frontend uses the first region for product pricing context and cart creation.

**Authentication**

Not required in code.

**Request body**

None.

**Response shape consumed by frontend**

```json
{
  "regions": [
    {
      "id": "reg_123",
      "name": "Default Region"
    }
  ]
}
```

#### GET `/store/products`

**Purpose**

Fetch marketplace products/deals.

**Authentication**

Not required in code.

**Query parameters used**

- `region_id`: first region ID from `/store/regions`
- `fields`: exact projection defined in `medusa.ts`

**Fields requested**

```text
id,handle,title,subtitle,description,thumbnail,metadata,
variants.id,variants.title,variants.sku,variants.inventory_quantity,
variants.prices,variants.calculated_price
```

**Response shape consumed by frontend**

```json
{
  "products": [
    {
      "id": "prod_123",
      "handle": "company-name",
      "title": "Company Name",
      "subtitle": "FinTech",
      "description": "Short summary",
      "thumbnail": "https://...",
      "metadata": {
        "isin": "INE000000000",
        "min_investment": "10",
        "is_trending": true,
        "financials": []
      },
      "variants": [
        {
          "id": "variant_123",
          "inventory_quantity": 1000,
          "prices": [],
          "calculated_price": {
            "calculated_amount": 1500
          }
        }
      ]
    }
  ]
}
```

#### GET `/store/products/:id`

**Purpose**

Fetch one product/deal.

**Authentication**

Not required in code.

**Query parameters used**

- `region_id`
- `fields` with the same projection as the list call

**Response shape consumed by frontend**

```json
{
  "product": {
    "id": "prod_123",
    "title": "Company Name",
    "metadata": {},
    "variants": []
  }
}
```

---

### 6.2 Cart APIs

#### POST `/store/carts`

**Purpose**

Create a cart for a region.

**Authentication**

Not required in code.

**Request body**

```json
{
  "region_id": "reg_123"
}
```

**Response shape consumed by frontend**

```json
{
  "cart": {
    "id": "cart_123",
    "region_id": "reg_123"
  }
}
```

#### GET `/store/carts/:id`

**Purpose**

Retrieve the current cart and line items.

**Authentication**

Not required in code.

**Response shape consumed by frontend**

```json
{
  "cart": {
    "id": "cart_123",
    "items": [
      {
        "id": "item_123",
        "variant_id": "variant_123",
        "title": "Company Name",
        "unit_price": 1500,
        "quantity": 10,
        "thumbnail": "https://...",
        "metadata": {
          "min_investment": 10
        }
      }
    ]
  }
}
```

#### POST `/store/carts/:id/line-items`

**Purpose**

Add a deal variant to the cart.

**Authentication**

Not required in code.

**Request body**

```json
{
  "variant_id": "variant_123",
  "quantity": 10,
  "metadata": {
    "min_investment": 10
  }
}
```

**Response**

The code expects the standard Medusa cart mutation response, typically containing `cart`.

#### POST `/store/carts/:id/line-items/:line_item_id`

**Purpose**

Update quantity for a line item.

**Authentication**

Not required in code.

**Request body**

```json
{
  "quantity": 20
}
```

#### DELETE `/store/carts/:id/line-items/:line_item_id`

**Purpose**

Remove a line item from the cart.

**Authentication**

Not required in code.

#### POST `/store/carts/:id`

**Purpose**

Update cart fields. In this repo it is used during checkout to set the customer email.

**Authentication**

Not required in code.

**Request body used**

```json
{
  "email": "investor@example.com"
}
```

---

### 6.3 Checkout, shipping, and payment APIs

#### POST `/store/carts/:id/payment-sessions`

**Purpose**

Defined in the client wrapper but not called by the current checkout page.

**Authentication**

Not required in code.

#### POST `/store/payment-collections`

**Purpose**

Create a payment collection for a cart in the Medusa v2 checkout flow.

**Authentication**

Not required in code.

**Request body**

```json
{
  "cart_id": "cart_123"
}
```

**Response shape consumed by frontend**

```json
{
  "payment_collection": {
    "id": "paycol_123"
  }
}
```

#### POST `/store/payment-collections/:id/payment-sessions`

**Purpose**

Initialize a payment session for the payment collection.

**Authentication**

Not required in code.

**Request body**

```json
{
  "provider_id": "pp_system_default"
}
```

#### POST `/store/carts/:id/payment-sessions/:provider_id`

**Purpose**

Defined in the client wrapper as a payment-session selection API, but not called by the current checkout implementation.

**Authentication**

Not required in code.

#### GET `/store/shipping-options?cart_id=:cartId`

**Purpose**

Fetch shipping options for the cart. Checkout auto-selects the first one if any exist.

**Authentication**

Not required in code.

**Response shape consumed by frontend**

```json
{
  "shipping_options": [
    {
      "id": "so_123",
      "name": "Default shipping"
    }
  ]
}
```

#### POST `/store/carts/:id/shipping-methods`

**Purpose**

Attach a shipping method to the cart before completion.

**Authentication**

Not required in code.

**Request body**

```json
{
  "option_id": "so_123"
}
```

#### POST `/store/carts/:id/complete`

**Purpose**

Complete the cart and create an order.

**Authentication**

Not required in code.

**Response shape expected by frontend**

```json
{
  "type": "order",
  "order": {
    "id": "order_123",
    "display_id": 1001,
    "total": 15000,
    "items": [
      {
        "title": "Company Name",
        "quantity": 10
      }
    ]
  }
}
```

The code also accepts `result.data` if `result.order` is missing.

---

### 6.4 Order APIs

#### GET `/store/orders`

**Purpose**

Fetch the current authenticated customer's orders for the dashboard.

**Authentication**

Required in this app. The frontend sends `Authorization: Bearer <medusa_auth_token>`.

**Response shape consumed by frontend**

```json
{
  "orders": [
    {
      "id": "order_123",
      "display_id": 1001,
      "created_at": "2026-03-12T10:00:00.000Z",
      "total": 15000,
      "payment_status": "captured",
      "fulfillment_status": "fulfilled",
      "canceled_at": null,
      "items": [
        {
          "title": "Company Name",
          "quantity": 10,
          "thumbnail": "https://..."
        }
      ]
    }
  ]
}
```

---

### 6.5 Customer auth and customer profile APIs

#### POST `/auth/customer/emailpass/register`

**Purpose**

Create an auth identity for a new customer.

**Authentication**

Not required.

**Request body**

```json
{
  "email": "investor@example.com",
  "password": "strong-password"
}
```

**Response shape consumed by frontend**

```json
{
  "token": "jwt-or-auth-token"
}
```

#### POST `/store/customers`

**Purpose**

Create the Medusa customer after auth registration.

**Authentication**

Required in this flow using the token returned by `/auth/customer/emailpass/register`.

**Request body**

```json
{
  "email": "investor@example.com",
  "first_name": "Jane",
  "last_name": "Doe"
}
```

**Response**

The code expects the standard Medusa customer creation response.

#### POST `/auth/customer/emailpass`

**Purpose**

Authenticate an investor.

**Authentication**

Not required.

**Request body**

```json
{
  "email": "investor@example.com",
  "password": "strong-password"
}
```

**Response shape consumed by frontend**

```json
{
  "token": "jwt-or-auth-token"
}
```

#### DELETE `/auth/logout`

**Purpose**

Log out from Medusa auth session.

**Authentication**

The frontend calls it after removing the local token.

#### GET `/auth/session`

**Purpose**

Defined in the client wrapper for session checks, but the active app logic primarily uses `/store/customers/me`.

**Authentication**

Bearer token is attached if present.

#### GET `/store/customers/me`

**Purpose**

Retrieve the authenticated customer profile.

**Authentication**

Required.

**Response shape consumed by frontend**

```json
{
  "customer": {
    "id": "cus_123",
    "email": "investor@example.com",
    "first_name": "Jane",
    "last_name": "Doe",
    "metadata": {
      "kyc_status": "pending",
      "manual_investments": []
    }
  }
}
```

#### POST `/store/customers/me`

**Purpose**

Update the authenticated customer profile and metadata.

**Authentication**

Required.

**Request bodies used in this repo**

KYC submission:

```json
{
  "metadata": {
    "kyc_status": "submitted",
    "pan_number": "ABCDE1234F",
    "aadhaar_number": "123456789012",
    "dp_name": "Zerodha",
    "demat_number": "1234567812345678",
    "pan_file_url": "http://localhost:9000/static/jane_doe_pan_card.pdf",
    "cmr_file_url": "http://localhost:9000/static/jane_doe_cmr_copy.pdf",
    "kyc_submitted_at": 1710000000000
  },
  "first_name": "Jane",
  "last_name": "Doe"
}
```

Manual holdings update:

```json
{
  "metadata": {
    "manual_investments": [
      {
        "id": "1710000000000",
        "companyName": "Swiggy",
        "amount": "50000",
        "platform": "Other platform",
        "isin": "INE000000000",
        "date": "2026-03-12T10:00:00.000Z"
      }
    ]
  }
}
```

---

### 6.6 Custom backend APIs

#### POST `/store/upload`

**Purpose**

Upload KYC documents and store them on disk under `backend/static`.

**Implementation**

- Middleware: `multer.memoryStorage()`
- Route handler: writes file buffer to `static/<sanitized_username>_<docType>.<ext>`

**Authentication**

Not enforced in code.

**Request content type**

`multipart/form-data`

**Fields**

- `file`: uploaded file
- `userName`: used to generate the saved filename
- `docType`: expected values in UI are `pan_card` and `cmr_copy`

**Response**

```json
{
  "url": "http://localhost:9000/static/jane_doe_pan_card.pdf"
}
```

**Error response**

```json
{
  "message": "No file uploaded. Please ensure you are sending a file with the field name 'file'."
}
```

#### GET `/admin/kyc`

**Purpose**

Fetch customers whose `metadata.kyc_status` is `submitted` or `pending`.

**Authentication**

No backend auth enforcement is implemented in the route itself.

**Response**

```json
{
  "customers": [
    {
      "id": "cus_123",
      "email": "investor@example.com",
      "first_name": "Jane",
      "last_name": "Doe",
      "metadata": {
        "kyc_status": "submitted",
        "pan_number": "ABCDE1234F",
        "aadhaar_number": "123456789012",
        "dp_name": "Zerodha",
        "demat_number": "1234567812345678",
        "pan_file_url": "http://localhost:9000/static/...",
        "cmr_file_url": "http://localhost:9000/static/..."
      },
      "created_at": "2026-03-12T10:00:00.000Z"
    }
  ]
}
```

#### POST `/admin/kyc/:id/verify`

**Purpose**

Mark a customer's KYC as verified.

**Authentication**

No backend auth enforcement is implemented in the route itself.

**Request body**

None.

**Effect**

Updates customer metadata:

```json
{
  "kyc_status": "verified",
  "verified_at": "2026-03-12T10:00:00.000Z"
}
```

**Response**

```json
{
  "message": "KYC Verified successfully"
}
```

#### POST `/admin/kyc/:id/reject`

**Purpose**

Reject or reset a KYC submission.

**Authentication**

No backend auth enforcement is implemented in the route itself.

**Request body**

```json
{
  "reason": "Documents unclear"
}
```

**Effect**

Updates customer metadata:

```json
{
  "kyc_status": "pending",
  "kyc_rejection_reason": "Documents unclear",
  "rejected_at": "2026-03-12T10:00:00.000Z"
}
```

**Response**

```json
{
  "message": "KYC Rejected successfully"
}
```

### APIs present in client wrapper but not currently used by pages

- `POST /store/carts/:id/payment-sessions`
- `POST /store/carts/:id/payment-sessions/:provider_id`
- `GET /auth/session`

These are available in `medusa.ts` but are not part of the current rendered flow.

## 7. Order System Flow

### End-to-end order flow

1. Product data is loaded from Medusa products.
2. The investor adds a product variant to the cart.
3. The cart is stored in Medusa and locally referenced by `medusa_cart_id`.
4. Checkout updates the cart email to match the logged-in customer.
5. Checkout optionally attaches the first shipping method returned by Medusa.
6. A payment collection is created.
7. A manual payment session is initialized using provider `pp_system_default`.
8. The cart is completed.
9. Medusa returns an order.
10. The frontend clears the local cart and shows a success page with a WhatsApp handoff.

### Medusa statuses used by the dashboard

The dashboard maps backend order data to business-friendly labels:

| Backend condition | Dashboard label |
| --- | --- |
| `canceled_at` is set | `Cancelled` |
| `fulfillment_status === "fulfilled"` | `Shares Delivered` |
| `payment_status === "captured"` | `Payment Confirmed` |
| anything else | `Order Received` |

### Notes on payment behavior

- The UI presents manual bank transfer instructions.
- The backend is configured only with Medusa's manual payment provider.
- There is no real-time payment gateway integration in this repository.
- Order completion is initiated from the frontend after the user clicks `Confirm Transfer Made`.

### Notes on shipping behavior

- Shipping is required by the code path if Medusa returns shipping options.
- The code auto-selects the first returned shipping option.
- The repository does not contain shipping setup code, so shipping options must already exist in Medusa data.

## 8. Authentication Flow

### Registration

The app uses Medusa v2's two-step customer registration:

1. `POST /auth/customer/emailpass/register`
2. Receive a registration token
3. `POST /store/customers` with `Authorization: Bearer <token>`

This is implemented in [`medusa.ts`](/D:/Users/KillerKoli/Desktop/Deals%20Polemarch/storefront/src/lib/medusa.ts).

### Login

1. `POST /auth/customer/emailpass`
2. Receive `token`
3. Store token in browser `localStorage` under `medusa_auth_token`
4. Fetch current customer through `GET /store/customers/me`

### Token storage

- Storage location: browser `localStorage`
- Key: `medusa_auth_token`

### Authenticated requests

Authenticated frontend requests add:

```http
Authorization: Bearer <medusa_auth_token>
```

This is used for:

- `/store/orders`
- `/store/customers/me`
- `/auth/session`
- customer updates

### Current session strategy

The app does not rely purely on Medusa cookies. It explicitly stores and reuses the bearer token in the browser.

### Logout behavior

`logout()` in `UserContext` removes the local token and clears user state. It does not call `medusaClient.auth.logout()` from the dashboard logout button, so the browser-side state is cleared even if server-side logout is not triggered.

## 9. Database Structure

### Important note

The repository contains no custom migrations, schema definitions, or models. The database structure is therefore primarily Medusa-managed. The following entity relationships are not guessed from business ideas; they are directly implied by the APIs the code reads and writes.

### Core Medusa entities used

| Entity / table concept | Used for | Evidence in code |
| --- | --- | --- |
| customers | investor accounts | `/store/customers`, `/store/customers/me` |
| products | marketplace deals | `/store/products` |
| product variants | purchasable share SKU/unit | `product.variants[0]` used for cart adds |
| regions | pricing and cart creation context | `/store/regions` |
| carts | shopping cart | `/store/carts` |
| line items | selected deal quantities | `/store/carts/:id/line-items` |
| shipping options | checkout prerequisite | `/store/shipping-options` |
| shipping methods | attached during checkout | `/store/carts/:id/shipping-methods` |
| payment collections | v2 payment flow | `/store/payment-collections` |
| payment sessions | manual provider session | payment session initialization |
| orders | completed investment requests | `/store/orders`, `/store/carts/:id/complete` |

### Relationship model used by the app

```text
customer
  -> orders
  -> metadata (kyc fields, manual_investments)

product
  -> variants
  -> metadata (isin, min_investment, long_description, financials, trending flag)

cart
  -> line_items
  -> region
  -> shipping methods
  -> payment collection / sessions

order
  -> items
  -> customer
```

### Customer metadata fields introduced by this app

KYC fields:

- `kyc_status`
- `pan_number`
- `aadhaar_number`
- `dp_name`
- `demat_number`
- `pan_file_url`
- `cmr_file_url`
- `kyc_submitted_at`
- `verified_at`
- `rejected_at`
- `kyc_rejection_reason`

Manual portfolio fields:

- `manual_investments`: array of custom holding objects

### Product metadata fields consumed by the frontend

- `isin`
- `min_investment`
- `price` (fallback only)
- `long_description`
- `is_trending`
- `financials`

## 10. Environment Variables

### Backend env vars

| Variable | Used in code | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string for Medusa |
| `JWT_SECRET` | Yes | JWT secret for Medusa auth |
| `COOKIE_SECRET` | Yes | Cookie signing secret |
| `STORE_CORS` | Yes | CORS origins for store endpoints |
| `ADMIN_CORS` | Yes | CORS origins for admin endpoints |
| `AUTH_CORS` | Yes | CORS origins for auth endpoints |
| `DB_NAME` | Helper scripts / template | Local DB naming helper |
| `BACKEND_URL` | Present in `.env` | Not referenced in source code inspected |
| `MEDUSA_BACKEND_URL` | Present in `.env` | Not referenced in backend source code inspected |
| `REDIS_URL` | Render config only | Redis service connection on Render |
| `NODE_VERSION` | Render config only | Node runtime version for deployment |

### Frontend env vars

| Variable | Used in code | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | Yes | Base URL for all frontend API requests |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Yes | Publishable API key sent as `x-publishable-api-key` |

### Default/fallback behavior

- Backend URL fallback in frontend: `http://localhost:9000`
- Several backend CORS and secret values have development fallbacks in `medusa-config.ts`

### Example local setup

Backend:

```env
DATABASE_URL=postgres://user:password@localhost:5432/medusa_polemarch
JWT_SECRET=replace-me
COOKIE_SECRET=replace-me
STORE_CORS=http://localhost:3001,http://localhost:9000
ADMIN_CORS=http://localhost:3001,http://localhost:7001
AUTH_CORS=http://localhost:3001,http://localhost:7001
```

Frontend:

```env
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
```

## 11. Common Errors and Fixes

### 1. Orders fail to load in dashboard

**Why it happens**

- `/store/orders` requires a bearer token.
- If `medusa_auth_token` is missing or stale, the dashboard request fails.

**Evidence**

- `medusaClient.orders.list()` attaches `Authorization` and logs error text on failure.

**Fix**

- Log in again to refresh the token.
- Ensure `medusa_auth_token` exists in localStorage.
- Verify backend auth/CORS settings allow the storefront origin.

### 2. KYC upload returns "No file uploaded"

**Why it happens**

- The backend expects a multipart field named exactly `file`.
- The upload middleware is custom and body parsing is disabled for this route.

**Fix**

- Send `FormData` with `file`, `userName`, and `docType`.
- Do not manually set `Content-Type` for multipart uploads in the browser.

### 3. Uploaded files may become inaccessible in production

**Why it happens**

- Files are written to local disk under `backend/static`.
- Ephemeral filesystem deployments can lose those files on redeploy or restart.

**Fix**

- Move uploads to durable object storage such as S3-compatible storage.
- Store only URLs in customer metadata.

### 4. Admin KYC routes are not truly protected

**Why it happens**

- The custom admin KYC routes do not enforce Medusa admin auth in code.
- The frontend admin page only has a commented-out client-side email check.

**Fix**

- Add backend authorization middleware/guards.
- Restrict routes to authenticated admin users.

### 5. Checkout may fail if no shipping option is configured

**Why it happens**

- The code tries to fetch shipping options before completion.
- If a Medusa setup expects shipping but none exist, checkout may be blocked upstream.

**Fix**

- Configure at least one valid shipping option in Medusa.
- Or simplify checkout logic if shipping is not meaningful for this business flow.

### 6. Forgot-password page does not actually reset passwords

**Why it happens**

- The page is intentionally mocked with `setTimeout`.
- There is no Medusa email provider integration in the code.

**Fix**

- Implement real password reset APIs and email provider configuration.

### 7. Logout does not invalidate backend auth session from dashboard

**Why it happens**

- Dashboard logout clears local state only.
- It does not call `medusaClient.auth.logout()`.

**Fix**

- Invoke the logout API before redirecting.

### 8. Manual payment completion is trust-based

**Why it happens**

- The user clicks `Confirm Transfer Made` and the app completes the cart immediately.
- No bank reconciliation or proof-of-payment verification exists in code.

**Fix**

- Add an internal payment verification state before order completion.
- Or complete the order only after back-office confirmation.

### 9. Backend build/runtime may fail if `multer` is not installed directly

**Why it happens**

- `backend/src/api/middlewares.ts` imports `multer`.
- `multer` is not declared in `backend/package.json`.

**Fix**

- Add `multer` as a direct backend dependency.

## 12. Performance Improvements

### Implement durable file storage

The upload system uses local disk writes. Object storage would improve reliability and reduce backend filesystem dependence.

### Reduce repeated region fetches

Marketplace and detail pages fetch regions before product calls. Region IDs could be cached or configured once.

### Add server-side data caching strategy

- Product pages already use `next: { revalidate: 60 }`.
- Region list and some read-heavy data can also be cached more deliberately.
- Customer, cart, and order routes should remain `no-store`.

### Avoid loading all KYC customers via full customer list

`GET /admin/kyc` loads customers then filters in application code. If the customer table grows, this will become inefficient. A more targeted query or indexed metadata strategy would scale better.

### Add pagination

The code currently assumes small result sets:

- marketplace products
- admin KYC customers
- customer orders

### Optimize dashboard refresh behavior

The dashboard recalculates and refetches after customer metadata updates. A more granular optimistic update pattern would reduce redundant calls.

## 13. Security Considerations

### Bearer token stored in localStorage

Risk:

- Tokens in localStorage are vulnerable to XSS.

Recommendation:

- Prefer secure HTTP-only cookies for session handling where possible.
- Harden CSP and input sanitization if localStorage must remain.

### Admin KYC endpoints are effectively exposed

Risk:

- The backend routes themselves do not verify admin identity.

Recommendation:

- Add backend-only authorization checks.
- Do not rely on frontend route hiding or email string checks.

### Sensitive KYC data stored in customer metadata

Risk:

- PAN and Aadhaar numbers are stored in generic metadata.

Recommendation:

- Encrypt sensitive fields at rest.
- Mask high-risk fields in admin UI where possible.
- Limit who can read customer metadata.

### File upload security

Risk:

- Uploaded files are accepted with limited validation and stored directly on disk.
- File names are sanitized, but content is not scanned.

Recommendation:

- Enforce MIME-type and size validation on backend.
- Scan uploads for malware.
- Use private object storage and signed URLs instead of public static serving.

### Public static file serving for KYC documents

Risk:

- Uploaded PAN/CMR docs are served through `/static/*`.

Recommendation:

- Make KYC files private.
- Gate access by admin authorization instead of public URL access.

### CORS is permissive in deployment config

Risk:

- `STORE_CORS`, `ADMIN_CORS`, and `AUTH_CORS` are `*` in `render.yaml`.

Recommendation:

- Restrict origins to trusted frontend/admin domains in production.

### Manual checkout confirmation

Risk:

- Order creation is not tied to verified money movement.

Recommendation:

- Add operations approval before final order capture.
- Introduce explicit payment verification states.

## 14. Deployment Guide

### Local backend setup

1. Create PostgreSQL database.
2. Set backend env vars.
3. Install dependencies.
4. Run Medusa migrations.
5. Start backend.

Example:

```bash
cd backend
npm install
npx medusa db:migrate
npm run dev
```

The repo also contains helper scripts:

- `node create-db.js`
- `node test-db.js`

### Local frontend setup

1. Set `.env.local`
2. Install dependencies
3. Start the Next.js app

Example:

```bash
cd storefront
npm install
npm run dev
```

The storefront runs on port `3001` per `package.json`.

### Backend production deployment

Render config in `backend/render.yaml` shows the intended production flow:

```yaml
buildCommand: npm install && npm run build
startCommand: npx medusa db:migrate && npm run start
```

Provisioned services in the config:

- PostgreSQL database
- Redis service

### Required production checks

- Set real `JWT_SECRET` and `COOKIE_SECRET`
- Restrict CORS origins
- Ensure publishable API key is configured for frontend
- Configure shipping options in Medusa
- Seed products/deals in Medusa
- Replace local file storage for uploads

### Medusa Admin

The backend explicitly enables admin:

```ts
admin: {
  disable: false
}
```

No repository code customizes the Medusa Admin dashboard itself.

## 15. Future Improvements

### Operational and product improvements

- Replace manual bank-transfer confirmation with verified payment reconciliation
- Move KYC documents to secure external storage
- Build a proper admin authorization layer
- Add password reset using a real Medusa email provider
- Add order detail pages instead of only recent transaction cards
- Add investor profile editing beyond metadata updates

### Platform improvements

- Add pagination and filtering at API level for products, orders, and KYC reviews
- Add audit logging for KYC verification/rejection actions
- Introduce stricter validation for customer metadata writes
- Add server-side role-based access control for internal tools
- Add automated seed scripts for deals if product catalog bootstrapping is needed

### UX and engineering improvements

- Show clearer checkout states for waiting-payment vs confirmed-payment vs delivered
- Add webhook or admin workflow for order state updates
- Add order search and full portfolio history
- Convert placeholder forms (contact, newsletter, forgot password) into real integrations
- Add test coverage for auth, cart, checkout, and KYC flows

## Appendix: Route Inventory

### Frontend pages

| Route | Purpose |
| --- | --- |
| `/` | Homepage |
| `/about` | About page |
| `/account` | Redirects to dashboard |
| `/admin/kyc` | Internal KYC review UI |
| `/cart` | Cart |
| `/checkout` | Checkout |
| `/contact` | Contact page |
| `/dashboard` | Investor dashboard |
| `/dashboard/kyc` | KYC form |
| `/deals` | Marketplace |
| `/deals/[id]` | Deal detail |
| `/disclaimer` | Risk disclaimer |
| `/forgot-password` | Mock forgot-password page |
| `/knowledge` | Knowledge hub |
| `/knowledge/[category]` | Knowledge category |
| `/knowledge/articles/[slug]` | Knowledge article |
| `/kyc` | Redirects to dashboard KYC |
| `/login` | Login |
| `/privacy` | Privacy policy |
| `/register` | Registration |
| `/terms` | Terms |

### Custom backend routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/store/upload` | POST | KYC document upload |
| `/admin/kyc` | GET | List pending/submitted KYC customers |
| `/admin/kyc/:id/verify` | POST | Verify KYC |
| `/admin/kyc/:id/reject` | POST | Reject/reset KYC |
| `/static/*` | GET | Serve uploaded files from backend filesystem |

## KT Summary for a New Developer

If you are onboarding onto Polemarch, the fastest mental model is:

1. The storefront is a thin custom UI over Medusa Store/Auth APIs.
2. Deals are just Medusa products plus metadata.
3. Investors are Medusa customers.
4. KYC and manual holdings live entirely inside `customer.metadata`.
5. Checkout uses Medusa's manual payment provider, but the business process continues offline over bank transfer and WhatsApp.
6. The only custom backend features are KYC admin routes, upload handling, and static file serving.
7. The biggest maintenance risks are security around admin/KYC access and operational reliability around file storage and manual payment confirmation.
