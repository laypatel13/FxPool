import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/layout/AuthLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import type { Role } from "../../types";
import { cn } from "../../lib/utils";

const COPY: Record<Role, { title: string; subtitle: string; nameLabel: string; namePlaceholder: string }> = {
  exporter: {
    title: "Create your exporter account",
    subtitle: "Start hedging invoices from $100 in minutes.",
    nameLabel: "Exporter name",
    namePlaceholder: "Ananya Rao",
  },
  admin: {
    title: "Create your admin account",
    subtitle: "Internal access for managing pools, invoices and exporters.",
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
        company_name: role === "exporter" ? form.company_name : undefined,
        role,
      });
      navigate(needsEmailVerification ? "/verify-email" : "/app", { state: { email: form.email } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account.");
    } finally {
      setLoading(false);
    }
  };

  const copy = COPY[role];

  return (
    <AuthLayout title={copy.title} subtitle={copy.subtitle}>
      {/* Role switch — exporter vs admin. Lets the same signup flow create
          either account type, mainly so both roles are easy to test. */}
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-full border border-line-strong bg-surface-1 p-1">
        {(["exporter", "admin"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={cn(
              "rounded-full py-2 text-[13px] font-medium capitalize transition-colors duration-200 ease-instrument",
              role === r ? "bg-ink text-base" : "text-ink-muted hover:text-ink"
            )}
          >
            {r === "exporter" ? "Exporter" : "Admin"}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {role === "exporter" && (
          <Input
            label="Company name"
            name="company_name"
            required
            value={form.company_name}
            onChange={update("company_name")}
            placeholder="Coastline Textiles Pvt. Ltd."
          />
        )}
        <Input label={copy.nameLabel} name="full_name" required value={form.full_name} onChange={update("full_name")} placeholder={copy.namePlaceholder} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Email" type="email" name="email" required value={form.email} onChange={update("email")} placeholder="you@company.com" />
          <Input label="Mobile" type="tel" name="mobile" required value={form.mobile} onChange={update("mobile")} placeholder="+91 98765 43210" />
        </div>
        <Input label="Password" type="password" name="password" required value={form.password} onChange={update("password")} placeholder="At least 8 characters" hint="Use at least 8 characters with a mix of letters and numbers." />
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