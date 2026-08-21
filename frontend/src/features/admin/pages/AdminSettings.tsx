import { useEffect, useState, type FormEvent } from "react";
import AdminShell from "../../components/AdminShell";
import Card from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Button from "../../../components/ui/Button";
import Skeleton from "../../../components/ui/Skeleton";
import { SUPPORTED_CURRENCIES } from "../../../lib/constants";
import { fetchPoolSettings, updatePoolSettings } from "../../../lib/services";
import type { PoolSettings } from "../../../types";

export default function AdminSettings() {
  const [settings, setSettings] = useState<PoolSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchPoolSettings().then(setSettings);
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await updatePoolSettings(settings);
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <h1 className="font-display text-[24px] text-ink">Pool settings</h1>
      <p className="mt-1 text-[13px] text-ink-muted">Global rules used to bucket and execute pools.</p>

      {!settings ? (
        <Skeleton className="mt-6 h-80 max-w-xl" />
      ) : (
        <Card instrument className="mt-6 max-w-xl p-7">
          <form onSubmit={onSubmit} className="space-y-5">
            <Select
              label="Currency scope"
              value={settings.currency ?? ""}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value || null })}
            >
              <option value="">All currencies (global default)</option>
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c} only
                </option>
              ))}
            </Select>

            <Input
              label="Bucket width (days)"
              type="number"
              min={1}
              value={settings.bucket_width_days}
              onChange={(e) => setSettings({ ...settings, bucket_width_days: Number(e.target.value) })}
              hint="Invoices with due dates within this many days are grouped into the same pool."
            />

            <Input
              label="Minimum pool amount"
              type="number"
              min={0}
              value={settings.min_pool_amount ?? ""}
              onChange={(e) => setSettings({ ...settings, min_pool_amount: Number(e.target.value) })}
              hint="A pool becomes eligible for execution once it reaches this total."
            />

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save settings"}
              </Button>
              {saved && <span className="text-[12.5px] text-signal-up">Saved</span>}
            </div>
          </form>
        </Card>
      )}
    </AdminShell>
  );
}
