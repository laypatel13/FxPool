import { useEffect, useState } from "react";
import BankShell from "../../components/BankShell";
import Card from "../../../components/ui/Card";
import Badge from "../../../components/ui/Badge";
import { fetchBankPools } from "../../../lib/services";
import type { Pool } from "../../../types";
import { formatMoney, formatDate } from "../../../lib/utils";
import { Link } from "react-router-dom";

export default function BankPools() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBankPools().then(data => {
      setPools(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <BankShell>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[24px] text-ink">Assigned Pools</h1>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5">
        {loading ? (
          <p>Loading...</p>
        ) : pools.length === 0 ? (
          <Card className="p-12 text-center text-[13px] text-ink-muted">No pools assigned to your bank yet.</Card>
        ) : (
          pools.map(pool => (
            <Link key={pool.id} to={`/bank/pools/${pool.id}`}>
              <Card className="p-6 transition-colors hover:border-ink/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[15px] font-medium text-ink">{pool.currency} Pool</h3>
                    <p className="text-[13px] text-ink-muted mt-1">
                      {formatDate(pool.bucket_start_date)} - {formatDate(pool.bucket_end_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tnum text-[16px] text-ink">{formatMoney(pool.total_amount, pool.currency)}</p>
                    <Badge tone="muted" className="mt-1">{pool.status}</Badge>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </BankShell>
  );
}
