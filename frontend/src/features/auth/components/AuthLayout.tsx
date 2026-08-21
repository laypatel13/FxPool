import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import Logo from "../ui/Logo";
import { ShieldCheck } from "lucide-react";

const trustPoints = [
  "No custody of client funds, ever",
  "Contracts executed via licensed GIFT City IFSC banking units",
  "Bank-grade forward pricing from $100 notional",
];

export default function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-base lg:grid-cols-2">
      <div className="flex flex-col justify-between px-6 py-8 sm:px-12 lg:py-12">
        <Link to="/">
          <Logo />
        </Link>
        <div className="mx-auto w-full max-w-sm py-12">
          <h1 className="font-display text-[26px] text-ink">{title}</h1>
          {subtitle && <p className="mt-2 text-[13.5px] text-ink-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
        <p className="text-[12px] text-ink-faint">© {new Date().getFullYear()} FxPool Financial Services (IFSC) Pvt. Ltd.</p>
      </div>

      <div className="field-dotgrid relative hidden border-l border-line bg-base-raised lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="max-w-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line-strong bg-surface-2 text-accent">
            <ShieldCheck size={18} strokeWidth={1.75} />
          </span>
          <p className="mt-6 font-display text-[22px] leading-snug text-ink">
            Institutional infrastructure, built for small exporters.
          </p>
          <ul className="mt-8 space-y-4">
            {trustPoints.map((point) => (
              <li key={point} className="flex items-start gap-3 text-[13.5px] text-ink-muted">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
