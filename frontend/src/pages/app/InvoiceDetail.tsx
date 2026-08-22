import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, Sparkles } from "lucide-react";
import DashboardShell from "../../components/layout/DashboardShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import ProgressBar from "../../components/ui/ProgressBar";
import Skeleton from "../../components/ui/Skeleton";
import Timeline from "../../components/ui/Timeline";
import { fetchInvoice, fetchRecommendation, participateInPool } from "../../lib/services";
import { INVOICE_STATUS_META, POOL_STATUS_META, SETTLEMENT_STEPS } from "../../lib/constants";
import { formatMoney, formatRate, formatDate, formatDateTime, poolFillPct } from "../../lib/utils";
import type { Invoice, Pool, RecommendationPayload } from "../../types";

const statusToStepIndex: Record<Invoice["status"], number> = {
  pending_pool: 1,
  recommended: 1,
  pooled: 2,
  pool_not_filled: 2,
  locked: 3,
  settled: 4,
};

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined);
  const [rec, setRec] = useState<RecommendationPayload | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    const inv = await fetchInvoice(id);
    setInvoice(inv ?? null);
    if (inv && !inv.pool_id) {
      try {
        setRec(await fetchRecommendation(id));
      } catch {
        setRec(null);
      }
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const accept = async (poolId?: string) => {
    if (!id) return;
    setConfirming(poolId ?? "rec");
    try {
      const result = await participateInPool(id, poolId);
      setInvoice(result.invoice);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not join pool");
    } finally {
      setConfirming(null);
    }
  };

  const recPool = rec?.eligible_pools.find((p) => p.id === rec.recommendation.recommended_pool_id);
  const others = rec?.eligible_pools.filter((p) => p.id !== rec.recommendation.recommended_pool_id) ?? [];

  return (
    <DashboardShell>
      <Link to="/app/invoices" className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink">
        <ChevronLeft size={15} /> Back to invoices
      </Link>

      {invoice === undefined ? (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      ) : invoice === null ? (
        <p className="mt-8 text-[14px] text-ink-muted">Invoice not found.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="tnum text-[12px] text-ink-faint">{invoice.invoice_number || invoice.id}</p>
              <h1 className="mt-1 font-display text-[26px] text-ink">
                {formatMoney(invoice.amount, invoice.currency)} · {invoice.currency}
              </h1>
              <p className="mt-1 text-[13px] text-ink-muted">
                Due {formatDate(invoice.due_date)}
                {invoice.buyer_name ? ` · ${invoice.buyer_name}` : ""}
              </p>
            </div>
            <Badge tone={INVOICE_STATUS_META[invoice.status].tone}>{INVOICE_STATUS_META[invoice.status].label}</Badge>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-[12px]">
            <Badge tone={invoice.validation_status === "passed" ? "up" : "muted"}>
              {invoice.validation_status === "passed" ? "Invoice verified" : "Validation pending"}
            </Badge>
            <Badge tone={invoice.compliance_status === "approved" ? "up" : "warn"}>
              {invoice.compliance_status === "rejected" ? "Compliance failed" : "Compliance passed"}
            </Badge>
            <Badge tone="accent">Exposure eligible</Badge>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {!invoice.pool_id && recPool && (
                <Card instrument className="border-accent/40 p-6">
                  <div className="flex items-center gap-2 text-accent">
                    <Sparkles size={16} />
                    <p className="text-[12px] font-medium uppercase tracking-wide">AI recommended</p>
                  </div>
                  <div className="mt-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[18px] font-medium text-ink">{recPool.name || `${recPool.currency} pool`}</p>
                      <p className="mt-1 text-[12.5px] text-ink-muted">
                        {formatDate(recPool.bucket_start_date)} – {formatDate(recPool.bucket_end_date)}
                      </p>
                    </div>
                    <p className="tnum text-[28px] text-accent">{Math.round(rec?.recommendation.match_score ?? 0)}%</p>
                  </div>
                  <p className="mt-3 text-[13.5px] text-ink-muted">{rec?.recommendation.reason}</p>
                  <p className="tnum mt-4 text-[15px] text-ink">
                    {formatMoney(recPool.total_amount, recPool.currency)} /{" "}
                    {formatMoney(recPool.target_amount || recPool.maximum_amount || 0, recPool.currency)} filled
                  </p>
                  <ProgressBar
                    value={poolFillPct(recPool.total_amount, recPool.target_amount, recPool.maximum_amount)}
                    className="mt-3"
                  />
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link to={`/app/pools/${recPool.id}`}>
                      <Button variant="secondary" size="sm">
                        View pool
                      </Button>
                    </Link>
                    <Button size="sm" onClick={() => accept(recPool.id)} disabled={!!confirming}>
                      {confirming === recPool.id ? "Joining…" : "Accept recommendation"}
                    </Button>
                  </div>
                </Card>
              )}

              {!invoice.pool_id && others.length > 0 && (
                <Card className="p-6">
                  <p className="text-[14.5px] font-medium text-ink">Other eligible pools</p>
                  <p className="mt-1 text-[12.5px] text-ink-muted">Only pools at your bank that already passed deterministic rules.</p>
                  <div className="mt-4 space-y-3">
                    {others.map((pool) => (
                      <PoolRow key={pool.id} pool={pool} onAccept={() => accept(pool.id)} busy={confirming === pool.id} />
                    ))}
                  </div>
                </Card>
              )}

              {!invoice.pool_id && rec && !recPool && (
                <Card className="p-6">
                  <p className="text-[14.5px] font-medium text-ink">No eligible pool yet</p>
                  <p className="mt-2 text-[13px] text-ink-muted">
                    Your bank has no open pool that matches this currency, settlement window, and capacity. The invoice stays in an explicit matching state — it will not sit in an ambiguous pending forever once your bank expires an unfilled window.
                  </p>
                </Card>
              )}

              {invoice.pool_id && (
                <Card className="p-6">
                  <p className="text-[14.5px] font-medium text-ink">Pool participation</p>
                  <p className="mt-2 text-[13px] text-ink-muted">You have joined this invoice to a pool owned by your bank.</p>
                  <Link to={`/app/pools/${invoice.pool_id}`} className="mt-4 inline-block text-[13px] text-accent hover:underline">
                    View pool →
                  </Link>
                </Card>
              )}

              <Card className="p-6">
                <p className="text-[14.5px] font-medium text-ink">Contract terms</p>
                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {[
                    ["Due date", formatDate(invoice.due_date)],
                    ["Indicative rate", formatRate(invoice.indicative_rate)],
                    ["Locked rate", formatRate(invoice.locked_rate)],
                    ["Buyer", invoice.buyer_name ?? "—"],
                    ["Payout", invoice.payout_amount ? formatMoney(invoice.payout_amount, "INR") : "—"],
                    ["Submitted", formatDate(invoice.created_at)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-line bg-base/60 px-4 py-3">
                      <p className="text-[11px] text-ink-faint">{label}</p>
                      <p className="tnum mt-1 text-[14px] text-ink">{value}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <p className="text-[14.5px] font-medium text-ink">Settlement progress</p>
              <div className="mt-5">
                <Timeline
                  steps={SETTLEMENT_STEPS.map((s, i) => ({
                    key: s.key,
                    label: s.label,
                    timestamp: i === 0 ? formatDateTime(invoice.created_at) : undefined,
                  }))}
                  currentIndex={statusToStepIndex[invoice.status]}
                />
              </div>
            </Card>
          </div>
        </>
      )}
    </DashboardShell>
  );
}

function PoolRow({ pool, onAccept, busy }: { pool: Pool; onAccept: () => void; busy: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
      <div>
        <p className="text-[13.5px] text-ink">{pool.name || `${pool.currency} pool`}</p>
        <p className="text-[12px] text-ink-faint">
          {formatMoney(pool.total_amount, pool.currency)} / {formatMoney(pool.target_amount || pool.maximum_amount || 0, pool.currency)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={POOL_STATUS_META[pool.status].tone}>{POOL_STATUS_META[pool.status].label}</Badge>
        <Button size="sm" variant="secondary" onClick={onAccept} disabled={busy}>
          {busy ? "…" : "Join"}
        </Button>
      </div>
    </div>
  );
}
