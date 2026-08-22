import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import BankShell from "../../components/layout/BankShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import ProgressBar from "../../components/ui/ProgressBar";
import Skeleton from "../../components/ui/Skeleton";
import Modal from "../../components/ui/Modal";
import {
  executeBankPool,
  fetchBankPoolDetail,
  markPoolUnfilled,
  settleBankPool,
  startBankHedge,
} from "../../lib/services";
import { INVOICE_STATUS_META, POOL_STATUS_META } from "../../lib/constants";
import { formatMoney, formatDate, formatDateTime, poolFillPct } from "../../lib/utils";
import type { PoolDetail } from "../../types";

export default function BankPoolDetail() {
  const { id } = useParams<{ id: string }>();
  const [pool, setPool] = useState<PoolDetail | null>(null);
  const [action, setAction] = useState<"hedge" | "execute" | "settle" | "unfilled" | null>(null);
  const [working, setWorking] = useState(false);

  const load = () => {
    if (!id) return;
    fetchBankPoolDetail(id).then(setPool);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const run = async () => {
    if (!id || !action) return;
    setWorking(true);
    try {
      const updated =
        action === "hedge"
          ? await startBankHedge(id)
          : action === "execute"
            ? await executeBankPool(id)
            : action === "settle"
              ? await settleBankPool(id)
              : await markPoolUnfilled(id);
      setPool((prev) => (prev ? { ...prev, ...updated } : prev));
    } finally {
      setWorking(false);
      setAction(null);
    }
  };

  const exporters = new Set(pool?.invoices.map((i) => i.exporter_id)).size;
  const cap = pool ? pool.maximum_amount || pool.target_amount || 0 : 0;
  const remaining = pool ? Math.max(0, cap - pool.total_amount) : 0;
  const pct = pool ? poolFillPct(pool.total_amount, pool.target_amount, pool.maximum_amount) : 0;

  return (
    <BankShell>
      <Link to="/bank/pools" className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink">
        <ChevronLeft size={15} /> Back to pools
      </Link>

      {!pool ? (
        <Skeleton className="mt-6 h-96" />
      ) : (
        <>
          <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h1 className="font-display text-[24px] text-ink">{pool.name || `${pool.currency} pool`}</h1>
              <p className="mt-1 text-[13px] text-ink-muted">
                {pool.currency} · {formatDate(pool.bucket_start_date)} – {formatDate(pool.bucket_end_date)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={POOL_STATUS_META[pool.status].tone}>{POOL_STATUS_META[pool.status].label}</Badge>
              {(pool.status === "collecting" || pool.status === "target_reached") && (
                <>
                  <Button size="sm" onClick={() => setAction("hedge")}>
                    Mark hedging
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setAction("unfilled")}>
                    Pool not filled
                  </Button>
                </>
              )}
              {pool.status === "hedging" && (
                <Button size="sm" onClick={() => setAction("execute")}>
                  Mark hedged
                </Button>
              )}
              {(pool.status === "hedged" || pool.status === "locked") && (
                <Button size="sm" onClick={() => setAction("settle")}>
                  Settle
                </Button>
              )}
            </div>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <p className="text-[11px] uppercase tracking-wide text-ink-faint">Current</p>
              <p className="tnum mt-1 text-[22px] text-ink">{formatMoney(pool.total_amount, pool.currency)}</p>
            </Card>
            <Card className="p-5">
              <p className="text-[11px] uppercase tracking-wide text-ink-faint">Target / max</p>
              <p className="tnum mt-1 text-[16px] text-ink">
                {formatMoney(pool.target_amount || 0, pool.currency)} / {formatMoney(cap, pool.currency)}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-[11px] uppercase tracking-wide text-ink-faint">Utilization</p>
              <p className="tnum mt-1 text-[22px] text-ink">{pct.toFixed(1)}%</p>
              <ProgressBar value={pct} className="mt-2" />
            </Card>
            <Card className="p-5">
              <p className="text-[11px] uppercase tracking-wide text-ink-faint">Remaining</p>
              <p className="tnum mt-1 text-[22px] text-ink">{formatMoney(remaining, pool.currency)}</p>
              <p className="mt-1 text-[12px] text-ink-faint">
                {pool.invoices.length} invoices · {exporters} exporters
              </p>
            </Card>
          </div>

          <Card className="mt-6 overflow-hidden">
            <p className="px-6 pt-5 text-[13.5px] font-medium text-ink">Members</p>
            <table className="mt-2 w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-ink-faint">
                  <th className="px-6 py-2.5 font-normal">Invoice</th>
                  <th className="px-6 py-2.5 font-normal">Exporter</th>
                  <th className="px-6 py-2.5 font-normal">Amount</th>
                  <th className="px-6 py-2.5 font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pool.invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="tnum px-6 py-3 text-ink-muted">{inv.invoice_number || inv.id}</td>
                    <td className="px-6 py-3 text-ink">{inv.exporter_name ?? inv.exporter_id}</td>
                    <td className="tnum px-6 py-3 text-ink">{formatMoney(inv.amount, inv.currency)}</td>
                    <td className="px-6 py-3">
                      <Badge tone={INVOICE_STATUS_META[inv.status].tone}>{INVOICE_STATUS_META[inv.status].label}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pool.locked_rate && (
              <p className="px-6 py-4 text-[12.5px] text-ink-muted">
                Hedge rate {pool.locked_rate.toFixed(2)} · {pool.executed_at ? formatDateTime(pool.executed_at) : ""}
              </p>
            )}
          </Card>
        </>
      )}

      <Modal
        open={!!action}
        onClose={() => setAction(null)}
        title={
          action === "hedge"
            ? "Move pool to hedging?"
            : action === "execute"
              ? "Mark pool as hedged?"
              : action === "settle"
                ? "Settle this pool?"
                : "Mark pool not filled?"
        }
        description={
          action === "unfilled"
            ? "Member invoices will move to an explicit pool_not_filled fallback so they are not left pending."
            : "Simulated bank-side hedge workflow — no live market order is sent."
        }
      >
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setAction(null)}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={run} disabled={working}>
            {working ? "Processing…" : "Confirm"}
          </Button>
        </div>
      </Modal>
    </BankShell>
  );
}
