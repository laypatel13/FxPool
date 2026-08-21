# FxPool — Frontend

A React + TypeScript + Tailwind frontend for the FxPool backend (`fxpool-backend`), wired live to the FastAPI backend + Supabase project. There is no offline/preview mode — a Supabase project and a running backend are required.

## Stack

- **Vite + React 19 + TypeScript**
- **Tailwind CSS** — design tokens in `tailwind.config.js`
- **react-router-dom** — client routing
- **@supabase/supabase-js** — auth (matches `app/api/deps.py` on the backend, which verifies the Supabase bearer token)
- **axios** — API client
- **recharts** — analytics charts
- **lucide-react** — icons

## Getting started

```bash
npm install
cp .env.example .env
# then fill in:
# VITE_API_BASE_URL=http://localhost:8000/api/v1
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
npm run dev
```

The app runs at `http://localhost:5173`. These env vars must point at the **same Supabase project** the FastAPI backend uses (`app/core/supabase.py`), since the backend verifies the access token issued by that project. If they're missing, the app logs a console error and auth/API calls will fail — see `src/lib/supabase.ts`.

## Folder structure

```
src/
  components/
    ui/          Design-system primitives (Button, Card, Badge, Input, Modal, Timeline, …)
    layout/       Shells: PublicNavbar/Footer, DashboardShell (exporter), AdminShell, AuthLayout
    marketing/    Landing-page-only pieces (LedgerCard, FaqItem)
    dashboard/    App-only pieces (UploadInvoiceModal)
  pages/
    public/       Landing, HowItWorks, Regulatory, Pricing, Contact
    auth/         Login, SignUp, VerifyEmail, OtpVerification, ForgotPassword, ResetPassword
    app/          Exporter dashboard: Overview, Invoices, InvoiceDetail, Pools, HedgeDetail, Settlements, History, Profile
    admin/        Treasury console: AdminOverview, AdminUsers, AdminInvoices, AdminPools, AdminPoolDetail, AdminAnalytics, AdminSettings
  lib/
    api.ts         axios instance, attaches Supabase bearer token
    supabase.ts     Supabase client
    services.ts     One function per backend capability — every function calls a real endpoint
    constants.ts    Status labels/colors, supported currencies, settlement step copy
    utils.ts        Formatters (money, rate, date), cn()
  hooks/
    useAuth.tsx     Auth context: session, profile, sign in/up/out
  types/
    index.ts        Mirrors the backend's Pydantic models exactly
  components/RouteGuards.tsx   RequireAuth / RequireRole
```

## Design system

Dark, editorial-institutional aesthetic — closer to a trading terminal or a private bank's digital desk than a typical SaaS gradient landing page. No hero gradient blobs; texture comes from a subtle dot-grid field, hairline borders, and tabular monospace numerals.

- **Palette** — near-black base (`#050B14`), layered surfaces (`#111827` → `#1A2234` → `#212B40`), single teal accent (`#00D1C7`) used sparingly.
- **Type** — Fraunces (display serif) for headlines, Inter for UI text, IBM Plex Mono for anything numeric (rates, amounts, IDs) via the `.tnum` class.
- **Signature motif** — the "instrument corner" (`.instrument-corner` in `index.css`): a small bracket in the top-right of ledger/contract cards, styled after a trading-terminal instrument tag. Used consistently on the hero `LedgerCard`, stat cards, and pool/invoice cards so the whole app reads as one system.
- All primitives live in `components/ui` — extend from there rather than one-off styling in pages.

## Backend integration map

Every function in `src/lib/services.ts` is commented with the exact backend route it calls. Summary:

| Frontend | Backend route |
|---|---|
| `fetchMyProfile` / `createProfile` / `updateMyProfile` | `GET /auth/me`, `POST /auth/profile`, `PATCH /auth/me` |
| `fetchMyInvoices` / `fetchInvoice` / `createInvoice` | `GET /invoices`, `GET /invoices/{id}`, `POST /invoices` |
| `fetchIndicativeRate` | `GET /rate/indicative` |
| `fetchOpenPools` / `fetchMyPoolDetail` / `fetchOpenPoolSettings` | `GET /pools`, `GET /pools/{id}`, `GET /pools/settings` (exporter-facing; own invoices only) |
| `fetchPools` / `fetchPoolDetail` / `executePool` / `settlePool` | `GET /admin/pools`, `GET /admin/pools/{id}`, `POST /admin/pools/{id}/execute`, `POST /admin/pools/{id}/settle` |
| `fetchAllInvoices` | `GET /admin/invoices` |
| `fetchPoolSettings` / `updatePoolSettings` | `GET /admin/settings`, `PUT /admin/settings` |
| `fetchExporters` | `GET /admin/exporters` |
| `fetchAdminOverviewStats` | `GET /admin/overview` |
| `fetchAdminAnalytics` | `GET /admin/analytics` |

Notes:

- The exporter dashboard and the admin console use **different pool routes on purpose**: `/pools/*` only ever returns the calling exporter's own invoices within a pool, while `/admin/pools/*` (admin-only) returns every member — this keeps one exporter's invoice amounts from ever reaching another exporter's browser.
- `SUPPORTED_CURRENCIES` in `lib/constants.ts` must stay in sync with `SPOT_RATE_INR_PER_UNIT` in the backend's `rate_service.py` — currently USD/EUR/GBP. Add a currency in both places together, or invoice creation will 400.

## Notes

- Every list/table view has its own loading skeleton and empty state — check `components/ui/Skeleton.tsx` and `EmptyState.tsx`.
- Currency, money, date, and rate formatting all live in `lib/utils.ts` — use those rather than formatting inline.
- Two previously-scaffolded admin pages (Banking operations, Compliance) were removed — they had no backing schema/endpoints and only rendered static fixture data. Rebuild them for real once a banking-partner webhook and a KYC/audit-log store exist on the backend.
