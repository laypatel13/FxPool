import { cn } from "../../lib/utils";

interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  tone?: "accent" | "warn" | "up" | "down";
  className?: string;
}

const toneClasses = {
  accent: "bg-accent",
  warn: "bg-signal-warn",
  up: "bg-signal-up",
  down: "bg-signal-down",
};

export default function ProgressBar({ value, label, tone = "accent", className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-[12px]">
          <span className="text-ink-muted">{label}</span>
          <span className="tnum text-ink">{clamped.toFixed(0)}%</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-instrument", toneClasses[tone])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
