import { useEffect, useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import AdminShell from "../../components/layout/AdminShell";
import Card from "../../components/ui/Card";
import Skeleton from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import { fetchExporters } from "../../lib/services";
import { formatMoney, initials } from "../../lib/utils";
import type { ExporterSummary } from "../../types";

export default function AdminUsers() {
  const [exporters, setExporters] = useState<ExporterSummary[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchExporters().then(setExporters);
  }, []);

  const filtered = useMemo(() => {
    if (!exporters) return [];
    const q = query.toLowerCase();
    return exporters.filter(
      (e) => e.full_name.toLowerCase().includes(q) || (e.company_name ?? "").toLowerCase().includes(q)
    );
  }, [exporters, query]);

  return (
    <AdminShell>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-[24px] text-ink">Exporters</h1>
          <p className="mt-1 text-[13px] text-ink-muted">Every exporter onboarded to FxPool.</p>
        </div>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exporters"
            className="w-64 rounded-xl border border-line-strong bg-surface-1 py-2.5 pl-10 pr-4 text-[13px] text-ink placeholder:text-ink-faint focus:border-accent/60 focus:outline-none"
          />
        </div>
      </div>

      <Card className="mt-6 overflow-hidden">
        {exporters === null ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Users} title="No exporters yet" description="Exporters appear here once they create an account." />
          </div>
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-ink-faint">
                <th className="px-6 py-3.5 font-normal">Exporter</th>
                <th className="px-6 py-3.5 font-normal">Invoices</th>
                <th className="px-6 py-3.5 font-normal">Total volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((e) => (
                <tr key={e.id} className="transition-colors hover:bg-surface-2/40">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-[10.5px] text-ink">
                        {initials(e.full_name)}
                      </span>
                      <div>
                        <p className="text-ink">{e.full_name}</p>
                        {e.company_name && <p className="text-[11.5px] text-ink-faint">{e.company_name}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="tnum px-6 py-3.5 text-ink-muted">{e.invoice_count}</td>
                  <td className="tnum px-6 py-3.5 text-ink">{formatMoney(e.total_volume)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </AdminShell>
  );
}
