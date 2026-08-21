import { useState, useEffect, type FormEvent } from "react";
import DashboardShell from "../components/DashboardShell";
import Card from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import UploadDocumentModal from "../components/UploadDocumentModal";
import { useAuth } from "../../../hooks/useAuth";
import { updateMyProfile, documentApi } from "../../../lib/services";
import { initials } from "../../../lib/utils";
import type { Document } from "../../../types";

export default function Profile() {
  const { profile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [companyName, setCompanyName] = useState(profile?.company_name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const fetchDocs = async () => {
    if (!profile) return;
    try {
      const docs = await documentApi.getDocumentsByEntity("profile", profile.id);
      setDocuments(docs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [profile]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await updateMyProfile({ full_name: fullName, company_name: companyName });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell>
      <h1 className="font-display text-[26px] text-ink">Profile & company</h1>
      <p className="mt-1 text-[13.5px] text-ink-muted">Update your account and company details.</p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-[16px] font-medium text-ink">
              {profile ? initials(profile.full_name) : "—"}
            </span>
            <div>
              <p className="text-[14.5px] text-ink">{profile?.full_name}</p>
              <p className="mt-0.5 text-[12.5px] text-ink-muted">{profile?.company_name}</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-ink-muted">Account type</span>
              <Badge tone="accent">{profile?.role === "admin" ? "Admin" : "Exporter"}</Badge>
            </div>
          </div>
        </Card>

        <Card instrument className="p-6 lg:col-span-2">
          <p className="text-[14.5px] font-medium text-ink">Account details</p>
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <Input label="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            {error && <p className="text-[12.5px] text-signal-down">{error}</p>}
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
              {saved && <span className="text-[12.5px] text-signal-up">Saved</span>}
            </div>
          </form>
        </Card>

        {/* KYC Documents Section */}
        <Card className="p-6 lg:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[14.5px] font-medium text-ink">KYC & Compliance Documents</p>
              <p className="mt-1 text-[13px] text-ink-muted">Upload your business registration and identity documents.</p>
            </div>
            <Button size="sm" onClick={() => setUploadModalOpen(true)}>
              Upload Document
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-line-strong text-ink-muted">
                  <th className="pb-3 pr-4 font-medium">Document Name</th>
                  <th className="pb-3 pr-4 font-medium">Category</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-ink-muted">
                      No documents uploaded yet.
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id} className="text-ink">
                      <td className="py-3 pr-4">{doc.document_name}</td>
                      <td className="py-3 pr-4 capitalize">{doc.category.replace('_', ' ')}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={doc.status === 'verified' ? 'up' : doc.status === 'rejected' ? 'down' : 'warn'}>
                          {doc.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-ink-muted">{new Date(doc.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <UploadDocumentModal 
        open={uploadModalOpen} 
        onClose={() => setUploadModalOpen(false)} 
        onUploaded={fetchDocs} 
        entityType="profile" 
        entityId={profile?.id || ""} 
      />
    </DashboardShell>
  );
}
