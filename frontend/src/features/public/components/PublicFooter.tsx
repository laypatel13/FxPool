import { Link } from "react-router-dom";
import Logo from "../../../components/ui/Logo";

const columns = [
  {
    title: "Product",
    links: [
      { label: "How it works", to: "/how-it-works" },
      { label: "Pricing", to: "/pricing" },
      { label: "Regulatory", to: "/regulatory" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Book a demo", to: "/contact" },
      { label: "Sign in", to: "/login" },
      { label: "Create account", to: "/signup" },
    ],
  },
];

export default function PublicFooter() {
  return (
    <footer className="border-t border-line bg-base-raised">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col justify-between gap-12 md:flex-row">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
              Pooled forward contracts through regulated GIFT City IFSC infrastructure. Built for exporters banks
              can't reach.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-12">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="text-[12px] uppercase tracking-wide text-ink-faint">{col.title}</p>
                <ul className="mt-4 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link to={l.to} className="text-[13px] text-ink-muted hover:text-ink">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-16 flex flex-col gap-3 border-t border-line pt-6 text-[12px] text-ink-faint md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} FxPool Financial Services (IFSC) Pvt. Ltd. Not a crypto product. Not a trading platform.</p>
          <p>Forward contracts executed through licensed GIFT City IFSC banking units.</p>
        </div>
      </div>
    </footer>
  );
}
