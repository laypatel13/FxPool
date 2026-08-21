import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import Button from "../../../components/ui/Button";

const LENGTH = 6;

export default function OtpVerification() {
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const navigate = useNavigate();

  const updateDigit = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < LENGTH - 1) refs.current[index + 1]?.focus();
  };

  const onKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) refs.current[index - 1]?.focus();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate("/app");
  };

  return (
    <AuthLayout title="Enter verification code" subtitle="We've sent a 6-digit code to your registered mobile number.">
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="flex gap-2.5">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={d}
              onChange={(e) => updateDigit(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              inputMode="numeric"
              maxLength={1}
              className="tnum h-13 w-11 rounded-xl border border-line-strong bg-surface-1 py-3 text-center text-[18px] text-ink focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/40"
            />
          ))}
        </div>
        <Button type="submit" size="lg" className="w-full">
          Verify code
        </Button>
        <p className="text-center text-[13px] text-ink-muted">
          Didn't get a code?{" "}
          <button type="button" className="text-accent hover:underline">
            Resend
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
