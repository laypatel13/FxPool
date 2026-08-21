import type { InvoiceStatus, PoolStatus } from "../types";

export const APP_NAME = "FxPool";

// Must match the currencies priced in fxpool-backend/app/services/rate_service.py
// (SPOT_RATE_INR_PER_UNIT) — offering a currency here that the backend can't
// price would let someone submit an invoice that fails on the server.
export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP"] as const;

export const INVOICE_STATUS_META: Record<
  InvoiceStatus,
  { label: string; tone: "muted" | "warn" | "accent" | "up" }
> = {
  pending_pool: { label: "Under review", tone: "muted" },
  pooled: { label: "Pooling", tone: "warn" },
  locked: { label: "Hedged", tone: "accent" },
  settled: { label: "Settled", tone: "up" },
};

export const POOL_STATUS_META: Record<
  PoolStatus,
  { label: string; tone: "muted" | "warn" | "accent" | "up" }
> = {
  collecting: { label: "Collecting", tone: "muted" },
  suggested: { label: "Ready to execute", tone: "warn" },
  locked: { label: "Contract executed", tone: "accent" },
  settled: { label: "Settled", tone: "up" },
};

export const SETTLEMENT_STEPS = [
  { key: "uploaded", label: "Invoice uploaded" },
  { key: "pool_created", label: "Pool assigned" },
  { key: "pool_filled", label: "Pool filled" },
  { key: "executed", label: "Contract executed" },
  { key: "settled", label: "Settlement complete" },
] as const;
