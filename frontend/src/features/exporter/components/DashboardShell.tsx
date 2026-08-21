import { type ReactNode, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  FileText,
  Layers,
  Clock,
  History,
  UserRound,
  LogOut,
  Menu,
  X,
  Bell,
} from "lucide-react";
import Logo from "../ui/Logo";
import { cn, initials } from "../../../lib/utils";
import { useAuth } from "../../../hooks/useAuth";

const nav = [
  { to: "/app", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/app/invoices", label: "Invoices", icon: FileText },
  { to: "/app/pools", label: "Pool marketplace", icon: Layers },
  { to: "/app/settlements", label: "Settlements", icon: Clock },
  { to: "/app/history", label: "Transaction history", icon: History },
  { to: "/app/profile", label: "Profile & company", icon: UserRound },
];

export default function DashboardShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-base">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-base-raised md:flex">
        <div className="flex h-16 items-center border-b border-line px-6">
          <Link to="/app">
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-6">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-colors",
                  isActive
                    ? "bg-surface-2 text-ink border border-line-strong"
                    : "text-ink-muted hover:bg-surface-1 hover:text-ink border border-transparent"
                )
              }
            >
              <item.icon size={16} strokeWidth={1.75} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-medium text-ink">
              {profile ? initials(profile.full_name) : "—"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-ink">{profile?.full_name ?? "Loading…"}</p>
              <p className="truncate text-[11px] text-ink-faint">{profile?.company_name}</p>
            </div>
            <button onClick={handleSignOut} aria-label="Sign out" className="text-ink-faint hover:text-ink">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar — mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-line bg-base-raised">
            <div className="flex h-16 items-center justify-between border-b border-line px-6">
              <Logo />
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X size={18} className="text-ink-muted" />
              </button>
            </div>
            <nav className="space-y-1 px-3 py-6">
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px]",
                      isActive ? "bg-surface-2 text-ink" : "text-ink-muted"
                    )
                  }
                >
                  <item.icon size={16} strokeWidth={1.75} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-base/90 px-6 backdrop-blur-md">
          <button className="text-ink-muted md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-4">
            <button aria-label="Notifications" className="relative text-ink-muted hover:text-ink">
              <Bell size={17} strokeWidth={1.75} />
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-accent" />
            </button>
          </div>
        </header>
        <main className="px-6 py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
}
