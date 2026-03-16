# Polemarch — Project Overview

**Polemarch** is a web platform for buying and selling **unlisted and pre-IPO shares**, based in **Bangalore, India**. It consists of a **Next.js** storefront and a **Medusa v2** commerce backend, with features for investor onboarding, KYC, portfolio tracking, and a deal marketplace.

---

## 1. What the Project Does

### Purpose
- **Primary users:** Indian retail and HNI investors evaluating unlisted shares and pre-IPO opportunities.
- **Core value:** Browse deal listings, complete KYC, capture interest via cart, and track portfolio (including manual holdings from other platforms).

### Main Flows
| Flow | Description |
|------|-------------|
| **Marketplace** | Public listing of unlisted-share deals (products) from Medusa; featured/trending on home, detail pages per company. |
| **Auth** | Register, login, session via Medusa customer auth; frontend keeps session state in React context and token in `localStorage`. |
| **Cart** | Medusa cart stores “interest” (share quantities); cart state in React context, synced with backend. |
| **KYC** | Collect PAN, Aadhaar, DP name, Demat number; upload PAN copy and CMR (Client Master Report); store in customer metadata and file URLs. |
| **Investor dashboard** | KYC status, manual investments (add/delete), total portfolio (manual + placeholder for Medusa orders), recent activity placeholder. |
| **Knowledge hub** | Static categories and articles (basics, strategy, legal, FAQs) for education. |

---

## 2. Technologies Used

### Frontend (`storefront/`)
| Technology | Version / Notes |
|------------|------------------|
| **Next.js** | 16.x (App Router) |
| **React** | 19.x |
| **Tailwind CSS** | 4.x |
| **Lucide React** | Icons |

- **State:** React Context for user session, cart, and toasts.
- **API layer:** `storefront/src/lib/medusa.ts` — fetch to Medusa store/auth APIs using `NEXT_PUBLIC_MEDUSA_BACKEND_URL` and publishable key.

### Backend (`backend/`)
| Technology | Version / Notes |
|------------|------------------|
| **Medusa** | v2 (framework, medusa, utils — “latest”) |
| **PostgreSQL** | Via `pg`; connection via `DATABASE_URL` in `medusa-config.ts`. |
| **Node** | 20.x (Render) |

- **Uploads:** Custom route `POST /store/upload` with **multer** (memory storage); files written to `backend/static`, served at `GET /static/*`.
- **Seeding:** `backend/src/api/seed-deals/route.ts` — creates India region and upserts sample deal products.

### Deployment / Ops
- **Render:** `render.yaml` — web service (Node), Postgres DB, Redis (for Medusa/session/cache if used).
- **Database:** Scripts like `create-db.js`, `test-db.js`; migrations via `npx medusa db:migrate` before start.

---

## 3. Features (Implemented)

- **Public**
  - Home page with hero, featured/trending deals, “How it works”, newsletter CTA.
  - Deals listing and filters; deal detail pages with company info, financials, investment calculator.
  - Knowledge hub: categories and article pages.
  - Legal: About, Contact, Privacy, Terms, Disclaimer.

- **Auth**
  - Registration (Medusa two-step: auth identity + customer).
  - Login / logout; session persistence; protected routes (e.g. dashboard, KYC) redirect to login when not authenticated.

- **Cart & checkout**
  - Add/update/remove cart line items; cart page with subtotal/stamp duty; checkout page (UI; actual payment flow not implemented).

- **KYC**
  - Form: full name, PAN, Aadhaar, DP name, Demat number.
  - File upload: PAN copy (PDF/images), CMR copy (PDF) to `/store/upload`; URLs stored in customer metadata.
  - Validation: PAN format, Aadhaar 12 digits, Demat 16 digits.
  - Status: pending → submitted → (intended) verified; dashboard shows status.

- **Dashboard**
  - Profile summary, KYC status card, total portfolio (manual + placeholder for marketplace).
  - Manual investments: add (company name, amount, platform) / delete; stored in `customer.metadata.manual_investments`.
  - Recent transactions: placeholder (no Medusa orders wired yet).

- **Backend / admin**
  - Medusa admin enabled; store API for products, regions, carts, customers, auth.

---

## 4. What Can Be Improved

### Functionality
- **Checkout/payments:** Checkout is UI-only; no payment gateway or order completion flow.
- **Orders in dashboard:** “Recent Transactions” and “Marketplace Deals” (₹0) not tied to real Medusa orders.
- **KYC verification workflow:** No admin flow to set `kyc_status` to `verified` or reject; only “submitted” is set by user.
- **Seed route:** Seed endpoint and local invocation not documented (e.g. GET URL, env, when to run).
- **Docs:** No single “Local setup” guide (DB create, migrate, env vars, run backend + storefront, seed).

### Code & architecture
- **Upload dependency:** `multer` is used in `backend/src/api/middlewares.ts` but not listed in `backend/package.json`; add it explicitly.
- **Hardcoded URL in upload response:** Upload route returns `http://localhost:9000/static/...`; should use `MEDUSA_BACKEND_URL` or request host for portability.
- **Sensitive script:** `create-db.js` contains a hardcoded Postgres connection string (password); remove or use env and never commit secrets.
- **Type safety:** `(req as any).file` and `user.metadata` could be typed (Medusa customer metadata, multer types).

### UX / product
- Newsletter form: no backend or third-party integration.
- Forgot-password page: presence vs actual “reset password” flow.
- Error handling and toasts: more consistent feedback on failed API calls.

---

## 5. Security Assessment

### Current strengths
- **Auth:** Medusa handles customer auth (email/password, JWT); dashboard/KYC routes guarded by session check and redirect.
- **CORS:** Configurable via env (`STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`); production should use explicit origins, not `*`.
- **KYC validation:** Client-side validation for PAN, Aadhaar, Demat format.
- **HTTPS:** Enforced in production (e.g. on Render); ensure all cookies and tokens are only sent over HTTPS.

### Critical / high-risk issues
1. **Upload endpoint unauthenticated**  
   `POST /store/upload` has **no authentication**. Anyone can upload files, fill disk, or attempt malicious filenames. **Fix:** Require Medusa customer auth (or admin) before accepting uploads; consider separate auth middleware for this route.

2. **Path traversal on static files**  
   `GET /static/*` uses `req.params[0]` (or `path.basename(req.path)`) in `path.join(process.cwd(), "static", fileName)`. If `fileName` can contain `..`, an attacker may read arbitrary files (e.g. `../../../etc/passwd`). **Fix:** Resolve to canonical path and ensure it lies under `static` (e.g. `path.resolve(staticDir, fileName).startsWith(path.resolve(staticDir))`), and reject otherwise.

3. **Secrets and defaults**  
   - `medusa-config.ts`: `JWT_SECRET` and `COOKIE_SECRET` default to `"supersecret"` if env is missing — **must** be set to strong random values in production.
   - `create-db.js`: Hardcoded DB URL with password in repo — **remove** or use env and add to `.gitignore`; rotate the password.

4. **Sensitive data in metadata**  
   PAN, Aadhaar, Demat, and KYC file URLs live in customer `metadata`. Ensure DB and backups are encrypted at rest; consider encrypting PII in application layer and strict access control in admin.

5. **Token storage**  
   JWT in `localStorage` is vulnerable to XSS. Prefer httpOnly, secure, SameSite cookies for tokens if Medusa supports it; otherwise strict CSP and XSS prevention are essential.

6. **CORS in production**  
   `render.yaml` uses `*` for CORS; restrict to the actual storefront (and admin) origins.

### Recommendations
- Add **rate limiting** on auth and upload endpoints.
- Validate **file types and size** (e.g. only PDF/JPEG/PNG, max 5MB) and sanitize filenames.
- **Audit** who can read/update customer metadata in admin and APIs.
- Keep dependencies updated and run `npm audit`; fix high/critical findings.

---

## 6. Scalability & Reliability

### Will the site crash under high traffic?

**Short answer:** It can. Current design has several single points of failure and non-horizontal choices; with hardening and changes it can be made more scalable.

### Bottlenecks and risks

| Area | Current state | Risk under load |
|------|----------------|-----------------|
| **File uploads** | Written to local `backend/static` on the app server. | Single disk; multiple instances would not share files; restarts lose new uploads unless persisted elsewhere. |
| **Database** | Single Postgres. | No read replicas; all reads/writes hit one DB. |
| **Sessions / cache** | Render has Redis; Medusa may use it. | If not used, session/cart state may be in-memory or DB-only — scaling multiple backend instances needs shared session. |
| **Upload endpoint** | No rate limit; unauthenticated. | Abuse can fill disk or exhaust memory (multer memoryStorage). |
| **Static file serving** | Same Node process serves `/static/*`. | Serves from local disk; not offloaded to CDN or object storage. |
| **Next.js** | SSR/SSG and `revalidate: 60` on product fetches. | Reasonable for moderate traffic; ensure backend and DB can handle the request rate. |

### Recommendations for scale
1. **Uploads:** Use **object storage** (e.g. S3, GCS) and optionally a CDN; store only URLs in DB. No local `static` dependency; multiple backend instances work.
2. **Static assets:** Serve product images and KYC documents from CDN + object storage, not from app server.
3. **Database:** Add read replicas for read-heavy endpoints (product list, deal detail); use connection pooling (e.g. PgBouncer).
4. **Rate limiting:** On auth, upload, and public APIs to protect DB and disk.
5. **Caching:** Use Redis for session/cart and for caching product/region data where appropriate.
6. **Horizontal scaling:** Run multiple Medusa instances behind a load balancer; ensure no in-memory or local-disk state (sessions in Redis, files in S3).
7. **Monitoring:** Latency, errors, and resource usage (CPU, memory, disk) for backend and DB; alerts on high error rate or disk usage.

### Summary
- **As-is:** Suitable for low traffic and MVP; risk of overload or abuse (especially uploads and unauthenticated upload).
- **With fixes (auth upload, path traversal, secrets, rate limits, file storage, DB/cache):** Can support growing user volume and multiple instances.

---

## 7. How to Run (Summary)

- **Backend:** In `backend/`, set `DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECRET`, and CORS env vars; `npm install` and `npm run dev`.
- **Storefront:** In `storefront/`, set `NEXT_PUBLIC_MEDUSA_BACKEND_URL` and `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` in `.env.local`; `npm install` and `npm run dev` (default port 3001).
- **Browser:** Open storefront at `http://localhost:3001`; backend typically at `http://localhost:9000`.
- **Seed deals:** After backend is up, call the seed route (e.g. GET to the seed-deals route); exact URL and auth (if any) not documented in repo — add to setup guide.
- **DB:** Use or adapt `create-db.js` with env-based connection string; run migrations with `npx medusa db:migrate` before start (as in Render start command).

---

## 8. Repo Evidence (Summary)

- **Frontend:** Next.js App Router in `storefront/src` (home, deals, auth, dashboard, cart, checkout, knowledge, legal pages).
- **Medusa client:** `storefront/src/lib/medusa.ts` — products, regions, carts, auth, customers.
- **Backend:** Medusa v2 in `backend/`; `medusa-config.ts` (Postgres, CORS, JWT/COOKIE secrets); custom middlewares and upload/static routes; seed-deals API.
- **Deployment:** `render.yaml` (web, Postgres, Redis); `create-db.js`, `test-db.js`; no single “Local setup” doc in repo.

This document is based on the provided summary and codebase inspection; missing operational details are marked explicitly.
