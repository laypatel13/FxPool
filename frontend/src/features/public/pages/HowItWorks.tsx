import { useState } from "react";
import { Link } from "react-router-dom";
import PublicNavbar from "../components/PublicNavbar";
import PublicFooter from "../components/PublicFooter";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { cn } from "../../../lib/utils";

const steps = [
  {
    title: "Upload invoice",
    detail:
      "Enter the invoice amount, currency, and due date. FxPool reads the terms and shows an indicative forward rate immediately — no document review wait.",
    figure: { label: "Invoice", rows: [["Amount", "$2,000"], ["Currency", "USD"], ["Due date", "18 Oct 2026"]] },
  },
  {
    title: "Select hedge duration",
    detail:
      "The settlement window is proposed automatically from your due date, bucketed to the nearest active window so your invoice can pool efficiently.",
    figure: { label: "Hedge window", rows: [["Bucket", "01–31 Oct 2026"], ["Width", "30 days"], ["Type", "Standard forward"]] },
  },
  {
    title: "Join a pool",
    detail:
      "Your invoice is grouped with others in the same currency and settlement window — you can see exactly who else is in the pool and how full it is.",
    figure: { label: "Pool 0091", rows: [["Members", "4 exporters"], ["Filled", "$41,200"], ["Status", "Collecting"]] },
  },
  {
    title: "Pool reaches target size",
    detail:
      "Once total pool value crosses the admin-set minimum, it's queued for execution — you'll see the status change to \"Ready to execute\" in your dashboard.",
    figure: { label: "Pool 0091", rows: [["Target", "$50,000"], ["Progress", "82%"], ["Status", "Ready to execute"]] },
  },
  {
    title: "Forward contract executed",
    detail:
      "FxPool routes the pooled amount through a licensed GIFT City IFSC banking unit, which executes a single forward contract at one locked rate for the whole pool.",
    figure: { label: "Contract", rows: [["Rate locked", "₹84.30"], ["Counterparty", "IFSC banking unit"], ["Status", "Executed"]] },
  },
  {
    title: "Settlement completed",
    detail:
      "On the settlement date, funds move directly between your account and the banking unit at the locked rate — FxPool never touches the money in transit.",
    figure: { label: "Settlement", rows: [["Payout", "₹1,68,600"], ["Settled on", "18 Oct 2026"], ["Status", "Complete"]] },
  },
];

export default function HowItWorks() {
  const [active, setActive] = useState(0);
  const step = steps[active];

  return (
    <div className="bg-base">
      <PublicNavbar />
      <section className="mx-auto max-w-7xl px-6 py-20">
        <p className="text-[12px] uppercase tracking-wide text-accent">How it works</p>
        <h1 className="mt-3 max-w-2xl font-display text-[36px] leading-tight text-ink">
          Six steps between an unhedged invoice and a locked rate.
        </h1>

        <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-[280px_1fr]">
          <ol className="space-y-1">
            {steps.map((s, i) => (
              <li key={s.title}>
                <button
                  onClick={() => setActive(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors",
                    i === active ? "bg-surface-1 border border-line-strong" : "border border-transparent hover:bg-surface-1/60"
                  )}
                >
                  <span
                    className={cn(
                      "tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px]",
                      i === active ? "bg-accent text-base" : "bg-surface-2 text-ink-faint"
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className={cn("text-[13.5px]", i === active ? "text-ink" : "text-ink-muted")}>{s.title}</span>
                </button>
              </li>
            ))}
          </ol>

          <Card instrument className="p-8">
            <span className="tnum text-[12px] text-ink-faint">
              Step {active + 1} of {steps.length}
            </span>
            <h2 className="mt-2 font-display text-[26px] text-ink">{step.title}</h2>
            <p className="mt-4 max-w-lg text-[14.5px] leading-relaxed text-ink-muted">{step.detail}</p>

            <div className="mt-8 max-w-sm rounded-xl border border-line bg-base/60 p-5">
              <p className="text-[11px] uppercase tracking-wide text-ink-faint">{step.figure.label}</p>
              <div className="mt-3 space-y-2.5">
                {step.figure.rows.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-[13px]">
                    <span className="text-ink-muted">{k}</span>
                    <span className="tnum text-ink">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Button variant="secondary" size="sm" disabled={active === 0} onClick={() => setActive((a) => a - 1)}>
                Previous
              </Button>
              {active < steps.length - 1 ? (
                <Button size="sm" onClick={() => setActive((a) => a + 1)}>
                  Next step
                </Button>
              ) : (
                <Link to="/signup">
                  <Button size="sm">Lock your first rate</Button>
                </Link>
              )}
            </div>
          </Card>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
