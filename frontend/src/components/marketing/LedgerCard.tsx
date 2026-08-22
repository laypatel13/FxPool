import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import ProgressBar from "../ui/ProgressBar";

const members = [
  { name: "Exporter A", amount: "$2,000", filled: true },
  { name: "Exporter B", amount: "$3,500", filled: true },
  { name: "Exporter C", amount: "$1,200", filled: false },
];

export default function LedgerCard() {
  const fillPct = 78;
  return (
    <Card instrument elevated className="w-full max-w-md p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-3 text-[11px] text-accent">
            $
          </span>
          <span className="font-display text-[15px] text-ink">FxPool</span>
        </div>
        <span className="rounded-full border border-line-strong px-2.5 py-1 text-[10.5px] uppercase tracking-wide text-ink-faint">
          GIFT City IFSC
        </span>
      </div>

      <div className="mt-6 rounded-xl border border-line bg-base/60 p-5">
        <p className="text-[11px] uppercase tracking-wide text-ink-faint">USD / INR forward — 60d</p>
        <p className="tnum mt-2 text-[30px] leading-none text-ink">
          ₹84.30 <span className="text-[14px] font-normal text-ink-faint">locked</span>
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-surface-2 px-3.5 py-2.5">
            <p className="text-[10.5px] text-ink-faint">Notional</p>
            <p className="tnum text-[14px] text-ink">$2,000</p>
          </div>
          <div className="rounded-lg bg-surface-2 px-3.5 py-2.5">
            <p className="text-[10.5px] text-ink-faint">Settlement</p>
            <p className="tnum text-[14px] text-ink">T+60</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-line p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-wide text-ink-faint">Pool 0091 filling</p>
          <Badge tone="warn">Collecting</Badge>
        </div>
        <ul className="space-y-2.5">
          {members.map((m) => (
            <li key={m.name} className="flex items-center justify-between text-[13px]">
              <span className={m.filled ? "text-ink" : "text-ink-faint"}>{m.name}</span>
              <span className="tnum text-ink">{m.amount}</span>
            </li>
          ))}
        </ul>
        <ProgressBar value={fillPct} className="mt-4" tone="accent" />
      </div>

      <Button variant="primary" className="mt-4 w-full">
        Lock this rate
      </Button>
    </Card>
  );
}
