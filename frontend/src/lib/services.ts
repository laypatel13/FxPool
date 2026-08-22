import api from "./api";
import type {
  AdminAnalyticsData,
  AdminOverviewStats,
  Bank,
  BankOverview,
  ExporterSummary,
  Invite,
  Invoice,
  Pool,
  PoolDetail,
  PoolSettings,
  Profile,
  RecommendationPayload,
  Role,
} from "../types";

export async function fetchMyProfile(): Promise<Profile> {
  const { data } = await api.get<Profile>("/auth/me");
  return data;
}

export async function validateInvite(code: string, role: string): Promise<boolean> {
  const { data } = await api.post<{ ok: boolean }>("/auth/validate-invite", { code, role });
  return data.ok;
}

export async function createProfile(body: {
  role: Role;
  full_name: string;
  company_name?: string;
  invitation_code?: string;
}): Promise<Profile> {
  const { data } = await api.post<Profile>("/auth/profile", body);
  return data;
}

export async function updateMyProfile(body: { full_name?: string; company_name?: string }): Promise<Profile> {
  const { data } = await api.patch<Profile>("/auth/me", body);
  return data;
}

export async function fetchMyInvoices(): Promise<Invoice[]> {
  const { data } = await api.get<Invoice[]>("/invoices");
  return data;
}

export async function fetchInvoice(id: string): Promise<Invoice | undefined> {
  const { data } = await api.get<Invoice>(`/invoices/${id}`);
  return data;
}

export async function fetchRecommendation(id: string): Promise<RecommendationPayload> {
  const { data } = await api.get<RecommendationPayload>(`/invoices/${id}/recommendation`);
  return data;
}

export async function confirmInvoice(id: string): Promise<Invoice> {
  const { data } = await api.post<Invoice>(`/invoices/${id}/confirm`);
  return data;
}

export async function participateInPool(invoiceId: string, poolId?: string) {
  const { data } = await api.post(`/invoices/${invoiceId}/participate`, { pool_id: poolId ?? null });
  return data as { invoice: Invoice; pool: Pool };
}

export async function createInvoice(body: {
  amount: number;
  currency: string;
  due_date: string;
  invoice_number?: string;
  buyer_name?: string;
  buyer_country?: string;
  payment_terms?: string;
  document_text?: string;
}): Promise<Invoice> {
  const { data } = await api.post<Invoice>("/invoices", body);
  return data;
}

export async function uploadInvoice(form: FormData): Promise<Invoice> {
  const { data } = await api.post<Invoice>("/invoices/upload", form);
  return data;
}

export async function fetchIndicativeRate(currency: string, dueDate: string) {
  const { data } = await api.get("/rate/indicative", { params: { currency, due_date: dueDate } });
  return data as { currency: string; due_date: string; indicative_rate: number };
}

export async function fetchOpenPools(status?: string): Promise<Pool[]> {
  const { data } = await api.get<Pool[]>("/pools", { params: status ? { status } : {} });
  return data;
}

export async function fetchMyPoolDetail(poolId: string): Promise<PoolDetail> {
  const { data } = await api.get<PoolDetail>(`/pools/${poolId}`);
  return data;
}

export async function fetchOpenPoolSettings(): Promise<PoolSettings> {
  const { data } = await api.get<PoolSettings>("/pools/settings");
  return data;
}

export async function fetchPools(status?: string): Promise<Pool[]> {
  const { data } = await api.get<Pool[]>("/admin/pools", { params: status ? { status } : {} });
  return data;
}

export async function fetchPoolDetail(poolId: string): Promise<PoolDetail> {
  const { data } = await api.get<PoolDetail>(`/admin/pools/${poolId}`);
  return data;
}

export async function executePool(poolId: string): Promise<Pool> {
  const { data } = await api.post<Pool>(`/admin/pools/${poolId}/execute`);
  return data;
}

export async function settlePool(poolId: string): Promise<Pool> {
  const { data } = await api.post<Pool>(`/admin/pools/${poolId}/settle`);
  return data;
}

export async function fetchAllInvoices(status?: string): Promise<Invoice[]> {
  const { data } = await api.get<Invoice[]>("/admin/invoices", { params: status ? { status } : {} });
  return data;
}

export async function fetchPoolSettings(): Promise<PoolSettings> {
  const { data } = await api.get<PoolSettings>("/admin/settings");
  return data;
}

export async function updatePoolSettings(body: Partial<PoolSettings>): Promise<PoolSettings> {
  const { data } = await api.put<PoolSettings>("/admin/settings", body);
  return data;
}

export async function fetchExporters(): Promise<ExporterSummary[]> {
  const { data } = await api.get<ExporterSummary[]>("/admin/exporters");
  return data;
}

export async function fetchAdminOverviewStats(): Promise<AdminOverviewStats> {
  const { data } = await api.get<AdminOverviewStats>("/admin/overview");
  return data;
}

export async function fetchAdminAnalytics(): Promise<AdminAnalyticsData> {
  const { data } = await api.get<AdminAnalyticsData>("/admin/analytics");
  return data;
}

export async function fetchBanks(): Promise<Bank[]> {
  const { data } = await api.get<Bank[]>("/admin/banks");
  return data;
}

export async function createBank(body: { code: string; name: string; status?: string }): Promise<Bank> {
  const { data } = await api.post<Bank>("/admin/banks", body);
  return data;
}

export async function verifyBank(id: string): Promise<Bank> {
  const { data } = await api.post<Bank>(`/admin/banks/${id}/verify`);
  return data;
}

export async function suspendBank(id: string): Promise<Bank> {
  const { data } = await api.post<Bank>(`/admin/banks/${id}/suspend`);
  return data;
}

export async function createAdminInvite(bankId: string, kind: "exporter" | "bank_user", code?: string): Promise<Invite> {
  const { data } = await api.post<Invite>(`/admin/banks/${bankId}/invites`, { kind, code });
  return data;
}

export async function fetchBankOverview(): Promise<BankOverview> {
  const { data } = await api.get<BankOverview>("/bank/overview");
  return data;
}

export async function fetchBankPools(status?: string): Promise<Pool[]> {
  const { data } = await api.get<Pool[]>("/bank/pools", { params: status ? { status } : {} });
  return data;
}

export async function createBankPool(body: {
  name: string;
  currency: string;
  bucket_start_date: string;
  bucket_end_date: string;
  minimum_amount: number;
  target_amount: number;
  maximum_amount: number;
}): Promise<Pool> {
  const { data } = await api.post<Pool>("/bank/pools", body);
  return data;
}

export async function fetchBankPoolDetail(poolId: string): Promise<PoolDetail> {
  const { data } = await api.get<PoolDetail>(`/bank/pools/${poolId}`);
  return data;
}

export async function startBankHedge(poolId: string): Promise<Pool> {
  const { data } = await api.post<Pool>(`/bank/pools/${poolId}/hedge`);
  return data;
}

export async function executeBankPool(poolId: string): Promise<Pool> {
  const { data } = await api.post<Pool>(`/bank/pools/${poolId}/execute`);
  return data;
}

export async function settleBankPool(poolId: string): Promise<Pool> {
  const { data } = await api.post<Pool>(`/bank/pools/${poolId}/settle`);
  return data;
}

export async function markPoolUnfilled(poolId: string): Promise<Pool> {
  const { data } = await api.post<Pool>(`/bank/pools/${poolId}/unfilled`);
  return data;
}

export async function fetchBankExporters(): Promise<ExporterSummary[]> {
  const { data } = await api.get<ExporterSummary[]>("/bank/exporters");
  return data;
}

export async function fetchBankInvoices(status?: string): Promise<Invoice[]> {
  const { data } = await api.get<Invoice[]>("/bank/invoices", { params: status ? { status } : {} });
  return data;
}

export async function fetchBankInvites(): Promise<Invite[]> {
  const { data } = await api.get<Invite[]>("/bank/invites");
  return data;
}

export async function createBankInvite(kind: "exporter" | "bank_user" = "exporter"): Promise<Invite> {
  const { data } = await api.post<Invite>("/bank/invites", { kind });
  return data;
}
