import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import DashboardShell from "../../components/DashboardShell";
import Card from "../../../components/ui/Card";
import Badge from "../../../components/ui/Badge";
import Skeleton from "../../../components/ui/Skeleton";
import Timeline from "../../../components/ui/Timeline";
import { fetchInvoice, confirmInvoice } from "../../../lib/services";
import { INVOICE_STATUS_META, SETTLEMENT_STEPS } from "../../../lib/constants";
import { formatMoney, formatRate, formatDate, formatDateTime } from "../../../lib/utils";
import type { Invoice } from "../../../types";

const statusToStepIndex: Record<Invoice["status"], number> = {
  pending_pool: 1,
  pooled: 2,
  locked: 3,
  settled: 5,
};

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchInvoice(id).then(setInvoice);
  }, [id]);

  const handleConfirm = async () => {
    if (!id) return;
    setConfirming(true);
    try {
      const updated = await confirmInvoice(id);
      setInvoice(updated);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <DashboardShell>
      <Link to="/app/invoices" className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink">
        <ChevronLeft size={15} /> Back to invoices
      </Link>

      {invoice === undefined ? (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      ) : invoice === null ? (
        <p className="mt-8 text-[14px] text-ink-muted">Invoice not found.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="tnum text-[12px] text-ink-faint">{invoice.id}</p>
              <h1 className="mt-1 font-display text-[26px] text-ink">
                {formatMoney(invoice.amount, invoice.currency)} · {invoice.currency}
              </h1>
            </div>
            <Badge tone={INVOICE_STATUS_META[invoice.status].tone}>{INVOICE_STATUS_META[invoice.status].label}</Badge>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card instrument className="p-6 lg:col-span-2">
              <p className="text-[14.5px] font-medium text-ink">Contract terms</p>
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {[
                  ["Due date", formatDate(invoice.due_date)],
                  ["Indicative rate", formatRate(invoice.indicative_rate)],
                  ["Locked rate", formatRate(invoice.locked_rate)],
                  ["Pool", invoice.pool_id ?? "Not yet assigned"],
                  ["Payout", invoice.payout_amount ? formatMoney(invoice.payout_amount, "INR") : "—"],
                  ["Submitted", formatDate(invoice.created_at)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-line bg-base/60 px-4 py-3">
                    <p className="text-[11px] text-ink-faint">{label}</p>
                    <p className="tnum mt-1 text-[14px] text-ink">{value}</p>
                  </div>
                ))}
              </div>

              {!invoice.exporter_confirmed && invoice.status !== "settled" && invoice.status !== "locked" && (
                <div className="mt-6 rounded-xl border border-accent/20 bg-accent-soft p-5 text-center">
                  <h3 className="text-[14px] font-medium text-accent">Ready to lock at the indicative rate?</h3>
                  <p className="mt-1 text-[13px] text-accent/80">
                    Your invoice has been processed and priced by our AI agents. Confirm now to proceed to funding.
                  </p>
                  <button
                    onClick={handleConfirm}
                    disabled={confirming}
                    className="mt-4 rounded-full bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
                  >
                    {confirming ? "Confirming..." : "Confirm & Lock"}
                  </button>
                </div>
              )}

              {invoice.pool_id && invoice.exporter_confirmed && (
                <Link
                  to={`/app/pools/${invoice.pool_id}`}
                  className="mt-5 inline-block text-[13px] text-accent hover:underline"
                >
                  View pool {invoice.pool_id} →
                </Link>
              )}
            </Card>

            <Card className="p-6">
              <p className="text-[14.5px] font-medium text-ink">Settlement progress</p>
              <div className="mt-5">
                <Timeline
                  steps={SETTLEMENT_STEPS.map((s, i) => ({
                    key: s.key,
                    label: s.label,
                    timestamp: i === 0 ? formatDateTime(invoice.created_at) : undefined,
                  }))}
                  currentIndex={statusToStepIndex[invoice.status]}
                />
              </div>
            </Card>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
