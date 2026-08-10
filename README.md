# MR Marvel — React Dashboard

Modern React inventory and salary management UI for MR Marvel. Built with React 19, TypeScript, Vite, Tailwind CSS, and Supabase (Auth + Postgres).

## Features

- **Inventory**: Upload system balance and actual count Excel files, compare, charts, save to Supabase, export
- **Salary** (super admin): Excel upload, reports, WhatsApp messaging
- **Role-based access**: Super admin vs employee scopes
- **User management** (super admin): Create users, reset passwords via Edge Functions
- **Arabic RTL** light-mode UI

## Prerequisites

- Node.js 18+
- A Supabase project with the backend schema, RLS, and Edge Functions already deployed

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL (Dashboard → Project Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | Supabase **anon/public** key (never commit the service role key) |
| `SUPABASE_URL` | Same project URL (used by Node import scripts; falls back to `VITE_SUPABASE_URL`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for imports only (`.env` / local shell — never commit) |

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### 4. Production build

```bash
npm run build
npm run preview
```

Static output is written to `dist/`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Typecheck and production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run import:sales` | Import sales Excel into `sales_details` (service role) |

## Sales Excel import

Line-item sales from `New Microsoft Excel Worksheet (4).xlsx` (Sheet1) load into `sales_details`, with analytics views for invoices, branches, sellers, categories, and seasons.

### 1. Apply migration

```bash
supabase db push --linked --include-all
```

Migration file: `supabase/migrations/20250810210000_sales_details_and_views.sql`

### 2. Configure import env (local `.env`, gitignored)

```env
SUPABASE_URL=https://oicywhnpaypkcxrvwpte.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

`SUPABASE_URL` falls back to `VITE_SUPABASE_URL` if unset.

### 3. Run import

```bash
npm run import:sales
# or with an explicit file path:
npm run import:sales -- "New Microsoft Excel Worksheet (4).xlsx"
```

The script rebuilds Date-corrupted `invoice_number` values, pads `customer_mobile` to 11 digits, parses Excel serial `sale_date`s, deletes existing `sales_details` rows, then inserts in batches of ~400.


### Clear sales data (re-import)

To wipe invoice inventory before a fresh Excel import:

```bash
npm run clear:sales
```

Then run `npm run import:sales` again.

### 4. Expected validation

```sql
select count(*) as total_rows, count(distinct invoice_number) as total_invoices
from sales_details;
```

Expect about **948** rows and **~408** distinct invoices.

## Project layout

```
├── public/          # Static assets (logo.jpg, favicon)
├── scripts/         # Node import / admin scripts (service role)
├── src/             # Application source
├── supabase/        # Migrations
├── .env.example     # Environment template (commit this)
├── vite.config.ts
└── package.json
```

## Security

- Do not commit `.env`, service role keys, or real API keys.
- Import scripts require `SUPABASE_SERVICE_ROLE_KEY` locally only.
