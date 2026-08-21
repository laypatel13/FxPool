import { useEffect, useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { fetchBanks, createBank } from "../../lib/services";
import type { Bank } from "../../types";

export default function AdminBanks() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBanks().then(data => {
      setBanks(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    // Quick mock creation for now
    const name = prompt("Bank Name?");
    const code = prompt("Bank Code (e.g. HDFC)?");
    if (!name || !code) return;
    try {
      const newBank = await createBank({ name, code, status: "active", supported_currencies: ["USD", "EUR", "GBP"] });
      setBanks([newBank, ...banks]);
    } catch (e: any) {
      alert("Failed to create: " + e.message);
    }
  };

  return (
    <AdminShell>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[24px] text-ink">Banking Partners</h1>
        <Button onClick={handleCreate}>Add Bank</Button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5">
        {loading ? (
          <p>Loading...</p>
        ) : (
          banks.map(bank => (
            <Card key={bank.id} className="p-6 flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-medium text-ink">{bank.name} <span className="text-ink-faint ml-2">{bank.code}</span></h3>
                <p className="text-[13px] text-ink-muted mt-1">Currencies: {bank.supported_currencies.join(", ")}</p>
              </div>
              <Badge tone={bank.status === "active" ? "up" : "down"}>{bank.status}</Badge>
            </Card>
          ))
        )}
      </div>
    </AdminShell>
  );
}
