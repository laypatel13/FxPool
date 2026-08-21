import { useState, type FormEvent, type ChangeEvent } from "react";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Button from "../../../components/ui/Button";
import { documentApi } from "../../../lib/services";
import type { Document, DocumentCategory, DocumentEntityType } from "../../../types";
import { supabase } from "../../../lib/supabase";

interface UploadDocumentModalProps {
  open: boolean;
  onClose: () => void;
  onUploaded: (doc: Document) => void;
  entityType: DocumentEntityType;
  entityId: string;
}

const CATEGORIES: Record<DocumentEntityType, { value: DocumentCategory; label: string }[]> = {
  profile: [
    { value: "business_kyc", label: "Business KYC (IEC, PAN, GST)" },
    { value: "individual_kyc", label: "Individual KYC (Aadhaar, Passport)" },
    { value: "other", label: "Other" },
  ],
  invoice: [
    { value: "commercial", label: "Commercial Document (Invoice, PO)" },
    { value: "shipment", label: "Shipment (Shipping Bill, Bill of Lading)" },
    { value: "service_export", label: "Service Export (Contract, Delivery Proof)" },
    { value: "payment_proof", label: "Payment Proof (FIRC, BRC)" },
    { value: "hedging_proof", label: "Hedging Proof (Exposure)" },
    { value: "other", label: "Other" },
  ],
};

export default function UploadDocumentModal({ open, onClose, onUploaded, entityType, entityId }: UploadDocumentModalProps) {
  const categories = CATEGORIES[entityType];
  const [category, setCategory] = useState<string>(categories[0].value);
  const [documentName, setDocumentName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (!documentName) {
        setDocumentName(selectedFile.name.split('.')[0]); // auto-fill name
      }
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!documentName) {
      setError("Please provide a document name.");
      return;
    }
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }
    
    setSubmitting(true);
    try {
      if (!supabase) throw new Error("Supabase client not initialized.");

      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error("Failed to upload file to storage: " + uploadError.message);
      }

      const doc = await documentApi.uploadDocument(entityType, entityId, category, documentName, filePath);
      onUploaded(doc);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload document.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload Document" description="Upload compliance or KYC documents.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Select label="Document Category" value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>

        <Input
          label="Document Name"
          type="text"
          required
          value={documentName}
          onChange={(e) => setDocumentName(e.target.value)}
          placeholder="e.g. IEC Certificate"
        />
        
        <div>
          <label className="block text-[13px] font-medium text-ink mb-1.5">File (PDF, PNG, JPG)</label>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileChange}
            required
            className="block w-full text-[13px] text-ink-muted
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-[13px] file:font-semibold
              file:bg-surface-2 file:text-ink
              hover:file:bg-surface-3 transition-colors
              cursor-pointer"
          />
        </div>

        {error && <p className="text-[12.5px] text-signal-down">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Uploading…" : "Upload Document"}
        </Button>
      </form>
    </Modal>
  );
}
