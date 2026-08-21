import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-ink text-base hover:bg-white shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_10px_24px_-8px_rgba(0,0,0,0.6)] active:scale-[0.98]",
  secondary:
    "bg-surface-2 text-ink border border-line-strong hover:bg-surface-3 hover:border-line-accent active:scale-[0.98]",
  outline:
    "bg-transparent text-ink border border-line-strong hover:border-accent/60 hover:text-accent active:scale-[0.98]",
  ghost: "bg-transparent text-ink-muted hover:text-ink hover:bg-surface-2/60",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-[13px] px-3.5 py-2 rounded-full",
  md: "text-[14px] px-5 py-2.5 rounded-full",
  lg: "text-[15px] px-6 py-3.5 rounded-full",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 ease-instrument whitespace-nowrap disabled:opacity-40 disabled:pointer-events-none",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export default Button;
