import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import { fetchAllInvoices } from "../../lib/services";
import { INVOICE_STATUS_META } from "../../lib/constants";
import { formatMoney, formatDate } from "../../lib/utils";
import type { Invoice, InvoiceStatus } from "../../types";

const filters: { label: string; value: InvoiceStatus | "all" }[] = [
  { label: "All statuses", value: "all" },
  { label: "Under review", value: "pending_pool" },
  { label: "Pooling", value: "pooled" },
  { label: "Hedged", value: "locked" },
  { label: "Settled", value: "settled" },
];

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [status, setStatus] = useState<InvoiceStatus | "all">("all");

  useEffect(() => {
    fetchAllInvoices(status === "all" ? undefined : status).then(setInvoices);
  }, [status]);

  const summary = useMemo(() => {
    if (!invoices) return null;
    return { count: invoices.length, volume: invoices.reduce((s, i) => s + i.amount, 0) };
  }, [invoices]);

  return (
    <AdminShell>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-[24px] text-ink">Invoice review</h1>
          <p className="mt-1 text-[13px] text-ink-muted">
            {summary ? `${summary.count} invoices · ${formatMoney(summary.volume)} total` : "All submitted invoices"}
          </p>
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus | "all")} className="w-48">
          {filters.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
      </div>

      <Card className="mt-6 overflow-hidden">
        {invoices === null ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-ink-faint">
                  <th className="px-6 py-3.5 font-normal">Invoice</th>
                  <th className="px-6 py-3.5 font-normal">Exporter</th>
                  <th className="px-6 py-3.5 font-normal">Amount</th>
                  <th className="px-6 py-3.5 font-normal">Due date</th>
                  <th className="px-6 py-3.5 font-normal">Pool</th>
                  <th className="px-6 py-3.5 font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="transition-colors hover:bg-surface-2/40">
                    <td className="tnum px-6 py-3.5 text-ink">{inv.id}</td>
                    <td className="px-6 py-3.5 text-ink-muted">{inv.exporter_name ?? inv.exporter_id}</td>
                    <td className="tnum px-6 py-3.5 text-ink">{formatMoney(inv.amount, inv.currency)}</td>
                    <td className="tnum px-6 py-3.5 text-ink-muted">{formatDate(inv.due_date)}</td>
                    <td className="tnum px-6 py-3.5 text-ink-muted">{inv.pool_id ?? "—"}</td>
                    <td className="px-6 py-3.5">
                      <Badge tone={INVOICE_STATUS_META[inv.status].tone}>{INVOICE_STATUS_META[inv.status].label}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AdminShell>
  );
}
