import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminShell from "../../components/layout/AdminShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import ProgressBar from "../../components/ui/ProgressBar";
import Select from "../../components/ui/Select";
import Skeleton from "../../components/ui/Skeleton";
import { fetchPools } from "../../lib/services";
import { POOL_STATUS_META } from "../../lib/constants";
import { formatMoney, formatDate, poolFillPct } from "../../lib/utils";
import type { Pool, PoolStatus } from "../../types";

const filters: { label: string; value: PoolStatus | "all" }[] = [
  { label: "All statuses", value: "all" },
  { label: "Collecting", value: "collecting" },
  { label: "Target reached", value: "target_reached" },
  { label: "Hedging", value: "hedging" },
  { label: "Hedged", value: "hedged" },
  { label: "Settled", value: "settled" },
];

export default function AdminPools() {
  const [pools, setPools] = useState<Pool[] | null>(null);
  const [status, setStatus] = useState<PoolStatus | "all">("all");

  useEffect(() => {
    fetchPools(status === "all" ? undefined : status).then(setPools);
  }, [status]);

  return (
    <AdminShell>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-[24px] text-ink">Platform pools</h1>
          <p className="mt-1 text-[13px] text-ink-muted">Read-only oversight. Banks create and hedge their own pools.</p>
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value as PoolStatus | "all")} className="w-48">
          {filters.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pools === null && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        {pools?.map((pool) => {
          const meta = POOL_STATUS_META[pool.status];
          const pct = poolFillPct(pool.total_amount, pool.target_amount, pool.maximum_amount);
          return (
            <Link key={pool.id} to={`/admin/pools/${pool.id}`}>
              <Card instrument className="h-full p-5 transition-colors hover:border-line-accent">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] text-ink-faint">{pool.name || pool.currency}</p>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>
                <p className="mt-3 text-[14.5px] font-medium text-ink">{pool.currency} · bank pool</p>
                <p className="mt-1 text-[12px] text-ink-muted">
                  {formatDate(pool.bucket_start_date)} – {formatDate(pool.bucket_end_date)}
                </p>
                <p className="tnum mt-4 text-[20px] text-ink">{formatMoney(pool.total_amount, pool.currency)}</p>
                <ProgressBar value={pct} className="mt-4" tone={pool.status === "collecting" ? "warn" : "accent"} />
              </Card>
            </Link>
          );
        })}
      </div>
    </AdminShell>
  );
}
