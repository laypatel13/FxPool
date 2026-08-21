import { useEffect, useState, type FormEvent, type ChangeEvent } from "react";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Button from "../../../components/ui/Button";
import { SUPPORTED_CURRENCIES } from "../../../lib/constants";
import { createInvoice, fetchIndicativeRate } from "../../../lib/services";
import { formatRate } from "../../../lib/utils";
import type { Invoice } from "../../../types";
import { supabase } from "../../../lib/supabase";

interface UploadInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (invoice: Invoice) => void;
}

export default function UploadInvoiceModal({ open, onClose, onCreated }: UploadInvoiceModalProps) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string>(SUPPORTED_CURRENCIES[0]);
  const [dueDate, setDueDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setAmount("");
      setDueDate("");
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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

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
      let documentUrl: string | undefined;

      // Upload file to Supabase Storage if selected
      if (file && supabase) {
        // Generate a random path
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('invoices')
          .upload(filePath, file);

        if (uploadError) {
          throw new Error("Failed to upload document: " + uploadError.message);
        }

        // Get public URL or just store the path (since the bucket isn't public, we'll store the path and generate signed URLs later or use createSignedUrl)
        // Wait, if it's private, we should store the path and let the UI fetch it.
        // Actually, Supabase has getPublicUrl, but if the bucket is private (as per our SQL: false), it needs createSignedUrl.
        // For simplicity, we just save the filepath in the DB.
        documentUrl = filePath;
      }

      const invoice = await createInvoice({ 
        amount: numericAmount, 
        currency, 
        due_date: dueDate,
        document_url: documentUrl
      });
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
        
        <div>
          <label className="block text-[13px] font-medium text-ink mb-1.5">Invoice Document (PDF)</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="block w-full text-[13px] text-ink-muted
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-[13px] file:font-semibold
              file:bg-surface-2 file:text-ink
              hover:file:bg-surface-3 transition-colors
              cursor-pointer"
          />
        </div>

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
