import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Layers, FileSearch, CheckCircle2 } from "lucide-react";
import AdminShell from "../components/AdminShell";
import StatCard from "../../../components/ui/StatCard";
import Card from "../../../components/ui/Card";
import Badge from "../../../components/ui/Badge";
import Skeleton from "../../../components/ui/Skeleton";
import { fetchAdminOverviewStats, fetchPools, fetchAllInvoices } from "../../../lib/services";
import { POOL_STATUS_META, INVOICE_STATUS_META } from "../../../lib/constants";
import { formatMoney, formatDate } from "../../../lib/utils";
import type { Pool, Invoice } from "../../../types";

export default function AdminOverview() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchAdminOverviewStats>> | null>(null);
  const [pools, setPools] = useState<Pool[] | null>(null);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);

  useEffect(() => {
    fetchAdminOverviewStats().then(setStats);
    fetchPools().then(setPools);
    fetchAllInvoices("pending_pool").then(setInvoices);
  }, []);

  return (
    <AdminShell>
      <h1 className="font-display text-[24px] text-ink">Treasury overview</h1>
      <p className="mt-1 text-[13px] text-ink-muted">Platform-wide pooling and settlement activity.</p>

      <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats ? (
          <>
            <StatCard label="Exporters onboarded" value={String(stats.total_exporters)} icon={Users} hint="all time" />
            <StatCard label="Active pools" value={String(stats.active_pools)} icon={Layers} hint="currently collecting" />
            <StatCard label="Pending approvals" value={String(stats.pending_approvals)} icon={FileSearch} hint="pools ready to execute" />
            <StatCard label="Contracts executed" value={String(stats.contracts_executed)} icon={CheckCircle2} hint="all time" />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[122px]" />)
        )}
      </div>

      <div className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-[13.5px] font-medium text-ink">Pools nearing execution</p>
            <Link to="/admin/pools" className="text-[12px] text-accent hover:underline">
              Manage pools
            </Link>
          </div>
          <div className="mt-4 divide-y divide-line">
            {pools === null && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="my-2 h-11" />)}
            {pools
              ?.filter((p) => p.status !== "settled")
              .map((pool) => (
                <Link
                  key={pool.id}
                  to={`/admin/pools/${pool.id}`}
                  className="-mx-2 flex items-center justify-between rounded-lg px-2 py-3 transition-colors hover:bg-surface-2/40"
                >
                  <div>
                    <p className="tnum text-[13px] text-ink">{pool.id}</p>
                    <p className="text-[11.5px] text-ink-faint">
                      {pool.currency} · {formatDate(pool.bucket_end_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tnum text-[12.5px] text-ink-muted">{formatMoney(pool.total_amount, pool.currency)}</span>
                    <Badge tone={POOL_STATUS_META[pool.status].tone}>{POOL_STATUS_META[pool.status].label}</Badge>
                  </div>
                </Link>
              ))}
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-[13.5px] font-medium text-ink">Awaiting review</p>
          <div className="mt-4 space-y-3">
            {invoices === null && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-11" />)}
            {invoices?.length === 0 && <p className="text-[12.5px] text-ink-faint">Nothing pending review.</p>}
            {invoices?.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between text-[12.5px]">
                <span className="tnum text-ink-muted">{inv.id}</span>
                <div className="flex items-center gap-2">
                  <span className="tnum text-ink">{formatMoney(inv.amount, inv.currency)}</span>
                  <Badge tone={INVOICE_STATUS_META[inv.status].tone}>{INVOICE_STATUS_META[inv.status].label}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
