import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { Building2, Layers, LogOut } from "lucide-react";

export default function BankShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { signOut, profile } = useAuth();

  const nav = [
    { name: "Overview", href: "/bank", icon: Building2 },
    { name: "Pools", href: "/bank/pools", icon: Layers },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <div className="fixed inset-y-0 left-0 z-50 w-64 border-r border-line bg-surface flex flex-col">
        <div className="flex h-16 shrink-0 items-center px-6">
          <span className="font-display text-[18px] tracking-tight text-ink">FxPool Bank</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav.map((item) => {
            const active = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
                  active ? "bg-ink/5 text-ink" : "text-ink-muted hover:bg-ink/5 hover:text-ink"
                }`}
              >
                <item.icon size={16} className={active ? "text-ink" : "text-ink-muted group-hover:text-ink"} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-line">
          <p className="text-[12px] font-medium text-ink truncate">{profile?.full_name}</p>
          <button
            onClick={signOut}
            className="mt-3 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>
      <main className="pl-64">
        <div className="mx-auto max-w-5xl p-8">{children}</div>
      </main>
    </div>
  );
}
