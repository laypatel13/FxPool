import { useEffect, useState, type FormEvent } from "react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import { SUPPORTED_CURRENCIES } from "../../lib/constants";
import { createInvoice, fetchIndicativeRate, uploadInvoice } from "../../lib/services";
import { formatRate } from "../../lib/utils";
import type { Invoice } from "../../types";

interface UploadInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (invoice: Invoice) => void;
}

export default function UploadInvoiceModal({ open, onClose, onCreated }: UploadInvoiceModalProps) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string>(SUPPORTED_CURRENCIES[0]);
  const [dueDate, setDueDate] = useState("");
  const [buyer, setBuyer] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setAmount("");
      setDueDate("");
      setBuyer("");
      setFile(null);
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
    setSubmitting(true);
    try {
      let invoice: Invoice;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        if (amount) fd.append("amount", amount);
        if (currency) fd.append("currency", currency);
        if (dueDate) fd.append("due_date", dueDate);
        if (buyer) fd.append("buyer_name", buyer);
        invoice = await uploadInvoice(fd);
      } else {
        const numericAmount = Number(amount);
        if (!numericAmount || numericAmount <= 0) {
          setError("Enter a valid invoice amount, or upload a PDF.");
          setSubmitting(false);
          return;
        }
        if (!dueDate) {
          setError("Select a due date.");
          setSubmitting(false);
          return;
        }
        invoice = await createInvoice({
          amount: numericAmount,
          currency,
          due_date: dueDate,
          buyer_name: buyer || undefined,
        });
      }
      onCreated(invoice);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload invoice" description="PDF is optional. Your bank is derived from your account — never typed in this form.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Invoice PDF"
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Input
            label="Amount (if not in PDF)"
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="37500"
          />
          <Select label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="min-w-[92px]">
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <Input label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <Input label="Buyer (optional)" value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="ABC GmbH" />

        <div className="rounded-xl border border-line bg-base/60 px-4 py-3.5">
          <p className="text-[11px] uppercase tracking-wide text-ink-faint">Indicative forward rate</p>
          <p className="tnum mt-1.5 text-[20px] text-ink">
            {rateLoading ? "…" : rate !== null ? formatRate(rate) : "—"}
          </p>
        </div>

        {error && <p className="text-[12.5px] text-signal-down">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Processing…" : "Submit invoice"}
        </Button>
      </form>
    </Modal>
  );
}
