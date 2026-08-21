import { Check, Minus } from "lucide-react";
import { Link } from "react-router-dom";
import PublicNavbar from "../../components/layout/PublicNavbar";
import PublicFooter from "../../components/layout/PublicFooter";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

const comparison = [
  { label: "Minimum contract size", bank: "$50,000+", fxpool: "$100" },
  { label: "Platform fee", bank: "—", fxpool: "0.35% of notional" },
  { label: "Indicative spread over mid-rate", bank: "0.8% – 1.5%", fxpool: "0.25% – 0.4%" },
  { label: "Onboarding time", bank: "2–4 weeks", fxpool: "Same day" },
  { label: "Custody of funds", bank: "Bank-held", fxpool: "Never held by FxPool" },
];

const tiers = [
  {
    name: "Standard",
    price: "0.35%",
    unit: "of notional, per contract",
    description: "For exporters hedging occasional invoices.",
    features: ["Pooled forward contracts", "Real-time indicative rates", "Settlement tracking", "Email support"],
  },
  {
    name: "Growth",
    price: "0.25%",
    unit: "of notional, per contract",
    description: "For exporters hedging consistently, every month.",
    features: ["Everything in Standard", "Priority pool placement", "Dedicated relationship manager", "Monthly exposure reports"],
    highlighted: true,
  },
];

export default function Pricing() {
  return (
    <div className="bg-base">
      <PublicNavbar />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <p className="text-[12px] uppercase tracking-wide text-accent">Pricing</p>
        <h1 className="mt-3 max-w-2xl font-display text-[36px] leading-tight text-ink">
          One transparent fee. No hidden bank spread.
        </h1>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              instrument
              elevated={tier.highlighted}
              className={`p-8 ${tier.highlighted ? "border-accent/30" : ""}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-medium text-ink">{tier.name}</p>
                {tier.highlighted && (
                  <span className="rounded-full border border-accent/30 bg-accent-soft px-2.5 py-1 text-[10.5px] uppercase tracking-wide text-accent">
                    Most exporters
                  </span>
                )}
              </div>
              <p className="mt-6 font-display text-[36px] text-ink">{tier.price}</p>
              <p className="text-[12.5px] text-ink-faint">{tier.unit}</p>
              <p className="mt-4 text-[13.5px] text-ink-muted">{tier.description}</p>
              <ul className="mt-6 space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-[13.5px] text-ink-muted">
                    <Check size={14} className="text-accent" strokeWidth={2} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/signup">
                <Button className="mt-8 w-full" variant={tier.highlighted ? "primary" : "secondary"}>
                  Get started
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-base-raised">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="font-display text-[26px] text-ink">FxPool vs. a bank-direct forward</h2>
          <div className="mt-8 overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-line bg-surface-1 text-ink-faint">
                  <th className="px-5 py-3.5 font-normal">Metric</th>
                  <th className="px-5 py-3.5 font-normal">Traditional bank</th>
                  <th className="px-5 py-3.5 font-normal text-accent">FxPool</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? "bg-surface-1/50" : ""}>
                    <td className="px-5 py-4 text-ink-muted">{row.label}</td>
                    <td className="tnum px-5 py-4 text-ink-faint">
                      {row.bank === "—" ? <Minus size={14} /> : row.bank}
                    </td>
                    <td className="tnum px-5 py-4 text-ink">{row.fxpool}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
