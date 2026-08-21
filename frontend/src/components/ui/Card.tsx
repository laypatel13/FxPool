import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  instrument?: boolean; // adds the corner-bracket "instrument tag" signature
  illuminated?: boolean; // adds the hairline top-lit edge
}

export default function Card({
  className,
  elevated = false,
  instrument = false,
  illuminated = true,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line",
        elevated ? "bg-surface-2 shadow-raised" : "bg-surface-1 shadow-card",
        illuminated && "edge-illuminated",
        instrument && "instrument-corner",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
