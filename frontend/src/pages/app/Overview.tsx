import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, ShieldCheck, Clock, Wallet, Plus, ArrowUpRight } from "lucide-react";
import DashboardShell from "../../components/layout/DashboardShell";
import StatCard from "../../components/ui/StatCard";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Skeleton from "../../components/ui/Skeleton";
import UploadInvoiceModal from "../../components/dashboard/UploadInvoiceModal";
import { fetchMyInvoices } from "../../lib/services";
import { INVOICE_STATUS_META } from "../../lib/constants";
import { formatMoney, formatDate, daysUntil } from "../../lib/utils";
import { useAuth } from "../../hooks/useAuth";
import type { Invoice } from "../../types";

export default function Overview() {
  const { profile } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    fetchMyInvoices().then(setInvoices);
  }, []);

  const kpis = useMemo(() => {
    if (!invoices) return null;
    const activeHedges = invoices.filter((i) => i.status === "locked").length;
    const upcoming = invoices.filter((i) => i.status === "locked" && daysUntil(i.due_date) <= 30 && daysUntil(i.due_date) >= 0).length;
    const hedged = invoices.filter((i) => i.status === "locked" || i.status === "settled").reduce((sum, i) => sum + i.amount, 0);
    const open = invoices.filter((i) => i.status === "pending_pool" || i.status === "pooled").reduce((sum, i) => sum + i.amount, 0);
    return { total: invoices.length, activeHedges, upcoming, hedged, open };
  }, [invoices]);

  const recent = invoices?.slice(0, 5) ?? [];

  return (
    <DashboardShell>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-[13px] text-ink-muted">Welcome back</p>
          <h1 className="mt-1 font-display text-[26px] text-ink">{profile?.company_name ?? "Your dashboard"}</h1>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus size={16} /> Upload invoice
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis ? (
          <>
            <StatCard label="Total invoices" value={String(kpis.total)} icon={FileText} hint="all time" />
            <StatCard label="Active hedges" value={String(kpis.activeHedges)} icon={ShieldCheck} hint="currently locked" />
            <StatCard label="Due within 30 days" value={String(kpis.upcoming)} icon={Clock} hint="settlements" />
            <StatCard label="Total hedged" value={formatMoney(kpis.hedged)} icon={Wallet} hint="locked + settled" />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[122px]" />)
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-[14.5px] font-medium text-ink">Recent invoices</p>
            <Link to="/app/invoices" className="flex items-center gap-1 text-[12.5px] text-accent hover:underline">
              View all <ArrowUpRight size={13} />
            </Link>
          </div>
          <div className="mt-5 divide-y divide-line">
            {invoices === null &&
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="my-2 h-12" />)}
            {invoices?.length === 0 && <p className="py-8 text-center text-[13px] text-ink-muted">No invoices yet.</p>}
            {recent.map((inv) => {
              const meta = INVOICE_STATUS_META[inv.status];
              return (
                <Link
                  key={inv.id}
                  to={`/app/invoices/${inv.id}`}
                  className="flex items-center justify-between py-3.5 transition-colors hover:bg-surface-2/40 -mx-2 px-2 rounded-lg"
                >
                  <div>
                    <p className="text-[13.5px] text-ink">
                      {formatMoney(inv.amount, inv.currency)} <span className="text-ink-faint">· {inv.currency}</span>
                    </p>
                    <p className="mt-0.5 text-[12px] text-ink-faint">Due {formatDate(inv.due_date)}</p>
                  </div>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card instrument className="p-6">
          <p className="text-[14.5px] font-medium text-ink">Open exposure</p>
          <p className="mt-1 text-[12.5px] text-ink-muted">Invoices not yet hedged</p>
          <p className="tnum mt-6 text-[30px] text-ink">{kpis ? formatMoney(kpis.open) : "—"}</p>
          <p className="mt-1 text-[12px] text-ink-faint">across pending &amp; pooling invoices</p>
          <Link to="/app/pools">
            <Button variant="secondary" size="sm" className="mt-6 w-full">
              View pool marketplace
            </Button>
          </Link>
        </Card>
      </div>

      <UploadInvoiceModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onCreated={(inv) => setInvoices((prev) => (prev ? [inv, ...prev] : [inv]))}
      />
    </DashboardShell>
  );
}
