import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import AdminShell from "../../components/layout/AdminShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import ProgressBar from "../../components/ui/ProgressBar";
import Skeleton from "../../components/ui/Skeleton";
import { fetchPoolDetail } from "../../lib/services";
import { POOL_STATUS_META } from "../../lib/constants";
import { formatMoney, formatDate, formatDateTime, poolFillPct } from "../../lib/utils";
import type { PoolDetail } from "../../types";

const getComplianceTone = (status?: string | null) => {
  if (status === "approved") return "up";
  if (status === "flagged") return "warn";
  if (status === "rejected") return "down";
  return "muted";
};

const getRiskTone = (score?: number | null) => {
  if (score === null || score === undefined) return "muted";
  if (score < 40) return "up";
  if (score < 75) return "warn";
  return "down";
};

export default function AdminPoolDetail() {
  const { id } = useParams<{ id: string }>();
  const [pool, setPool] = useState<PoolDetail | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchPoolDetail(id).then(setPool);
  }, [id]);

  return (
    <AdminShell>
      <Link to="/admin/pools" className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink">
        <ChevronLeft size={15} /> Back to pools
      </Link>

      {!pool ? (
        <Skeleton className="mt-6 h-96" />
      ) : (
        <>
          <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="tnum text-[12px] text-ink-faint">{pool.id}</p>
              <h1 className="mt-1 font-display text-[24px] text-ink">{pool.name || `${pool.currency} pool`}</h1>
              <p className="mt-1 text-[13px] text-ink-muted">
                {formatDate(pool.bucket_start_date)} – {formatDate(pool.bucket_end_date)} · platform inspect only
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={POOL_STATUS_META[pool.status].tone}>{POOL_STATUS_META[pool.status].label}</Badge>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card className="p-6 lg:col-span-2">
              <p className="text-[13.5px] font-medium text-ink">Members</p>
              <table className="mt-4 w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-ink-faint">
                    <th className="py-2.5 font-normal">Invoice</th>
                    <th className="py-2.5 font-normal">Exporter</th>
                    <th className="py-2.5 font-normal">Amount</th>
                    <th className="py-2.5 font-normal">Risk</th>
                    <th className="py-2.5 font-normal">Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pool.invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="tnum py-3 text-ink">{inv.id}</td>
                      <td className="py-3 text-ink-muted">
                        {inv.exporter_name ?? inv.exporter_id}
                        {!inv.exporter_confirmed && (
                          <span className="ml-2 inline-block rounded border border-signal-warn/30 bg-signal-warn/10 px-1 py-0.5 text-[10px] text-signal-warn uppercase tracking-wide">
                            Unconfirmed
                          </span>
                        )}
                      </td>
                      <td className="tnum py-3 text-ink">{formatMoney(inv.amount, inv.currency)}</td>
                      <td className="py-3">
                        {inv.risk_score != null ? (
                          <Badge tone={getRiskTone(inv.risk_score)}>{inv.risk_score.toFixed(0)}</Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3">
                        {inv.compliance_status ? (
                          <Badge tone={getComplianceTone(inv.compliance_status)}>{inv.compliance_status}</Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <div className="space-y-5">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <p className="text-[13.5px] font-medium text-ink">AI Assessment</p>
                  <Badge tone="accent">BETA</Badge>
                </div>
                <div className="mt-4 space-y-4 text-[13px]">
                  <div>
                    <div className="flex items-center justify-between text-ink-muted mb-1.5">
                      <span>Pool Risk Score</span>
                      <span className="font-medium text-ink">{pool.risk_score != null ? pool.risk_score.toFixed(0) : "—"}</span>
                    </div>
                    {pool.risk_score != null && (
                      <ProgressBar
                        value={pool.risk_score}
                        tone={getRiskTone(pool.risk_score) as "up" | "warn" | "down" | "accent"}
                        className="mt-1"
                      />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-ink-muted">
                      <span>Compliance Status</span>
                      {pool.compliance_status ? (
                        <Badge tone={getComplianceTone(pool.compliance_status)}>{pool.compliance_status}</Badge>
                      ) : (
                        <span className="text-ink">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <p className="text-[13.5px] font-medium text-ink">Fill progress</p>
                <p className="tnum mt-3 text-[22px] text-ink">{formatMoney(pool.total_amount, pool.currency)}</p>
                <ProgressBar
                  value={poolFillPct(pool.total_amount, pool.target_amount, pool.maximum_amount)}
                  label={`toward ${formatMoney(pool.target_amount || pool.maximum_amount || 0, pool.currency)} target`}
                  className="mt-3"
                  tone={pool.status === "collecting" ? "warn" : "accent"}
                />
              </Card>
              <Card className="p-6">
                <p className="text-[13.5px] font-medium text-ink">Contract log</p>
                <div className="mt-4 space-y-3 text-[12.5px]">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Locked rate</span>
                    <span className="tnum text-ink">{pool.locked_rate ? pool.locked_rate.toFixed(2) : "—"}</span>
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
    </AdminShell>
  );
}
