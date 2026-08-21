import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, className, id, children, ...props }, ref) => {
  const selectId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-[13px] font-medium text-ink-muted">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "w-full appearance-none rounded-xl border border-line-strong bg-surface-1 px-4 py-3 pr-10 text-[14px] text-ink",
            "transition-colors duration-200 ease-instrument focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/40",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
      </div>
    </div>
  );
});
Select.displayName = "Select";

export default Select;
