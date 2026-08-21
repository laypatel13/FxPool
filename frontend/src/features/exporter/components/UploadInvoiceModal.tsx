import { useEffect, useState, type FormEvent } from "react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import { SUPPORTED_CURRENCIES } from "../../../lib/constants";
import { createInvoice, fetchIndicativeRate } from "../../../lib/services";
import { formatRate } from "../../../lib/utils";
import type { Invoice } from "../../../types";

interface UploadInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (invoice: Invoice) => void;
}

export default function UploadInvoiceModal({ open, onClose, onCreated }: UploadInvoiceModalProps) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string>(SUPPORTED_CURRENCIES[0]);
  const [dueDate, setDueDate] = useState("");
  const [rate, setRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setAmount("");
      setDueDate("");
      setRate(null);
      setError("");
    }
  }, [open]);

  useEffect(() => {
    if (!currency || !dueDate) {
      setRate(null);
      return;
    }
    setRateLoading(true);
    const t = setTimeout(() => {
      fetchIndicativeRate(currency, dueDate)
        .then((r) => setRate(r.indicative_rate))
        .catch(() => setRate(null))
        .finally(() => setRateLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [currency, dueDate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError("Enter a valid invoice amount.");
      return;
    }
    if (!dueDate) {
      setError("Select a due date.");
      return;
    }
    setSubmitting(true);
    try {
      const invoice = await createInvoice({ amount: numericAmount, currency, due_date: dueDate });
      onCreated(invoice);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload invoice" description="Add the invoice details to see an indicative rate and join a pool.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Input
            label="Invoice amount"
            type="number"
            min="1"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="2000"
          />
          <Select label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="min-w-[92px]">
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <Input
          label="Due date"
          type="date"
          required
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <div className="rounded-xl border border-line bg-base/60 px-4 py-3.5">
          <p className="text-[11px] uppercase tracking-wide text-ink-faint">Indicative forward rate</p>
          <p className="tnum mt-1.5 text-[20px] text-ink">
            {rateLoading ? "…" : rate !== null ? formatRate(rate) : "—"}
          </p>
        </div>

        {error && <p className="text-[12.5px] text-signal-down">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Running AI checks…" : "Submit invoice"}
        </Button>
      </form>
    </Modal>
  );
}
