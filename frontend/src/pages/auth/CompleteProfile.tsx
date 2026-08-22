import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/layout/AuthLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { peekPendingProfile, useAuth } from "../../hooks/useAuth";
import type { Role } from "../../types";
import { cn } from "../../lib/utils";
import { homeForRole } from "../../lib/constants";

export default function CompleteProfile() {
  const { isAuthenticated, profile, completeProfile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pending = peekPendingProfile();
  const [role, setRole] = useState<Role>(pending?.role ?? "exporter");
  const [form, setForm] = useState({
    full_name: pending?.full_name ?? "",
    company_name: pending?.company_name ?? "",
    invitation_code: pending?.invitation_code ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (profile) return <Navigate to={homeForRole(profile.role)} replace />;

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const next = await completeProfile({
        role,
        full_name: form.full_name,
        company_name: role === "admin" ? undefined : form.company_name,
        invitation_code: role === "admin" ? undefined : form.invitation_code,
      });
      navigate(homeForRole(next.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish setting up your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthLayout
      title="Finish your exporter setup"
      subtitle="Your login worked, but FXPool still needs a profile and bank invitation code before you can open the dashboard."
    >
      <div className="mb-6 grid grid-cols-3 gap-1 rounded-full border border-line-strong bg-surface-1 p-1">
        {(["exporter", "bank", "admin"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={cn(
              "rounded-full py-2 text-[12px] font-medium capitalize transition-colors duration-200 ease-instrument",
              role === r ? "bg-ink text-base" : "text-ink-muted hover:text-ink"
            )}
          >
            {r}
          </button>
        ))}
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        {role !== "admin" && (
          <Input
            label={role === "bank" ? "Bank / desk name" : "Company name"}
            name="company_name"
            required
            value={form.company_name}
            onChange={update("company_name")}
          />
        )}
        <Input label="Full name" name="full_name" required value={form.full_name} onChange={update("full_name")} />
        {role !== "admin" && (
          <Input
            label="Invitation code"
            name="invitation_code"
            required
            value={form.invitation_code}
            onChange={update("invitation_code")}
            placeholder={role === "bank" ? "SBI-BANK-DEMO" : "SBI-EXP-A1"}
            hint="Use the same bank invitation you received at signup."
          />
        )}
        {error && <p className="text-[12.5px] text-signal-down">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={saving}>
          {saving ? "Saving…" : "Create profile and continue"}
        </Button>
      </form>
      <p className="mt-6 text-center text-[13px] text-ink-muted">
        Wrong account or stuck in a loop?{" "}
        <button 
          type="button"
          onClick={async () => {
            await signOut();
            navigate("/login");
          }}
          className="text-accent hover:underline"
        >
          Sign out
        </button>
      </p>
    </AuthLayout>
  );
}
