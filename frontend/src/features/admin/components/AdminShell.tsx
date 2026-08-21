import { type ReactNode, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Gauge,
  Users,
  FileSearch,
  Layers,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
} from "lucide-react";
import Logo from "../ui/Logo";
import { cn, initials } from "../../../lib/utils";
import { useAuth } from "../../../hooks/useAuth";

const nav = [
  { to: "/admin", label: "Overview", icon: Gauge, end: true },
  { to: "/admin/users", label: "Exporters", icon: Users },
  { to: "/admin/invoices", label: "Invoice review", icon: FileSearch },
  { to: "/admin/pools", label: "Pools & contracts", icon: Layers },
  { to: "/admin/banks", label: "Banking Partners", icon: Building2 },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/settings", label: "Pool settings", icon: Settings },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-base font-sans">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-base-raised md:flex">
        <div className="flex h-14 items-center justify-between border-b border-line px-5">
          <Link to="/admin" className="flex items-center gap-2">
            <Logo mark={false} />
          </Link>
          <span className="rounded border border-line-strong bg-surface-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink-faint">
            Ops
          </span>
        </div>
        <nav className="flex-1 space-y-0.5 px-2.5 py-5">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors",
                  isActive ? "bg-surface-2 text-ink" : "text-ink-muted hover:bg-surface-1 hover:text-ink"
                )
              }
            >
              <item.icon size={15} strokeWidth={1.75} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10.5px] font-medium text-ink">
              {profile ? initials(profile.full_name) : "—"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] text-ink">{profile?.full_name ?? "Loading…"}</p>
              <p className="truncate text-[11px] text-ink-faint">Treasury operations</p>
            </div>
            <button onClick={handleSignOut} aria-label="Sign out" className="text-ink-faint hover:text-ink">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-60 border-r border-line bg-base-raised">
            <div className="flex h-14 items-center justify-between border-b border-line px-5">
              <Logo mark={false} />
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X size={18} className="text-ink-muted" />
              </button>
            </div>
            <nav className="space-y-0.5 px-2.5 py-5">
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px]",
                      isActive ? "bg-surface-2 text-ink" : "text-ink-muted"
                    )
                  }
                >
                  <item.icon size={15} strokeWidth={1.75} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}

      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-base/90 px-5 backdrop-blur-md">
          <button className="text-ink-muted md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <p className="hidden text-[12px] text-ink-faint md:block">FxPool Treasury Console</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[11px] text-ink-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-signal-up" />
              Systems nominal
            </span>
          </div>
        </header>
        <main className="px-5 py-7 md:px-8">{children}</main>
      </div>
    </div>
  );
}
