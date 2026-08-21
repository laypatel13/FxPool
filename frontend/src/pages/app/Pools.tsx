import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layers } from "lucide-react";
import DashboardShell from "../../components/layout/DashboardShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import ProgressBar from "../../components/ui/ProgressBar";
import Skeleton from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import { fetchOpenPools, fetchOpenPoolSettings } from "../../lib/services";
import { POOL_STATUS_META } from "../../lib/constants";
import { formatMoney, formatDate } from "../../lib/utils";
import type { Pool, PoolSettings } from "../../types";

export default function Pools() {
  const [pools, setPools] = useState<Pool[] | null>(null);
  const [settings, setSettings] = useState<PoolSettings | null>(null);

  useEffect(() => {
    fetchOpenPools().then(setPools);
    fetchOpenPoolSettings().then(setSettings);
  }, []);

  return (
    <DashboardShell>
      <h1 className="font-display text-[26px] text-ink">Pool marketplace</h1>
      <p className="mt-1 text-[13.5px] text-ink-muted">
        Every active pool across currencies and settlement windows. Your invoices join automatically by bucket.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pools === null &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-52" />)}

        {pools?.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3">
            <EmptyState icon={Layers} title="No pools open right now" description="Check back soon, or upload an invoice to start a new bucket." />
          </div>
        )}

        {pools?.map((pool) => {
          const meta = POOL_STATUS_META[pool.status];
          const target = settings?.min_pool_amount ?? 50000;
          const pct = Math.min(100, (pool.total_amount / target) * 100);
          return (
            <Link key={pool.id} to={`/app/pools/${pool.id}`}>
              <Card instrument className="h-full p-6 transition-colors hover:border-line-accent">
                <div className="flex items-center justify-between">
                  <p className="tnum text-[12px] text-ink-faint">{pool.id}</p>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>
                <p className="mt-3 text-[15px] font-medium text-ink">{pool.currency} forward</p>
                <p className="mt-1 text-[12.5px] text-ink-muted">
                  {formatDate(pool.bucket_start_date)} – {formatDate(pool.bucket_end_date)}
                </p>
                <p className="tnum mt-4 text-[22px] text-ink">{formatMoney(pool.total_amount, pool.currency)}</p>
                <ProgressBar value={pct} label={`Filled toward ${formatMoney(target, pool.currency)}`} className="mt-4" tone={pool.status === "collecting" ? "warn" : "accent"} />
                {pool.locked_rate && (
                  <p className="tnum mt-4 text-[12.5px] text-ink-muted">Locked at {pool.locked_rate.toFixed(2)}</p>
                )}
              </Card>
            </Link>
          );
        })}
      </div>
    </DashboardShell>
  );
}
