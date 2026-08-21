import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, hint, className, id, ...props }, ref) => {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-medium text-ink-muted">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          "w-full rounded-xl border border-line-strong bg-surface-1 px-4 py-3 text-[14px] text-ink placeholder:text-ink-faint",
          "transition-colors duration-200 ease-instrument focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/40",
          error && "border-signal-down/60",
          className
        )}
        {...props}
      />
      {error ? (
        <p className="text-[12px] text-signal-down">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
});
Input.displayName = "Input";

export default Input;
