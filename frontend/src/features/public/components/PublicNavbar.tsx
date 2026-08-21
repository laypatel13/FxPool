import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Logo from "../../../components/ui/Logo";
import Button from "../../../components/ui/Button";
import { cn } from "../../../lib/utils";

const links = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/regulatory", label: "Regulatory" },
  { to: "/pricing", label: "Pricing" },
];

export default function PublicNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-base/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  "text-[13px] transition-colors",
                  isActive ? "text-ink" : "text-ink-muted hover:text-ink"
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link to="/contact">
            <Button variant="secondary" size="sm">
              Book a demo
            </Button>
          </Link>
        </div>

        <button className="p-2 text-ink md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-line px-6 pb-6 pt-2 md:hidden">
          <nav className="flex flex-col gap-4">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="text-[14px] text-ink-muted hover:text-ink"
              >
                {l.label}
              </NavLink>
            ))}
            <div className="mt-2 flex gap-3">
              <Link to="/login" className="flex-1" onClick={() => setOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full">
                  Sign in
                </Button>
              </Link>
              <Link to="/contact" className="flex-1" onClick={() => setOpen(false)}>
                <Button variant="secondary" size="sm" className="w-full">
                  Book a demo
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
