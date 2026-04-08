# Calcula v1 - Deployment Handoff (Zip Transfer)

This guide is for sending the project to another PC as a `.zip`, then running it there.

## 1) What to send (deployable project files)

Zip and send the `new/` workspace with source and configs, but **exclude build artifacts and local env files**.

### Include
- `new/package.json`
- `new/package-lock.json`
- `new/README.md`
- `new/apps/backend/**`
- `new/apps/frontend/**`
- `new/docs/**` (optional but recommended)
- `new/reference/**` (optional, reference-only)

### Exclude
- `new/node_modules/`
- `new/apps/backend/node_modules/`
- `new/apps/frontend/node_modules/`
- `new/apps/frontend/.next/`
- `new/apps/backend/dist/` (can be rebuilt)
- `new/apps/backend/.env`
- `new/apps/frontend/.env.local`
- `.DS_Store`

## 2) Create the zip (on your machine)

Run from project root:

```bash
cd /Users/manojmbhat/Coding/deals/calcula

zip -r calcula-deployable.zip . \
  -x "new/node_modules/*" \
     "new/apps/backend/node_modules/*" \
     "new/apps/frontend/node_modules/*" \
     "new/apps/frontend/.next/*" \
     "new/apps/backend/dist/*" \
     "new/apps/backend/.env" \
     "new/apps/frontend/.env.local" \
     "*.DS_Store"
```

Send `calcula-deployable.zip`.

## 3) Recipient machine prerequisites

Install:
- Node.js **20+** (LTS recommended)
- npm (comes with Node)
- PostgreSQL **14+**

Verify:

```bash
node -v
npm -v
psql --version
```

## 4) Unzip and install dependencies

```bash
unzip calcula-deployable.zip
cd new
npm install
```

## 5) Database setup (PostgreSQL)

Create DB + user (example):

```sql
CREATE USER calcula WITH PASSWORD 'calcula';
CREATE DATABASE calcula OWNER calcula;
```

## 6) Configure environment files

### Backend

```bash
cd apps/backend
cp .env.example .env
```

Edit `apps/backend/.env`:

```env
DATABASE_URL=postgresql://calcula:calcula@localhost:5432/calcula?schema=public
JWT_SECRET=change-me-to-strong-secret
JWT_EXPIRES_IN_SECONDS=86400
PORT=4100
```

### Frontend

```bash
cd ../frontend
cp .env.example .env.local
```

Edit `apps/frontend/.env.local`:

```env
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4100/graphql
NEXT_PUBLIC_API_URL=http://localhost:4100/api
```

## 7) Run migrations + seed

```bash
cd ../backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## 8) Start services

### Terminal 1 - Backend

```bash
cd new/apps/backend
npm run start:dev
```

Backend URLs:
- REST: `http://localhost:4100/api`
- GraphQL: `http://localhost:4100/graphql`

### Terminal 2 - Frontend

```bash
cd new/apps/frontend
npm run dev
```

Frontend URL:
- `http://localhost:3000`

## 9) Production mode run (optional)

### Backend

```bash
cd new/apps/backend
npm run build
npm run start
```

### Frontend

```bash
cd new/apps/frontend
npm run build
npm run start
```

## 10) Default login

- Username: `admin`
- Password: `admin123`

## 11) Quick smoke test checklist

1. Login works.
2. `/admin/taxonomy` loads and line items are visible/editable.
3. `/admin/companies`:
   - create/select company,
   - upsert period,
   - period appears as financial table column.
4. Enter values and `Save All Changes` succeeds.
5. `/company/[id]` shows tabs/charts/tables.

## 12) Troubleshooting

### "Cannot connect to database"
- Check `DATABASE_URL` in `apps/backend/.env`.
- Ensure PostgreSQL is running.
- Re-run `npm run prisma:migrate`.

### "Frontend cannot reach backend"
- Check backend is on port `4100`.
- Check `apps/frontend/.env.local` URLs.

### VMind/VChart build issues
- Ensure dependency install finished in `new/` root (`npm install`).
- Use Node 20+.

---

If you want, I can also add a second file with **Docker-based deployment instructions** (`docker-compose`) so the recipient can run with one command.
