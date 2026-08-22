import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import BankShell from "../../components/layout/BankShell";
import Card from "../../components/ui/Card";
import Skeleton from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import Badge from "../../components/ui/Badge";
import { fetchBankExporters } from "../../lib/services";
import { formatMoney, initials } from "../../lib/utils";
import type { ExporterSummary } from "../../types";

export default function BankExporters() {
  const [rows, setRows] = useState<ExporterSummary[] | null>(null);

  useEffect(() => {
    fetchBankExporters().then(setRows);
  }, []);

  return (
    <BankShell>
      <h1 className="font-display text-[24px] text-ink">My exporters</h1>
      <p className="mt-1 text-[13px] text-ink-muted">Exporters with an active relationship to this bank.</p>

      <Card className="mt-6 overflow-hidden">
        {rows === null ? (
          <div className="space-y-3 p-6">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Users} title="No exporters yet" description="Share an exporter invitation code from Settings." />
          </div>
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-ink-faint">
                <th className="px-6 py-3.5 font-normal">Exporter</th>
                <th className="px-6 py-3.5 font-normal">Status</th>
                <th className="px-6 py-3.5 font-normal">Invoices</th>
                <th className="px-6 py-3.5 font-normal">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((e) => (
                <tr key={e.id}>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-[10.5px] text-ink">
                        {initials(e.full_name || "?")}
                      </span>
                      <div>
                        <p className="text-ink">{e.full_name}</p>
                        {e.company_name && <p className="text-[11.5px] text-ink-faint">{e.company_name}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <Badge tone="up">{e.status ?? "active"}</Badge>
                  </td>
                  <td className="tnum px-6 py-3.5 text-ink-muted">{e.invoice_count}</td>
                  <td className="tnum px-6 py-3.5 text-ink">{formatMoney(e.total_volume)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </BankShell>
  );
}
