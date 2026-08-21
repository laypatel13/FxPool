import { useState } from "react";
import { CalendarDays, Mail, Building2 } from "lucide-react";
import PublicNavbar from "../components/PublicNavbar";
import PublicFooter from "../components/PublicFooter";
import Card from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Button from "../../../components/ui/Button";

const slots = ["Tue 25 Aug · 10:00 AM", "Tue 25 Aug · 2:30 PM", "Wed 26 Aug · 11:15 AM", "Thu 27 Aug · 4:00 PM"];

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [slot, setSlot] = useState(slots[0]);

  if (submitted) {
    return (
      <div className="bg-base">
        <PublicNavbar />
        <section className="mx-auto flex max-w-xl flex-col items-center px-6 py-32 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <CalendarDays size={20} strokeWidth={1.75} />
          </span>
          <h1 className="mt-6 font-display text-[28px] text-ink">Demo booked</h1>
          <p className="mt-3 text-[14.5px] text-ink-muted">
            We've scheduled your walkthrough for <span className="text-ink">{slot}</span>. A calendar invite and
            prep notes are on their way to your inbox.
          </p>
        </section>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="bg-base">
      <PublicNavbar />
      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-14 px-6 py-20 lg:grid-cols-2">
        <div>
          <p className="text-[12px] uppercase tracking-wide text-accent">Book a demo</p>
          <h1 className="mt-3 font-display text-[32px] leading-tight text-ink">
            Talk to the FxPool treasury team.
          </h1>
          <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-ink-muted">
            For banks, export associations, and treasury teams evaluating FxPool for a broader exporter base — we'll
            walk through pooling mechanics, settlement infrastructure, and integration options.
          </p>
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3 text-[13.5px] text-ink-muted">
              <Mail size={16} className="text-ink-faint" strokeWidth={1.75} />
              partnerships@fxpool.io
            </div>
            <div className="flex items-center gap-3 text-[13.5px] text-ink-muted">
              <Building2 size={16} className="text-ink-faint" strokeWidth={1.75} />
              GIFT City, Gandhinagar, India
            </div>
          </div>
        </div>

        <Card instrument className="p-7">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Input label="Full name" name="name" placeholder="Ananya Rao" required />
              <Input label="Work email" name="email" type="email" placeholder="you@company.com" required />
            </div>
            <Input label="Company / institution" name="company" placeholder="Coastline Textiles Pvt. Ltd." required />
            <Select label="What best describes you?" name="segment" defaultValue="exporter">
              <option value="exporter">MSME exporter</option>
              <option value="bank">Bank / financial institution</option>
              <option value="association">Export association</option>
              <option value="other">Other</option>
            </Select>
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-ink-muted">Preferred slot</p>
              <div className="grid grid-cols-2 gap-2.5">
                {slots.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setSlot(s)}
                    className={`rounded-xl border px-3.5 py-2.5 text-left text-[12.5px] transition-colors ${
                      slot === s
                        ? "border-accent/50 bg-accent-soft text-ink"
                        : "border-line-strong bg-surface-1 text-ink-muted hover:border-line-accent"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg">
              Confirm demo
            </Button>
          </form>
        </Card>
      </section>
      <PublicFooter />
    </div>
  );
}
