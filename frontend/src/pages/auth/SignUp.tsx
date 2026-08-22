import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/layout/AuthLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import type { Role } from "../../types";
import { cn } from "../../lib/utils";
import { homeForRole } from "../../lib/constants";

const COPY: Record<Role, { title: string; subtitle: string; nameLabel: string; namePlaceholder: string }> = {
  exporter: {
    title: "Create your exporter account",
    subtitle: "Join with your bank’s invitation code. FXPool will only match you to that bank’s pools.",
    nameLabel: "Exporter name",
    namePlaceholder: "Ananya Rao",
  },
  bank: {
    title: "Create your bank portal account",
    subtitle: "Use the bank invitation code issued by FXPool admin.",
    nameLabel: "Treasury contact",
    namePlaceholder: "SBI Treasury",
  },
  admin: {
    title: "Create your admin account",
    subtitle: "Platform oversight — banks, risk, and configuration.",
    nameLabel: "Full name",
    namePlaceholder: "Admin name",
  },
};

export default function SignUp() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("exporter");
  const [form, setForm] = useState({
    company_name: "",
    full_name: "",
    email: "",
    mobile: "",
    password: "",
    invitation_code: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { needsEmailVerification } = await signUp({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        company_name: role === "admin" ? undefined : form.company_name,
        role,
        invitation_code: role === "admin" ? undefined : form.invitation_code,
      });
      navigate(needsEmailVerification ? "/verify-email" : homeForRole(role), { state: { email: form.email } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account.");
    } finally {
      setLoading(false);
    }
  };

  const copy = COPY[role];

  return (
    <AuthLayout title={copy.title} subtitle={copy.subtitle}>
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
            placeholder={role === "bank" ? "SBI Treasury" : "Coastline Textiles Pvt. Ltd."}
          />
        )}
        <Input label={copy.nameLabel} name="full_name" required value={form.full_name} onChange={update("full_name")} placeholder={copy.namePlaceholder} />
        {role !== "admin" && (
          <Input
            label="Invitation code"
            name="invitation_code"
            required
            value={form.invitation_code}
            onChange={update("invitation_code")}
            placeholder={role === "bank" ? "SBI-BANK-DEMO" : "SBI-EXP-A1"}
            hint={
              role === "bank"
                ? "Use SBI-BANK-DEMO or HDFC-BANK-DEMO. Do not type a bank name."
                : "Use SBI-EXP-A1 or HDFC-EXP-B1. Bank codes will not work on this tab."
            }
          />
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Email" type="email" name="email" required value={form.email} onChange={update("email")} placeholder="you@company.com" />
          <Input label="Mobile" type="tel" name="mobile" required value={form.mobile} onChange={update("mobile")} placeholder="+91 98765 43210" />
        </div>
        <Input label="Password" type="password" name="password" required value={form.password} onChange={update("password")} placeholder="At least 8 characters" />
        {error && <p className="text-[12.5px] text-signal-down">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : `Create ${role} account`}
        </Button>
      </form>
      <p className="mt-6 text-center text-[13px] text-ink-muted">
        Already have an account?{" "}
        <Link to="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
