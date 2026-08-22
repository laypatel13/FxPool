import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import DashboardShell from "../../components/layout/DashboardShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Skeleton from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import { fetchMyInvoices } from "../../lib/services";
import { formatMoney, formatDate, daysUntil } from "../../lib/utils";
import type { Invoice } from "../../types";

export default function Settlements() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);

  useEffect(() => {
    fetchMyInvoices().then(setInvoices);
  }, []);

  const { upcoming, completed } = useMemo(() => {
    const all = invoices ?? [];
    return {
      upcoming: all.filter((i) => i.status === "locked").sort((a, b) => daysUntil(a.due_date) - daysUntil(b.due_date)),
      completed: all.filter((i) => i.status === "settled"),
    };
  }, [invoices]);

  return (
    <DashboardShell>
      <h1 className="font-display text-[26px] text-ink">Settlements</h1>
      <p className="mt-1 text-[13.5px] text-ink-muted">Upcoming and completed settlement dates for your hedges.</p>

      <div className="mt-8">
        <p className="text-[13px] uppercase tracking-wide text-ink-faint">Upcoming</p>
        <div className="mt-4 space-y-3">
          {invoices === null && Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          {invoices && upcoming.length === 0 && (
            <EmptyState icon={Clock} title="No upcoming settlements" description="Locked hedges awaiting settlement will appear here." />
          )}
          {upcoming.map((inv) => {
            const d = daysUntil(inv.due_date);
            return (
              <Link key={inv.id} to={`/app/invoices/${inv.id}`}>
                <Card instrument className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-[14px] text-ink">{formatMoney(inv.amount, inv.currency)}</p>
                    <p className="tnum mt-0.5 text-[12px] text-ink-faint">Settles {formatDate(inv.due_date)}</p>
                  </div>
                  <Badge tone={d <= 7 ? "warn" : "accent"}>{d <= 0 ? "Due now" : `In ${d} days`}</Badge>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-10">
        <p className="text-[13px] uppercase tracking-wide text-ink-faint">Completed</p>
        <div className="mt-4 space-y-3">
          {completed.map((inv) => (
            <Link key={inv.id} to={`/app/invoices/${inv.id}`}>
              <Card className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[14px] text-ink">{formatMoney(inv.amount, inv.currency)}</p>
                  <p className="tnum mt-0.5 text-[12px] text-ink-faint">Settled {formatDate(inv.due_date)}</p>
                </div>
                <p className="tnum text-[13.5px] text-ink">{inv.payout_amount ? formatMoney(inv.payout_amount, "INR") : "—"}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
