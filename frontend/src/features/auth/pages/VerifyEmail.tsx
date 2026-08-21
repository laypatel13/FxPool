import { useLocation, Link } from "react-router-dom";
import { MailCheck } from "lucide-react";
import AuthLayout from "../../components/AuthLayout";
import Button from "../../../components/ui/Button";

export default function VerifyEmail() {
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email ?? "your email";

  return (
    <AuthLayout title="Verify your email">
      <div className="flex flex-col items-start">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
          <MailCheck size={19} strokeWidth={1.75} />
        </span>
        <p className="mt-5 text-[13.5px] leading-relaxed text-ink-muted">
          We've sent a verification link to <span className="text-ink">{email}</span>. Open it on this device to
          activate your account.
        </p>
        <Button variant="secondary" className="mt-6" size="sm">
          Resend email
        </Button>
        <Link to="/login" className="mt-6 text-[13px] text-accent hover:underline">
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
