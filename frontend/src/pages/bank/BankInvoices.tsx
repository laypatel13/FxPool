import { useEffect, useState } from "react";
import BankShell from "../../components/layout/BankShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Skeleton from "../../components/ui/Skeleton";
import { fetchBankInvoices } from "../../lib/services";
import { INVOICE_STATUS_META } from "../../lib/constants";
import { formatMoney, formatDate } from "../../lib/utils";
import type { Invoice } from "../../types";

export default function BankInvoices() {
  const [rows, setRows] = useState<Invoice[] | null>(null);

  useEffect(() => {
    fetchBankInvoices().then(setRows);
  }, []);

  return (
    <BankShell>
      <h1 className="font-display text-[24px] text-ink">Bank invoices</h1>
      <p className="mt-1 text-[13px] text-ink-muted">FX exposure submitted by your exporters only.</p>

      <Card className="mt-6 overflow-hidden">
        {rows === null ? (
          <div className="space-y-3 p-6">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-ink-faint">
                <th className="px-6 py-3.5 font-normal">Invoice</th>
                <th className="px-6 py-3.5 font-normal">Exporter</th>
                <th className="px-6 py-3.5 font-normal">Amount</th>
                <th className="px-6 py-3.5 font-normal">Due</th>
                <th className="px-6 py-3.5 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((inv) => (
                <tr key={inv.id}>
                  <td className="tnum px-6 py-3.5 text-ink">{inv.invoice_number || inv.id.slice(0, 8)}</td>
                  <td className="px-6 py-3.5 text-ink-muted">{inv.exporter_name ?? "—"}</td>
                  <td className="tnum px-6 py-3.5 text-ink">{formatMoney(inv.amount, inv.currency)}</td>
                  <td className="tnum px-6 py-3.5 text-ink-muted">{formatDate(inv.due_date)}</td>
                  <td className="px-6 py-3.5">
                    <Badge tone={INVOICE_STATUS_META[inv.status].tone}>{INVOICE_STATUS_META[inv.status].label}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </BankShell>
  );
}
