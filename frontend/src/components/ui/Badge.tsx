import { cn } from "../../lib/utils";

type Tone = "muted" | "warn" | "accent" | "up" | "down";

const toneClasses: Record<Tone, string> = {
  muted: "bg-surface-3 text-ink-muted border-line-strong",
  warn: "bg-signal-warn/10 text-signal-warn border-signal-warn/30",
  accent: "bg-accent-soft text-accent border-accent/30",
  up: "bg-signal-up/10 text-signal-up border-signal-up/30",
  down: "bg-signal-down/10 text-signal-down border-signal-down/30",
};

export default function Badge({ tone = "muted", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide",
        toneClasses[tone]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
