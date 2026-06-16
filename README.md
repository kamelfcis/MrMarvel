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

## Project layout

```
├── public/          # Static assets (logo.jpg, favicon)
├── src/             # Application source
├── .env.example     # Environment template (commit this)
├── vite.config.ts
└── package.json
```

## Security

- Do not commit `.env` or real API keys.
- Database migrations, seed scripts, and service-role operations belong in your Supabase/backend setup, not in this repo.
