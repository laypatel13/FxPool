import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import DashboardShell from "../../components/layout/DashboardShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import ProgressBar from "../../components/ui/ProgressBar";
import Skeleton from "../../components/ui/Skeleton";
import { fetchMyPoolDetail } from "../../lib/services";
import { POOL_STATUS_META } from "../../lib/constants";
import { formatMoney, formatDate, formatDateTime, poolFillPct } from "../../lib/utils";
import type { PoolDetail as PoolDetailType } from "../../types";

export default function HedgeDetail() {
  const { id } = useParams<{ id: string }>();
  const [pool, setPool] = useState<PoolDetailType | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchMyPoolDetail(id).then(setPool);
  }, [id]);

  return (
    <DashboardShell>
      <Link to="/app/pools" className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink">
        <ChevronLeft size={15} /> Back to eligible pools
      </Link>

      {!pool ? (
        <Skeleton className="mt-6 h-96" />
      ) : (
        <>
          <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="tnum text-[12px] text-ink-faint">{pool.id}</p>
                  <h1 className="mt-1 font-display text-[26px] text-ink">{pool.name || `${pool.currency} pool`}</h1>
              <p className="mt-1 text-[13px] text-ink-muted">
                {formatDate(pool.bucket_start_date)} – {formatDate(pool.bucket_end_date)} · {pool.bucket_width_days}-day window
              </p>
            </div>
            <Badge tone={POOL_STATUS_META[pool.status].tone}>{POOL_STATUS_META[pool.status].label}</Badge>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card instrument className="p-6 lg:col-span-2">
              <div className="flex items-center justify-between">
                <p className="text-[14.5px] font-medium text-ink">Your invoices in this pool</p>
                <p className="tnum text-[12.5px] text-ink-faint">{pool.invoices.length} invoice{pool.invoices.length === 1 ? "" : "s"}</p>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-line text-ink-faint">
                      <th className="py-2.5 font-normal">Invoice</th>
                      <th className="py-2.5 font-normal">Amount</th>
                      <th className="py-2.5 font-normal">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {pool.invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="tnum py-3 text-ink-muted">{inv.id}</td>
                        <td className="tnum py-3 text-ink">{formatMoney(inv.amount, inv.currency)}</td>
                        <td className="tnum py-3 text-ink-muted">{(inv.locked_rate ?? inv.indicative_rate ?? 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="p-6">
                <p className="text-[14.5px] font-medium text-ink">Pool progress</p>
                <p className="tnum mt-4 text-[24px] text-ink">{formatMoney(pool.total_amount, pool.currency)}</p>
                <ProgressBar
                  value={poolFillPct(pool.total_amount, pool.target_amount, pool.maximum_amount)}
                  label={`toward ${formatMoney(pool.target_amount || pool.maximum_amount || 0, pool.currency)} target`}
                  className="mt-3"
                  tone={pool.status === "collecting" ? "warn" : "accent"}
                />
              </Card>

              <Card className="p-6">
                <p className="text-[14.5px] font-medium text-ink">Contract</p>
                <div className="mt-4 space-y-3 text-[13px]">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Locked rate</span>
                    <span className="tnum text-ink">{pool.locked_rate ? pool.locked_rate.toFixed(2) : "Not yet locked"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Executed</span>
                    <span className="tnum text-ink">{pool.executed_at ? formatDateTime(pool.executed_at) : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Settled</span>
                    <span className="tnum text-ink">{pool.settled_at ? formatDateTime(pool.settled_at) : "—"}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
