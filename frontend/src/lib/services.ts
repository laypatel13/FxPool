import api from "./api";
import type {
  AdminAnalyticsData,
  AdminOverviewStats,
  ExporterSummary,
  Invoice,
  Pool,
  PoolDetail,
  PoolSettings,
  Profile,
} from "../types";

// ---- Profile — wired to /auth ---------------------------------------------

export async function fetchMyProfile(): Promise<Profile> {
  const { data } = await api.get<Profile>("/auth/me");
  return data;
}

export async function createProfile(body: {
  role: "exporter" | "admin";
  full_name: string;
  company_name?: string;
}): Promise<Profile> {
  const { data } = await api.post<Profile>("/auth/profile", body);
  return data;
}

export async function updateMyProfile(body: { full_name?: string; company_name?: string }): Promise<Profile> {
  const { data } = await api.patch<Profile>("/auth/me", body);
  return data;
}

// ---- Invoices — wired to /invoices -----------------------------------------

export async function fetchMyInvoices(): Promise<Invoice[]> {
  const { data } = await api.get<Invoice[]>("/invoices");
  return data;
}

export async function fetchInvoice(id: string): Promise<Invoice | undefined> {
  const { data } = await api.get<Invoice>(`/invoices/${id}`);
  return data;
}

export async function createInvoice(body: {
  amount: number;
  currency: string;
  due_date: string;
}): Promise<Invoice> {
  const { data } = await api.post<Invoice>("/invoices", body);
  return data;
}

export async function fetchIndicativeRate(currency: string, dueDate: string) {
  const { data } = await api.get("/rate/indicative", { params: { currency, due_date: dueDate } });
  return data as { currency: string; due_date: string; indicative_rate: number };
}

// ---- Pool marketplace (exporter-facing, read-only) — wired to /pools ------

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

// ---- Pools (admin-scoped) — wired to /admin/pools --------------------------

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

// ---- Admin — invoices, settings, exporters ---------------------------------

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

// ---- Admin overview + analytics — wired to /admin/overview, /admin/analytics

export async function fetchAdminOverviewStats(): Promise<AdminOverviewStats> {
  const { data } = await api.get<AdminOverviewStats>("/admin/overview");
  return data;
}

export async function fetchAdminAnalytics(): Promise<AdminAnalyticsData> {
  const { data } = await api.get<AdminAnalyticsData>("/admin/analytics");
  return data;
}
