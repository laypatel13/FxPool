import { cn } from "../../lib/utils";

export default function Logo({ className, mark = true }: { className?: string; mark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {mark && (
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line-strong bg-surface-2 text-[13px] font-medium text-accent">
          $
        </span>
      )}
      <span className="font-display text-[17px] tracking-tight text-ink">FxPool</span>
    </span>
  );
}
