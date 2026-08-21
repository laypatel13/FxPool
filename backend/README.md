# FxPool Backend

FastAPI + Supabase (Postgres) backend for FxPool — instant forex hedging
for small exporters via pooled forward contracts.

## Folder structure

```
fxpool-backend/
├── app/
│   ├── main.py                  # FastAPI app entrypoint, CORS, router mount
│   ├── core/
│   │   ├── config.py             # env-based settings (pydantic-settings)
│   │   ├── supabase.py           # service-role Supabase client
│   │   └── security.py           # Supabase JWT verification
│   ├── api/
│   │   ├── deps.py               # get_current_user / require_admin / require_exporter
│   │   └── v1/
│   │       ├── router.py         # aggregates all endpoint routers
│   │       └── endpoints/
│   │           ├── auth.py            # POST /auth/profile, GET/PATCH /auth/me
│   │           ├── rates.py           # GET /rate/indicative
│   │           ├── invoices.py        # exporter invoice CRUD + pooling trigger
│   │           ├── pools.py           # exporter-facing pool marketplace (own invoices only)
│   │           ├── admin_pools.py     # admin pool list/detail/execute/settle
│   │           ├── admin_invoices.py  # admin cross-exporter invoice view
│   │           ├── admin_settings.py  # GET/PUT bucket width N, min pool amount
│   │           ├── admin_overview.py  # GET /admin/overview — treasury console stat cards
│   │           ├── admin_analytics.py # GET /admin/analytics — monthly volume + currency mix
│   │           └── admin_exporters.py # GET /admin/exporters — real exporter roster
│   ├── models/                   # Pydantic request/response schemas
│   │   ├── profile.py
│   │   ├── invoice.py
│   │   ├── pool.py
│   │   ├── settings.py
│   │   └── admin.py              # overview/analytics/exporter response shapes
│   └── services/                 # business logic, no HTTP concerns
│       ├── rate_service.py       # interest-rate-differential forward pricing
│       ├── pooling_service.py    # bucket-matching / pool assignment
│       └── settlement_service.py # execute + settle a pool
├── sql/
│   └── schema.sql                # tables + RLS policies for Supabase
├── tests/
├── requirements.txt
└── .env.example
```

Why this shape: `api/` only handles HTTP (auth, validation, status codes) and
delegates all logic to `services/`, which talk to Supabase directly. This
keeps endpoints thin and testable, and means the pooling/settlement logic
can be unit-tested without spinning up FastAPI. Adding a new resource later
(e.g. `/webhooks`) just means one new file in `endpoints/` + `router.py`.

## Setup

```bash
cp .env.example .env        # fill in Supabase project URL, service role key, JWT secret
pip install -r requirements.txt
```

Run `sql/schema.sql` in the Supabase SQL editor (or via CLI) to create tables and RLS policies.

## Run

```bash
uvicorn app.main:app --reload
```

Docs at `http://localhost:8000/docs`.

## Auth model

- Signup/login handled entirely by **Supabase Auth** on the frontend.
- Frontend sends the Supabase access token as `Authorization: Bearer <token>` on every request.
- After first login, frontend calls `POST /auth/profile` once to create the `role` row.
- FastAPI verifies the JWT (`app/core/security.py`) and reads `role` from `profiles` (`app/api/deps.py`) to gate `admin`-only routes.

## Pooling logic (summary)

`POST /invoices` → indicative rate computed → invoice inserted → `pooling_service.assign_invoice_to_pool()`:
1. finds an open pool of the same currency whose `[bucket_start_date, bucket_end_date]` contains `due_date`
2. attaches to it, or opens a new pool sized by the current admin-set `N` (`pool_settings.bucket_width_days`)
3. flips pool `status` to `suggested` once `total_amount ≥ min_pool_amount` — admin still has to click **Execute**

## Open items (carried over from design doc)

- Exact `collecting → suggested` threshold: currently amount-only; can extend to invoice-count/age.
- Whether `min_pool_amount` should be per-currency (schema already supports it via `pool_settings.currency`).
- Manual admin re-assignment of an invoice stuck in a stale pool — not yet implemented.
