import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layers } from "lucide-react";
import DashboardShell from "../../components/layout/DashboardShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import ProgressBar from "../../components/ui/ProgressBar";
import Skeleton from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import { fetchOpenPools } from "../../lib/services";
import { POOL_STATUS_META } from "../../lib/constants";
import { formatMoney, formatDate, poolFillPct } from "../../lib/utils";
import type { Pool } from "../../types";

export default function Pools() {
  const [pools, setPools] = useState<Pool[] | null>(null);

  useEffect(() => {
    fetchOpenPools().then(setPools);
  }, []);

  return (
    <DashboardShell>
      <h1 className="font-display text-[26px] text-ink">Eligible pools</h1>
      <p className="mt-1 text-[13.5px] text-ink-muted">
        Pools owned by your bank only. Upload an invoice to get an AI recommendation among these windows.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pools === null && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-52" />)}

        {pools?.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3">
            <EmptyState icon={Layers} title="No eligible pools" description="Your bank has no open windows that you can join right now." />
          </div>
        )}

        {pools?.map((pool) => {
          const meta = POOL_STATUS_META[pool.status];
          const cap = pool.maximum_amount || pool.target_amount || 0;
          const pct = poolFillPct(pool.total_amount, pool.target_amount, pool.maximum_amount);
          return (
            <Link key={pool.id} to={`/app/pools/${pool.id}`}>
              <Card instrument className="h-full p-6 transition-colors hover:border-line-accent">
                <div className="flex items-center justify-between">
                  <p className="text-[15px] font-medium text-ink">{pool.name || `${pool.currency} pool`}</p>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>
                <p className="mt-1 text-[12.5px] text-ink-muted">
                  {formatDate(pool.bucket_start_date)} – {formatDate(pool.bucket_end_date)}
                </p>
                <p className="tnum mt-4 text-[22px] text-ink">
                  {formatMoney(pool.total_amount, pool.currency)}
                  <span className="text-[13px] text-ink-faint"> / {formatMoney(cap, pool.currency)}</span>
                </p>
                <ProgressBar value={pct} label="Utilization vs target" className="mt-4" tone={pool.status === "collecting" ? "warn" : "accent"} />
              </Card>
            </Link>
          );
        })}
      </div>
    </DashboardShell>
  );
}
