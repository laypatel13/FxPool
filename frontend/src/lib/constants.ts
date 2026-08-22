import type { InvoiceStatus, PoolStatus, Role } from "../types";

export const APP_NAME = "FxPool";

export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP"] as const;

export function homeForRole(role?: Role | null) {
  if (role === "admin") return "/admin";
  if (role === "bank") return "/bank";
  return "/app";
}

export const INVOICE_STATUS_META: Record<
  InvoiceStatus,
  { label: string; tone: "muted" | "warn" | "accent" | "up" | "down" }
> = {
  pending_pool: { label: "Matching", tone: "muted" },
  recommended: { label: "Recommended", tone: "accent" },
  pooled: { label: "In pool", tone: "warn" },
  pool_not_filled: { label: "Pool not filled", tone: "down" },
  locked: { label: "Hedged", tone: "accent" },
  settled: { label: "Settled", tone: "up" },
};

export const POOL_STATUS_META: Record<
  PoolStatus,
  { label: string; tone: "muted" | "warn" | "accent" | "up" | "down" }
> = {
  draft: { label: "Draft", tone: "muted" },
  collecting: { label: "Collecting", tone: "muted" },
  target_reached: { label: "Target reached", tone: "warn" },
  hedging: { label: "Hedging", tone: "accent" },
  hedged: { label: "Hedged", tone: "up" },
  settled: { label: "Settled", tone: "up" },
  cancelled: { label: "Cancelled", tone: "down" },
  expired: { label: "Expired", tone: "down" },
  suggested: { label: "Target reached", tone: "warn" },
  locked: { label: "Hedged", tone: "up" },
};

export const SETTLEMENT_STEPS = [
  { key: "uploaded", label: "Invoice uploaded" },
  { key: "recommended", label: "Pool recommended" },
  { key: "pooled", label: "Joined pool" },
  { key: "hedged", label: "Bank hedged" },
  { key: "settled", label: "Settlement complete" },
] as const;
