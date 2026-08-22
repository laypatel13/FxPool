import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Layers } from "lucide-react";
import BankShell from "../../components/layout/BankShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import ProgressBar from "../../components/ui/ProgressBar";
import Skeleton from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import { fetchBankPools } from "../../lib/services";
import { POOL_STATUS_META } from "../../lib/constants";
import { formatMoney, formatDate, poolFillPct } from "../../lib/utils";
import type { Pool } from "../../types";

export default function BankPools() {
  const [pools, setPools] = useState<Pool[] | null>(null);

  useEffect(() => {
    fetchBankPools().then(setPools);
  }, []);

  return (
    <BankShell>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-[24px] text-ink">My pools</h1>
          <p className="mt-1 text-[13px] text-ink-muted">Pools you own. Exporters at other banks cannot join these.</p>
        </div>
        <Link to="/bank/pools/create">
          <Button>
            <Plus size={16} /> Create pool
          </Button>
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pools === null && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        {pools?.length === 0 && (
          <div className="md:col-span-3">
            <EmptyState icon={Layers} title="No pools yet" description="Create a currency window so your exporters can be matched." />
          </div>
        )}
        {pools?.map((pool) => {
          const cap = pool.maximum_amount || pool.target_amount || 0;
          const pct = poolFillPct(pool.total_amount, pool.target_amount, pool.maximum_amount);
          return (
            <Link key={pool.id} to={`/bank/pools/${pool.id}`}>
              <Card instrument className="h-full p-5 transition-colors hover:border-line-accent">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[14.5px] font-medium text-ink">{pool.name || `${pool.currency} pool`}</p>
                  <Badge tone={POOL_STATUS_META[pool.status].tone}>{POOL_STATUS_META[pool.status].label}</Badge>
                </div>
                <p className="mt-1 text-[12px] text-ink-muted">
                  {pool.currency} · {formatDate(pool.bucket_start_date)} – {formatDate(pool.bucket_end_date)}
                </p>
                <p className="tnum mt-4 text-[20px] text-ink">
                  {formatMoney(pool.total_amount, pool.currency)}
                  <span className="text-[13px] text-ink-faint"> / {formatMoney(cap, pool.currency)}</span>
                </p>
                <ProgressBar
                  value={pct}
                  label={`${pct.toFixed(0)}% of target`}
                  className="mt-3"
                  tone={pool.status === "collecting" ? "warn" : "accent"}
                />
              </Card>
            </Link>
          );
        })}
      </div>
    </BankShell>
  );
}
