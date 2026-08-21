import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "../../../lib/utils";

export default function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line py-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 text-left"
        aria-expanded={open}
      >
        <span className="text-[15px] text-ink">{question}</span>
        <Plus size={16} className={cn("shrink-0 text-ink-faint transition-transform duration-300 ease-instrument", open && "rotate-45")} />
      </button>
      <div
        className={cn(
          "grid overflow-hidden transition-all duration-300 ease-instrument",
          open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <p className="min-h-0 text-[14px] leading-relaxed text-ink-muted">{answer}</p>
      </div>
    </div>
  );
}
