import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminShell from "../../components/AdminShell";
import Card from "../../../components/ui/Card";
import Badge from "../../../components/ui/Badge";
import ProgressBar from "../../../components/ui/ProgressBar";
import Select from "../../../components/ui/Select";
import Skeleton from "../../../components/ui/Skeleton";
import { fetchPools, fetchPoolSettings } from "../../../lib/services";
import { POOL_STATUS_META } from "../../../lib/constants";
import { formatMoney, formatDate } from "../../../lib/utils";
import type { Pool, PoolStatus, PoolSettings } from "../../../types";

const filters: { label: string; value: PoolStatus | "all" }[] = [
  { label: "All statuses", value: "all" },
  { label: "Collecting", value: "collecting" },
  { label: "Ready to execute", value: "suggested" },
  { label: "Executed", value: "locked" },
  { label: "Settled", value: "settled" },
];

export default function AdminPools() {
  const [pools, setPools] = useState<Pool[] | null>(null);
  const [settings, setSettings] = useState<PoolSettings | null>(null);
  const [status, setStatus] = useState<PoolStatus | "all">("all");

  useEffect(() => {
    fetchPools(status === "all" ? undefined : status).then(setPools);
    fetchPoolSettings().then(setSettings);
  }, [status]);

  return (
    <AdminShell>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-[24px] text-ink">Pools & contracts</h1>
          <p className="mt-1 text-[13px] text-ink-muted">Forward contract pools across every currency bucket.</p>
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
          const target = settings?.min_pool_amount ?? 50000;
          const pct = Math.min(100, (pool.total_amount / target) * 100);
          return (
            <Link key={pool.id} to={`/admin/pools/${pool.id}`}>
              <Card instrument className="h-full p-5 transition-colors hover:border-line-accent">
                <div className="flex items-center justify-between">
                  <p className="tnum text-[12px] text-ink-faint">{pool.id}</p>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>
                <p className="mt-3 text-[14.5px] font-medium text-ink">{pool.currency} forward</p>
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
