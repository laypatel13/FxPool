import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { useAuth } from "../../../hooks/useAuth";

export default function Login() {
  const { signInWithPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithPassword(email, password);
      navigate("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Sign in to FxPool" subtitle="Access your hedging dashboard and settlement history.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          name="email"
          placeholder="you@company.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          name="password"
          placeholder="••••••••"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-[12.5px] text-signal-down">{error}</p>}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 text-[13px] text-ink-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-line-strong bg-surface-1 accent-accent"
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-[13px] text-accent hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-6 text-center text-[13px] text-ink-muted">
        New to FxPool?{" "}
        <Link to="/signup" className="text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
