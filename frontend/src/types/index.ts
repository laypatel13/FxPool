// Mirrors app/models/*.py so the frontend and API stay aligned.

export type Role = "exporter" | "admin" | "bank";

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  company_name?: string | null;
  bank_id?: string | null;
}

export interface Bank {
  id: string;
  code: string;
  name: string;
  status: "pending" | "active" | "suspended";
  created_at: string;
}

export interface BankOverview {
  bank: Bank;
  active_pools: number;
  exporters: number;
  pending_invoices: number;
  total_pooled: number;
  hedged_exposure: number;
  open_exposure: number;
}

export interface Invite {
  id: string;
  bank_id: string;
  code: string;
  kind: "exporter" | "bank_user";
  status: string;
  created_at: string;
}

export type InvoiceStatus =
  | "pending_pool"
  | "recommended"
  | "pooled"
  | "pool_not_filled"
  | "locked"
  | "settled";

export interface Invoice {
  id: string;
  exporter_id: string;
  exporter_name?: string | null;
  bank_id?: string | null;
  amount: number;
  currency: string;
  due_date: string;
  invoice_number?: string | null;
  issue_date?: string | null;
  buyer_name?: string | null;
  buyer_country?: string | null;
  payment_terms?: string | null;
  document_url?: string | null;
  extracted_data?: Record<string, unknown> | null;
  validation_status?: string | null;
  indicative_rate?: number | null;
  status: InvoiceStatus;
  pool_id?: string | null;
  locked_rate?: number | null;
  payout_amount?: number | null;
  risk_score?: number | null;
  compliance_status?: string | null;
  agent_recommended_pool_id?: string | null;
  pool_match_status?: string | null;
  match_score?: number | null;
  match_reason?: string | null;
  recommended_alternatives?: Array<{ pool_id: string; match_score?: number; reason?: string }> | null;
  exporter_confirmed?: boolean;
  created_at: string;
}

export type AgentName = "invoice" | "risk" | "pooling" | "compliance" | "orchestrator" | "document" | "matching";

export interface AgentRun {
  id: string;
  invoice_id?: string | null;
  pool_id?: string | null;
  agent_name: AgentName;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  recommendation?: string | null;
  confidence?: number | null;
  created_at: string;
}

export type PoolStatus =
  | "draft"
  | "collecting"
  | "target_reached"
  | "hedging"
  | "hedged"
  | "settled"
  | "cancelled"
  | "expired"
  | "suggested"
  | "locked";

export interface Pool {
  id: string;
  bank_id?: string | null;
  name?: string | null;
  currency: string;
  bucket_start_date: string;
  bucket_end_date: string;
  bucket_width_days: number;
  status: PoolStatus;
  total_amount: number;
  minimum_amount?: number | null;
  target_amount?: number | null;
  maximum_amount?: number | null;
  eligible_exporter_ids?: string[] | null;
  locked_rate?: number | null;
  executed_at?: string | null;
  settled_at?: string | null;
  risk_score?: number | null;
  compliance_status?: string | null;
  created_at: string;
}

export interface PoolDetail extends Pool {
  invoices: Invoice[];
}

export interface RecommendationPayload {
  invoice: Invoice;
  eligible_pools: Pool[];
  recommendation: {
    recommended_pool_id?: string | null;
    match_score?: number;
    reason?: string;
    alternatives?: Array<{ pool_id: string; match_score?: number; reason?: string }>;
    source?: string;
  };
  bank?: { id: string; code?: string; name?: string } | null;
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

export interface ExposureSummary {
  totalInvoices: number;
  activeHedges: number;
  upcomingSettlements: number;
  totalHedgedUsd: number;
  openExposureUsd: number;
}

export interface AdminOverviewStats {
  total_exporters: number;
  active_pools: number;
  pending_approvals: number;
  contracts_executed: number;
  total_volume_hedged: number;
  total_banks?: number;
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
  status?: string;
}
