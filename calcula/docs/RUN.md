# Run Guide (new/)

## 1) Install

```bash
cd /Users/manojmbhat/Coding/deals/calcula
npm install
```

## 2) Backend setup

```bash
cd apps/backend
cp .env.example .env
# set DATABASE_URL to a PostgreSQL database (example: calcula)
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

Backend URLs:
- REST: `http://localhost:4100/api`
- GraphQL: `http://localhost:4100/graphql`

## 3) Frontend setup

```bash
cd ../frontend
cp .env.example .env.local
npm run dev
```

Frontend URL:
- `http://localhost:3000`

## 4) Default login

- Username: `admin`
- Password: `admin123`

## 5) Flow to verify

1. Login
2. Open Admin Taxonomy and create/update line items
3. Open Admin Companies and create a company
4. Add yearly or quarterly period
5. Enter statement values in Period Financial Editor and save
6. Open company page to verify overview, ratios, trends, and statements
