import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardShell from "../../components/layout/DashboardShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Skeleton from "../../components/ui/Skeleton";
import { fetchMyInvoices } from "../../lib/services";
import { INVOICE_STATUS_META } from "../../lib/constants";
import { formatMoney, formatDate, formatRate } from "../../lib/utils";
import type { Invoice } from "../../types";

export default function History() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);

  useEffect(() => {
    fetchMyInvoices().then(setInvoices);
  }, []);

  return (
    <DashboardShell>
      <h1 className="font-display text-[26px] text-ink">Transaction history</h1>
      <p className="mt-1 text-[13.5px] text-ink-muted">A complete ledger of every invoice and its hedge outcome.</p>

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
                  <th className="px-6 py-3.5 font-normal">Submitted</th>
                  <th className="px-6 py-3.5 font-normal">Amount</th>
                  <th className="px-6 py-3.5 font-normal">Locked rate</th>
                  <th className="px-6 py-3.5 font-normal">Payout (₹)</th>
                  <th className="px-6 py-3.5 font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {invoices.map((inv) => {
                  const meta = INVOICE_STATUS_META[inv.status];
                  return (
                    <tr key={inv.id} className="transition-colors hover:bg-surface-2/40">
                      <td className="px-6 py-3.5">
                        <Link to={`/app/invoices/${inv.id}`} className="tnum text-ink hover:text-accent">
                          {inv.id}
                        </Link>
                      </td>
                      <td className="tnum px-6 py-3.5 text-ink-muted">{formatDate(inv.created_at)}</td>
                      <td className="tnum px-6 py-3.5 text-ink">{formatMoney(inv.amount, inv.currency)}</td>
                      <td className="tnum px-6 py-3.5 text-ink-muted">{formatRate(inv.locked_rate)}</td>
                      <td className="tnum px-6 py-3.5 text-ink-muted">
                        {inv.payout_amount ? inv.payout_amount.toLocaleString("en-IN") : "—"}
                      </td>
                      <td className="px-6 py-3.5">
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
    </DashboardShell>
  );
}
