// Mirrors app/models/*.py in fxpool-backend so the frontend and API
// never drift silently out of sync.

export type Role = "exporter" | "admin" | "bank";

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  company_name?: string | null;
}

export type InvoiceStatus = "pending_pool" | "pooled" | "locked" | "settled";

export interface Invoice {
  id: string;
  exporter_id: string;
  exporter_name?: string | null;
  amount: number;
  currency: string;
  due_date: string; // ISO date
  indicative_rate?: number | null;
  status: InvoiceStatus;
  pool_id?: string | null;
  locked_rate?: number | null;
  payout_amount?: number | null;
  risk_score?: number | null;
  compliance_status?: string | null;
  agent_recommended_pool_id?: string | null;
  exporter_confirmed?: boolean;
  created_at: string; // ISO datetime
}

export type AgentName = "invoice" | "risk" | "pooling" | "compliance" | "orchestrator";

export interface AgentRun {
  id: string;
  invoice_id?: string | null;
  pool_id?: string | null;
  agent_name: AgentName;
  input?: Record<string, any> | null;
  output?: Record<string, any> | null;
  recommendation?: string | null;
  confidence?: number | null;
  created_at: string; // ISO datetime
}

export type PoolStatus = "collecting" | "suggested" | "locked" | "settled";

export interface Pool {
  id: string;
  currency: string;
  bucket_start_date: string;
  bucket_end_date: string;
  bucket_width_days: number;
  status: PoolStatus;
  total_amount: number;
  locked_rate?: number | null;
  executed_at?: string | null;
  settled_at?: string | null;
  risk_score?: number | null;
  compliance_status?: string | null;
  bank_id?: string | null;
  routing_confidence?: number | null;
  routing_reasoning?: string | null;
  created_at: string;
}

export interface PoolDetail extends Pool {
  invoices: Invoice[];
}

export interface PoolSettings {
  id: string;
  currency?: string | null;
  bucket_width_days: number;
  min_pool_amount?: number | null;
}

export interface IndicativeRate {
  currency: string;
  due_date: string;
  indicative_rate: number;
}

// UI-only aggregate — computed client-side from /invoices + /admin/pools,
// there is no single backend endpoint for this yet.
export interface ExposureSummary {
  totalInvoices: number;
  activeHedges: number;
  upcomingSettlements: number;
  totalHedgedUsd: number;
  openExposureUsd: number;
}

// Mirrors app/models/admin.py — real aggregates, computed server-side.
export interface AdminOverviewStats {
  total_exporters: number;
  active_pools: number;
  pending_approvals: number;
  contracts_executed: number;
  total_volume_hedged: number;
}

export interface MonthlyVolumePoint {
  month: string;
  total: number;
}

export interface CurrencyMixPoint {
  currency: string;
  value: number;
}

export interface AdminAnalyticsData {
  monthly_volume: MonthlyVolumePoint[];
  currency_mix: CurrencyMixPoint[];
}

export interface ExporterSummary {
  id: string;
  full_name: string;
  company_name?: string | null;
  invoice_count: number;
  total_volume: number;
}

export interface Bank {
  id: string;
  name: string;
  code: string;
  status: "active" | "inactive" | "suspended";
  supported_currencies: string[];
  api_endpoint?: string | null;
  contact_email?: string | null;
  contact_name?: string | null;
  created_at: string;
}

export interface BankCapacity {
  id: string;
  bank_id: string;
  currency: string;
  max_exposure: number;
  current_exposure: number;
  min_pool_amount?: number | null;
  updated_at: string;
}

export interface BankQuote {
  id: string;
  pool_id: string;
  bank_id: string;
  quoted_rate: number;
  source: string;
  valid_until?: string | null;
  created_at: string;
}
