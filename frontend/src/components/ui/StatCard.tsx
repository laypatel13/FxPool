import type { LucideIcon } from "lucide-react";
import Card from "./Card";
import { cn } from "../../lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "up" | "down" | "muted";
  icon?: LucideIcon;
  hint?: string;
}

export default function StatCard({ label, value, delta, deltaTone = "muted", icon: Icon, hint }: StatCardProps) {
  return (
    <Card instrument className="p-6">
      <div className="flex items-start justify-between">
        <p className="text-[13px] text-ink-muted">{label}</p>
        {Icon && <Icon size={16} className="text-ink-faint" strokeWidth={1.75} />}
      </div>
      <p className="tnum mt-3 text-[28px] leading-none text-ink">{value}</p>
      <div className="mt-3 flex items-center gap-2">
        {delta && (
          <span
            className={cn(
              "tnum text-[12px]",
              deltaTone === "up" && "text-signal-up",
              deltaTone === "down" && "text-signal-down",
              deltaTone === "muted" && "text-ink-faint"
            )}
          >
            {delta}
          </span>
        )}
        {hint && <span className="text-[12px] text-ink-faint">{hint}</span>}
      </div>
    </Card>
  );
}
