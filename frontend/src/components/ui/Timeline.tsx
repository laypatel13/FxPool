import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

export interface TimelineStep {
  key: string;
  label: string;
  timestamp?: string;
  description?: string;
}

interface TimelineProps {
  steps: TimelineStep[];
  currentIndex: number; // steps before this are complete, this one is active
}

export default function Timeline({ steps, currentIndex }: TimelineProps) {
  return (
    <ol className="relative">
      {steps.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const isLast = i === steps.length - 1;
        return (
          <li key={step.key} className="relative flex gap-4 pb-8 last:pb-0">
            {!isLast && (
              <span
                className={cn(
                  "absolute left-[13px] top-7 h-[calc(100%-14px)] w-px",
                  done ? "bg-accent/50" : "bg-line-strong"
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium",
                done && "border-accent bg-accent text-base",
                active && !done && "border-accent bg-accent-soft text-accent",
                !done && !active && "border-line-strong bg-surface-2 text-ink-faint"
              )}
            >
              {done ? <Check size={13} strokeWidth={2.5} /> : i + 1}
            </span>
            <div className="pt-0.5">
              <p className={cn("text-[14px] font-medium", done || active ? "text-ink" : "text-ink-faint")}>
                {step.label}
              </p>
              {step.description && <p className="mt-0.5 text-[13px] text-ink-muted">{step.description}</p>}
              {step.timestamp && <p className="tnum mt-1 text-[12px] text-ink-faint">{step.timestamp}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
