import { useEffect, useState } from "react";
import BankShell from "../../components/layout/BankShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { createBankInvite, fetchBankInvites } from "../../lib/services";
import type { Invite } from "../../types";

export default function BankSettings() {
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [working, setWorking] = useState(false);

  const load = () => fetchBankInvites().then(setInvites);

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setWorking(true);
    try {
      await createBankInvite("exporter");
      await load();
    } finally {
      setWorking(false);
    }
  };

  return (
    <BankShell>
      <h1 className="font-display text-[24px] text-ink">Settings</h1>
      <p className="mt-1 text-[13px] text-ink-muted">
        Issue invitation codes so exporters join this bank — they cannot type a bank name themselves.
      </p>

      <Card className="mt-6 p-6">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-medium text-ink">Onboarding codes</p>
          <Button size="sm" onClick={create} disabled={working}>
            {working ? "Creating…" : "New exporter code"}
          </Button>
        </div>
        <div className="mt-4 divide-y divide-line">
          {invites?.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between py-3">
              <div>
                <p className="tnum text-[14px] text-ink">{inv.code}</p>
                <p className="text-[12px] text-ink-faint">{inv.kind}</p>
              </div>
              <Badge tone={inv.status === "active" ? "up" : "muted"}>{inv.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </BankShell>
  );
}
