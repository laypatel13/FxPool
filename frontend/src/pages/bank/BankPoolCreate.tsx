import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import BankShell from "../../components/layout/BankShell";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import { SUPPORTED_CURRENCIES } from "../../lib/constants";
import { createBankPool } from "../../lib/services";

export default function BankPoolCreate() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "USD September Export Pool",
    currency: "USD",
    bucket_start_date: "",
    bucket_end_date: "",
    minimum_amount: "50000",
    target_amount: "100000",
    maximum_amount: "150000",
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const pool = await createBankPool({
        name: form.name,
        currency: form.currency,
        bucket_start_date: form.bucket_start_date,
        bucket_end_date: form.bucket_end_date,
        minimum_amount: Number(form.minimum_amount),
        target_amount: Number(form.target_amount),
        maximum_amount: Number(form.maximum_amount),
      });
      navigate(`/bank/pools/${pool.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create pool.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BankShell>
      <Link to="/bank/pools" className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink">
        <ChevronLeft size={15} /> Back to pools
      </Link>
      <h1 className="mt-4 font-display text-[24px] text-ink">Create pool</h1>
      <p className="mt-1 text-[13px] text-ink-muted">This pool belongs to your bank. Only your exporters can be matched into it.</p>

      <Card instrument className="mt-6 max-w-xl p-7">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Pool name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Window start" type="date" required value={form.bucket_start_date} onChange={(e) => setForm({ ...form, bucket_start_date: e.target.value })} />
            <Input label="Window end" type="date" required value={form.bucket_end_date} onChange={(e) => setForm({ ...form, bucket_end_date: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Minimum" type="number" required value={form.minimum_amount} onChange={(e) => setForm({ ...form, minimum_amount: e.target.value })} />
            <Input label="Target" type="number" required value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} />
            <Input label="Maximum" type="number" required value={form.maximum_amount} onChange={(e) => setForm({ ...form, maximum_amount: e.target.value })} />
          </div>
          <p className="text-[12px] text-ink-faint">Eligible exporters: all exporters with an active relationship to this bank.</p>
          {error && <p className="text-[12.5px] text-signal-down">{error}</p>}
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Creating…" : "Create pool"}
          </Button>
        </form>
      </Card>
    </BankShell>
  );
}
