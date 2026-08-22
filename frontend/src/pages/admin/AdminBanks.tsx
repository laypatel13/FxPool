import { useEffect, useState, type FormEvent } from "react";
import { Building2 } from "lucide-react";
import AdminShell from "../../components/layout/AdminShell";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Skeleton from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import { createAdminInvite, createBank, fetchBanks, suspendBank, verifyBank } from "../../lib/services";
import type { Bank } from "../../types";

export default function AdminBanks() {
  const [banks, setBanks] = useState<Bank[] | null>(null);
  const [form, setForm] = useState({ code: "", name: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = () => fetchBanks().then(setBanks);

  useEffect(() => {
    load();
  }, []);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const bank = await createBank({ code: form.code, name: form.name, status: "pending" });
      const bankInvite = await createAdminInvite(bank.id, "bank_user");
      const expInvite = await createAdminInvite(bank.id, "exporter");
      setForm({ code: "", name: "" });
      setMessage(`Registered. Bank invite ${bankInvite.code} · exporter invite ${expInvite.code}`);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <h1 className="font-display text-[24px] text-ink">Banks</h1>
      <p className="mt-1 text-[13px] text-ink-muted">Register and oversee banks. Operational pools are created by the bank, not by FXPool admin.</p>

      <Card instrument className="mt-6 max-w-xl p-6">
        <p className="text-[14px] font-medium text-ink">Register a bank</p>
        <form onSubmit={onCreate} className="mt-4 space-y-3">
          <Input label="Bank code" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="SBI-GIFT" />
          <Input label="Display name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="State Bank of India — GIFT City" />
          <Button type="submit" disabled={saving}>
            {saving ? "Registering…" : "Add bank"}
          </Button>
          {message && <p className="text-[12.5px] text-signal-up">{message}</p>}
        </form>
      </Card>

      <Card className="mt-6 overflow-hidden">
        {banks === null ? (
          <div className="space-y-3 p-6">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
        ) : banks.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Building2} title="No banks yet" description="Register SBI or HDFC to start the demo." />
          </div>
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-ink-faint">
                <th className="px-6 py-3.5 font-normal">Bank</th>
                <th className="px-6 py-3.5 font-normal">Code</th>
                <th className="px-6 py-3.5 font-normal">Status</th>
                <th className="px-6 py-3.5 font-normal" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {banks.map((b) => (
                <tr key={b.id}>
                  <td className="px-6 py-3.5 text-ink">{b.name}</td>
                  <td className="tnum px-6 py-3.5 text-ink-muted">{b.code}</td>
                  <td className="px-6 py-3.5">
                    <Badge tone={b.status === "active" ? "up" : b.status === "suspended" ? "down" : "warn"}>{b.status}</Badge>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {b.status !== "active" && (
                      <button className="text-[12.5px] text-accent hover:underline" onClick={async () => { await verifyBank(b.id); load(); }}>
                        Verify
                      </button>
                    )}
                    {b.status === "active" && b.code !== "FXPOOL-LEGACY" && (
                      <button className="ml-3 text-[12.5px] text-signal-down hover:underline" onClick={async () => { await suspendBank(b.id); load(); }}>
                        Suspend
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </AdminShell>
  );
}
