import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import AdminShell from "../../components/layout/AdminShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import ProgressBar from "../../components/ui/ProgressBar";
import Skeleton from "../../components/ui/Skeleton";
import Modal from "../../components/ui/Modal";
import { fetchPoolDetail, fetchPoolSettings, executePool, settlePool } from "../../lib/services";
import { POOL_STATUS_META } from "../../lib/constants";
import { formatMoney, formatDate, formatDateTime } from "../../lib/utils";
import type { PoolDetail } from "../../types";

export default function AdminPoolDetail() {
  const { id } = useParams<{ id: string }>();
  const [pool, setPool] = useState<PoolDetail | null>(null);
  const [target, setTarget] = useState(50000);
  const [confirmAction, setConfirmAction] = useState<"execute" | "settle" | null>(null);
  const [working, setWorking] = useState(false);

  const load = () => {
    if (!id) return;
    fetchPoolDetail(id).then(setPool);
  };

  useEffect(() => {
    load();
    fetchPoolSettings().then((s) => setTarget(s.min_pool_amount ?? 50000));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const runAction = async () => {
    if (!id || !confirmAction) return;
    setWorking(true);
    try {
      const updated = confirmAction === "execute" ? await executePool(id) : await settlePool(id);
      setPool((prev) => (prev ? { ...prev, ...updated } : prev));
    } finally {
      setWorking(false);
      setConfirmAction(null);
    }
  };

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
              <h1 className="mt-1 font-display text-[24px] text-ink">{pool.currency} forward pool</h1>
              <p className="mt-1 text-[13px] text-ink-muted">
                {formatDate(pool.bucket_start_date)} – {formatDate(pool.bucket_end_date)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={POOL_STATUS_META[pool.status].tone}>{POOL_STATUS_META[pool.status].label}</Badge>
              {pool.status === "suggested" && (
                <Button size="sm" onClick={() => setConfirmAction("execute")}>
                  Execute contract
                </Button>
              )}
              {pool.status === "locked" && (
                <Button size="sm" onClick={() => setConfirmAction("settle")}>
                  Mark settled
                </Button>
              )}
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pool.invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="tnum py-3 text-ink">{inv.id}</td>
                      <td className="py-3 text-ink-muted">{inv.exporter_name ?? inv.exporter_id}</td>
                      <td className="tnum py-3 text-ink">{formatMoney(inv.amount, inv.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <div className="space-y-5">
              <Card className="p-6">
                <p className="text-[13.5px] font-medium text-ink">Fill progress</p>
                <p className="tnum mt-3 text-[22px] text-ink">{formatMoney(pool.total_amount, pool.currency)}</p>
                <ProgressBar
                  value={Math.min(100, (pool.total_amount / target) * 100)}
                  label={`toward ${formatMoney(target, pool.currency)} minimum`}
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

      <Modal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction === "execute" ? "Execute forward contract?" : "Mark pool as settled?"}
        description={
          confirmAction === "execute"
            ? "This locks a single forward rate for every invoice currently in this pool. This cannot be undone."
            : "This confirms settlement funds have moved through the banking unit to every exporter in this pool."
        }
      >
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirmAction(null)}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={runAction} disabled={working}>
            {working ? "Processing…" : "Confirm"}
          </Button>
        </div>
      </Modal>
    </AdminShell>
  );
}
