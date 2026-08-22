import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layers, Users, FileSearch, ShieldCheck, Plus } from "lucide-react";
import BankShell from "../../components/layout/BankShell";
import StatCard from "../../components/ui/StatCard";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import ProgressBar from "../../components/ui/ProgressBar";
import Skeleton from "../../components/ui/Skeleton";
import { fetchBankOverview, fetchBankPools } from "../../lib/services";
import { POOL_STATUS_META } from "../../lib/constants";
import { formatMoney, formatDate, poolFillPct } from "../../lib/utils";
import type { BankOverview, Pool } from "../../types";

export default function BankOverviewPage() {
  const [stats, setStats] = useState<BankOverview | null>(null);
  const [pools, setPools] = useState<Pool[] | null>(null);

  useEffect(() => {
    fetchBankOverview().then(setStats);
    fetchBankPools().then(setPools);
  }, []);

  return (
    <BankShell>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-[13px] text-ink-muted">Treasury portal</p>
          <h1 className="mt-1 font-display text-[24px] text-ink">{stats?.bank.name ?? "Your bank"}</h1>
        </div>
        <Link to="/bank/pools/create">
          <Button>
            <Plus size={16} /> Create pool
          </Button>
        </Link>
      </div>

      <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats ? (
          <>
            <StatCard label="Active pools" value={formatMoney(stats.total_pooled)} icon={Layers} hint={`${stats.active_pools} collecting`} />
            <StatCard label="Exporters" value={String(stats.exporters)} icon={Users} hint="active relationships" />
            <StatCard label="Pending invoices" value={String(stats.pending_invoices)} icon={FileSearch} hint="awaiting pool join" />
            <StatCard label="Hedged exposure" value={formatMoney(stats.hedged_exposure)} icon={ShieldCheck} hint="hedged + settled" />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[122px]" />)
        )}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-medium text-ink">My pools</h2>
          <Link to="/bank/pools" className="text-[12.5px] text-accent hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pools === null && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
          {pools?.slice(0, 6).map((pool) => {
            const cap = pool.maximum_amount || pool.target_amount || 0;
            const pct = poolFillPct(pool.total_amount, pool.target_amount, pool.maximum_amount);
            return (
              <Link key={pool.id} to={`/bank/pools/${pool.id}`}>
                <Card instrument className="h-full p-5 transition-colors hover:border-line-accent">
                  <div className="flex items-center justify-between">
                    <p className="text-[14px] font-medium text-ink">{pool.name || `${pool.currency} pool`}</p>
                    <Badge tone={POOL_STATUS_META[pool.status].tone}>{POOL_STATUS_META[pool.status].label}</Badge>
                  </div>
                  <p className="mt-1 text-[12px] text-ink-muted">
                    {formatDate(pool.bucket_start_date)} – {formatDate(pool.bucket_end_date)}
                  </p>
                  <p className="tnum mt-4 text-[20px] text-ink">
                    {formatMoney(pool.total_amount, pool.currency)}
                    <span className="text-[13px] text-ink-faint"> / {formatMoney(cap, pool.currency)}</span>
                  </p>
                  <ProgressBar value={pct} className="mt-3" tone={pct >= 100 ? "up" : "accent"} />
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </BankShell>
  );
}
