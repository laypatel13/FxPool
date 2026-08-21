import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import BankShell from "../../components/BankShell";
import Card from "../../../components/ui/Card";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import { fetchBankPoolDetail, quoteBankPool, confirmBankSettlement } from "../../../lib/services";
import type { PoolDetail } from "../../../types";
import { formatMoney } from "../../../lib/utils";

export default function BankPoolDetail() {
  const { id } = useParams<{ id: string }>();
  const [pool, setPool] = useState<PoolDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchBankPoolDetail(id).then(data => {
      setPool(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const handleQuote = async () => {
    if (!pool) return;
    const rateStr = prompt("Enter quoted rate:");
    if (!rateStr) return;
    const rate = parseFloat(rateStr);
    if (isNaN(rate)) return;

    try {
      await quoteBankPool(pool.id, rate);
      alert("Quote submitted!");
    } catch (e: any) {
      alert("Failed: " + e.message);
    }
  };

  const handleSettle = async () => {
    if (!pool) return;
    if (confirm("Confirm settlement?")) {
      try {
        const updated = await confirmBankSettlement(pool.id);
        setPool({ ...pool, ...updated });
      } catch (e: any) {
        alert("Failed: " + e.message);
      }
    }
  };

  if (loading) return <BankShell><p>Loading...</p></BankShell>;
  if (!pool) return <BankShell><p>Pool not found</p></BankShell>;

  return (
    <BankShell>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[24px] text-ink">{pool.currency} Pool Detail</h1>
        <Badge tone="muted">{pool.status}</Badge>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card className="p-6">
          <p className="text-[13.5px] font-medium text-ink">Total Volume</p>
          <p className="tnum mt-3 text-[22px] text-ink">{formatMoney(pool.total_amount, pool.currency)}</p>
          <div className="mt-6 space-y-3">
            <Button className="w-full" variant="secondary" onClick={handleQuote}>Submit Quote</Button>
            {pool.status === "locked" && (
              <Button className="w-full" onClick={handleSettle}>Confirm Settlement</Button>
            )}
          </div>
        </Card>
      </div>
    </BankShell>
  );
}
