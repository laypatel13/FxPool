import { Link } from "react-router-dom";
import { ShieldCheck, Layers, Building2, ArrowRight, Wallet, GitBranch, Landmark } from "lucide-react";
import PublicNavbar from "../components/PublicNavbar";
import PublicFooter from "../components/PublicFooter";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import LedgerCard from "../components/LedgerCard";
import FaqItem from "../components/FaqItem";

const stats = [
  { value: "35%", label: "MSME exporters hedging today" },
  { value: "$50k+", label: "Typical bank minimum" },
  { value: "$100", label: "FxPool minimum" },
];

const pillars = [
  {
    icon: ShieldCheck,
    title: "No custody of funds",
    description: "FxPool never holds client money. Settlement always flows through the regulated IFSC banking unit.",
  },
  {
    icon: Layers,
    title: "Automated pooling",
    description: "Rule-based date bucketing groups your invoice with others in a similar window, automatically.",
  },
  {
    icon: Building2,
    title: "Real IFSC infrastructure",
    description: "Every hedge executes as a standard forward contract through a licensed GIFT City banking unit.",
  },
];

const journey = [
  { title: "Upload invoice", description: "Enter the invoice amount, currency, and due date. Takes under two minutes." },
  { title: "Select hedge duration", description: "FxPool proposes a settlement window based on your due date." },
  { title: "Join a pool", description: "Your invoice is bucketed with others in the same currency and window." },
  { title: "Pool reaches target size", description: "Once the pool crosses the minimum, it's queued for execution." },
  { title: "Forward contract executed", description: "The pool locks one bank-grade rate through the IFSC banking unit." },
  { title: "Settlement completed", description: "Funds settle on schedule; your share pays out at the locked rate." },
];

const flow = [
  { icon: Wallet, label: "Exporter", detail: "Uploads invoice, joins pool" },
  { icon: GitBranch, label: "FxPool platform", detail: "Pools, routes — never holds funds" },
  { icon: Landmark, label: "IFSC banking unit", detail: "Executes & settles the contract" },
];

const faqs = [
  {
    q: "Is FxPool a crypto product or trading platform?",
    a: "No. FxPool is regulated treasury infrastructure. Every hedge is a standard forward currency contract executed through a licensed GIFT City IFSC banking unit — there is no trading, speculation, or crypto exposure involved.",
  },
  {
    q: "Does FxPool ever hold my money?",
    a: "No. FxPool never takes custody of client funds. Settlement flows directly between your account and the regulated banking unit; FxPool's role is to pool invoices and route the contract.",
  },
  {
    q: "What happens if my pool doesn't fill in time?",
    a: "Your invoice stays visible in your dashboard with its status. If a bucket window closes before reaching the minimum, it rolls into the next compatible pool automatically — you'll see the update in your settlement timeline.",
  },
  {
    q: "What's the smallest invoice I can hedge?",
    a: "Invoices from $100 are eligible for pooling, compared to the $50,000+ minimums typical of bank-direct forward contracts.",
  },
];

export default function Landing() {
  return (
    <div className="bg-base">
      <PublicNavbar />

      {/* Hero */}
      <section className="field-dotgrid relative overflow-hidden border-b border-line">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 py-20 md:py-28 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface-1 px-3.5 py-1.5 text-[12px] text-ink-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Backed by GIFT City IFSC infrastructure
            </span>
            <h1 className="mt-6 font-display text-[42px] leading-[1.08] text-ink sm:text-[54px]">
              Hedge your export invoice, even if it's{" "}
              <span className="italic text-accent">$2,000</span>.
            </h1>
            <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-ink-muted">
              FxPool pools small exporters into one bulk forward contract, so you get bank-grade currency protection
              without the bank-grade minimum.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup">
                <Button size="lg">Lock your first rate</Button>
              </Link>
              <Link to="/how-it-works">
                <Button size="lg" variant="secondary">
                  See how pooling works
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <LedgerCard />
          </div>
        </div>
      </section>

      {/* Stat strip */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-6 py-10 sm:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.label} className="p-6">
              <p className="font-display tnum text-[26px] text-ink">{s.value}</p>
              <p className="mt-1 text-[13px] text-ink-muted">{s.label}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-xl">
          <p className="text-[12px] uppercase tracking-wide text-accent">Infrastructure</p>
          <h2 className="mt-3 font-display text-[30px] text-ink">Built for the exporter banks can't reach</h2>
          <p className="mt-3 text-[14px] text-ink-muted">Three pieces of infrastructure, one simple flow.</p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          {pillars.map((p) => (
            <Card key={p.title} instrument className="p-6">
              <p.icon size={18} strokeWidth={1.75} className="text-accent" />
              <p className="mt-4 text-[15px] font-medium text-ink">{p.title}</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{p.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Problem */}
      <section className="border-y border-line bg-base-raised">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-20 lg:grid-cols-2">
          <div>
            <p className="text-[12px] uppercase tracking-wide text-accent">The problem</p>
            <h2 className="mt-3 font-display text-[28px] leading-tight text-ink">
              Banks price forward contracts for treasuries, not invoices.
            </h2>
            <p className="mt-4 text-[14.5px] leading-relaxed text-ink-muted">
              A $50,000 minimum makes sense when a desk is pricing for a large corporate. For a $2,000 export
              invoice, it means the exporter carries the full currency risk alone — often the difference between a
              profitable order and a loss once the rupee moves.
            </p>
          </div>
          <div className="space-y-3">
            {[
              ["Minimum contract size", "$50,000+"],
              ["Typical onboarding time", "2–4 weeks"],
              ["MSME exporters served", "Under 35%"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-xl border border-line bg-surface-1 px-5 py-4">
                <span className="text-[13.5px] text-ink-muted">{label}</span>
                <span className="tnum text-[14px] text-ink">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How pooling works */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-xl">
          <p className="text-[12px] uppercase tracking-wide text-accent">How pooling works</p>
          <h2 className="mt-3 font-display text-[30px] text-ink">From invoice to locked rate</h2>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {journey.map((step, i) => (
            <Card key={step.title} className="p-6">
              <span className="tnum text-[12px] text-ink-faint">Step {i + 1} / {journey.length}</span>
              <p className="mt-3 text-[15px] font-medium text-ink">{step.title}</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{step.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Forward contract flow / trust */}
      <section className="border-y border-line bg-base-raised">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-xl">
            <p className="text-[12px] uppercase tracking-wide text-accent">Trust & settlement flow</p>
            <h2 className="mt-3 font-display text-[30px] text-ink">FxPool routes. It never holds.</h2>
            <p className="mt-3 text-[14px] text-ink-muted">
              Money moves directly between your account and the regulated banking unit, at every step.
            </p>
          </div>
          <div className="mt-12 flex flex-col items-stretch gap-4 md:flex-row md:items-center">
            {flow.map((step, i) => (
              <div key={step.label} className="flex flex-1 items-center gap-4">
                <Card instrument className="flex-1 p-6">
                  <step.icon size={18} strokeWidth={1.75} className="text-accent" />
                  <p className="mt-4 text-[14.5px] font-medium text-ink">{step.label}</p>
                  <p className="mt-1.5 text-[13px] text-ink-muted">{step.detail}</p>
                </Card>
                {i < flow.length - 1 && (
                  <ArrowRight size={18} className="hidden shrink-0 text-ink-faint md:block" strokeWidth={1.5} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <p className="text-[12px] uppercase tracking-wide text-accent">Questions</p>
        <h2 className="mt-3 font-display text-[30px] text-ink">Frequently asked</h2>
        <div className="mt-8">
          {faqs.map((f) => (
            <FaqItem key={f.q} question={f.q} answer={f.a} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-16 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-[26px] text-ink">Ready to hedge your next invoice?</h2>
            <p className="mt-2 text-[14px] text-ink-muted">Onboarding takes minutes. No minimum balance required.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/signup">
              <Button size="lg">Lock your first rate</Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="secondary">
                Talk to us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
