import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, FileText } from "lucide-react";
import DashboardShell from "../components/DashboardShell";
import Card from "../../../components/ui/Card";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import Select from "../../../components/ui/Select";
import Skeleton from "../../../components/ui/Skeleton";
import EmptyState from "../../../components/ui/EmptyState";
import UploadInvoiceModal from "../components/UploadInvoiceModal";
import { fetchMyInvoices } from "../../../lib/services";
import { INVOICE_STATUS_META } from "../../../lib/constants";
import { formatMoney, formatDate, formatRate } from "../../../lib/utils";
import type { Invoice, InvoiceStatus } from "../../../types";

const filters: { label: string; value: InvoiceStatus | "all" }[] = [
  { label: "All statuses", value: "all" },
  { label: "Under review", value: "pending_pool" },
  { label: "Pooling", value: "pooled" },
  { label: "Hedged", value: "locked" },
  { label: "Settled", value: "settled" },
];

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [status, setStatus] = useState<InvoiceStatus | "all">("all");
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    fetchMyInvoices().then(setInvoices);
  }, []);

  const filtered = useMemo(() => {
    if (!invoices) return [];
    return status === "all" ? invoices : invoices.filter((i) => i.status === status);
  }, [invoices, status]);

  return (
    <DashboardShell>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-[26px] text-ink">Invoices</h1>
          <p className="mt-1 text-[13.5px] text-ink-muted">Every invoice you've submitted for hedging.</p>
        </div>
        <div className="flex gap-3">
          <Select value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus | "all")} className="w-44">
            {filters.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
          <Button onClick={() => setUploadOpen(true)}>
            <Plus size={16} /> Upload
          </Button>
        </div>
      </div>

      <Card className="mt-6 overflow-hidden">
        {invoices === null ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={FileText}
              title="No invoices found"
              description="Try a different filter, or upload a new invoice to get an indicative rate."
              action={
                <Button size="sm" onClick={() => setUploadOpen(true)}>
                  Upload invoice
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-line text-ink-faint">
                  <th className="px-6 py-3.5 font-normal">Invoice</th>
                  <th className="px-6 py-3.5 font-normal">Amount</th>
                  <th className="px-6 py-3.5 font-normal">Due date</th>
                  <th className="px-6 py-3.5 font-normal">Rate</th>
                  <th className="px-6 py-3.5 font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((inv) => {
                  const meta = INVOICE_STATUS_META[inv.status];
                  return (
                    <tr key={inv.id} className="transition-colors hover:bg-surface-2/40">
                      <td className="px-6 py-4">
                        <Link to={`/app/invoices/${inv.id}`} className="tnum text-ink hover:text-accent">
                          {inv.id}
                        </Link>
                      </td>
                      <td className="tnum px-6 py-4 text-ink">{formatMoney(inv.amount, inv.currency)}</td>
                      <td className="tnum px-6 py-4 text-ink-muted">{formatDate(inv.due_date)}</td>
                      <td className="tnum px-6 py-4 text-ink-muted">{formatRate(inv.locked_rate ?? inv.indicative_rate)}</td>
                      <td className="px-6 py-4">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <UploadInvoiceModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onCreated={(inv) => setInvoices((prev) => (prev ? [inv, ...prev] : [inv]))}
      />
    </DashboardShell>
  );
}
