import { ShieldCheck, Landmark, FileCheck, Wallet, ArrowRight } from "lucide-react";
import PublicNavbar from "../../components/layout/PublicNavbar";
import PublicFooter from "../../components/layout/PublicFooter";
import Card from "../../components/ui/Card";

const custodyChain = [
  { icon: Wallet, label: "Exporter account", detail: "Funds originate and settle here — never at FxPool." },
  { icon: Landmark, label: "IFSC banking unit", detail: "Licensed entity holds and executes the forward contract." },
  { icon: FileCheck, label: "Settlement", detail: "Contract proceeds move directly back to the exporter." },
];

const compliance = [
  {
    title: "KYC & onboarding",
    detail: "Every exporter completes identity and company verification before an invoice can be pooled.",
  },
  {
    title: "Audit trail",
    detail: "Every pooling, execution, and settlement event is logged and reviewable by the compliance team.",
  },
  {
    title: "Licensed counterparties",
    detail: "Contracts execute exclusively through IFSC-licensed banking partners — never OTC or unregulated venues.",
  },
  {
    title: "Risk monitoring",
    detail: "Pool concentration and settlement timing are monitored continuously by the treasury operations team.",
  },
];

export default function Regulatory() {
  return (
    <div className="bg-base">
      <PublicNavbar />

      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <p className="text-[12px] uppercase tracking-wide text-accent">Regulatory & trust</p>
          <h1 className="mt-3 max-w-2xl font-display text-[36px] leading-tight text-ink">
            Regulated infrastructure, not a regulatory grey area.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
            FxPool operates as a routing and pooling layer on top of licensed GIFT City IFSC banking infrastructure.
            Every forward contract is a standard, regulated instrument — FxPool is not a party to the contract and
            never takes custody of client funds.
          </p>
        </div>
      </section>

      {/* Custody chain diagram */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="font-display text-[26px] text-ink">Where your money actually sits</h2>
        <p className="mt-2 max-w-xl text-[14px] text-ink-muted">
          At no point does an exporter's money touch an FxPool-controlled account.
        </p>
        <div className="mt-10 flex flex-col items-stretch gap-4 md:flex-row md:items-center">
          {custodyChain.map((step, i) => (
            <div key={step.label} className="flex flex-1 items-center gap-4">
              <Card instrument className="flex-1 p-6">
                <step.icon size={18} strokeWidth={1.75} className="text-accent" />
                <p className="mt-4 text-[14.5px] font-medium text-ink">{step.label}</p>
                <p className="mt-1.5 text-[13px] text-ink-muted">{step.detail}</p>
              </Card>
              {i < custodyChain.length - 1 && (
                <ArrowRight size={18} className="hidden shrink-0 text-ink-faint md:block" strokeWidth={1.5} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Compliance grid */}
      <section className="border-y border-line bg-base-raised">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-accent" strokeWidth={1.75} />
            <h2 className="font-display text-[26px] text-ink">Compliance center</h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {compliance.map((c) => (
              <Card key={c.title} className="p-6">
                <p className="text-[14.5px] font-medium text-ink">{c.title}</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{c.detail}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Banking partners note */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <Card instrument className="p-8">
          <p className="text-[12px] uppercase tracking-wide text-ink-faint">Banking infrastructure</p>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink">
            Forward contracts are executed through licensed banking units operating under India's GIFT City
            International Financial Services Centre framework — the same regulatory perimeter used by institutional
            treasury desks.
          </p>
        </Card>
      </section>

      <PublicFooter />
    </div>
  );
}
