"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  CreditCard,
  Wrench,
  Zap,
  BarChart3,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard",   label: "Dashboard",   icon: LayoutDashboard },
  { href: "/properties",  label: "Properties",  icon: Building2 },
  { href: "/tenants",     label: "Tenants",     icon: Users },
  { href: "/leases",      label: "Leases",      icon: FileText },
  { href: "/payments",    label: "Payments",    icon: CreditCard },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/automations", label: "Automations", icon: Zap },
  { href: "/reports",     label: "Reports",     icon: BarChart3 },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-20 h-auto border-b border-[var(--sand-200)] bg-white/90 px-3 py-3 backdrop-blur lg:h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r lg:px-4 lg:py-4">
      <div className="glass-card flex h-full flex-col p-2">
        <div className="rounded-xl bg-[var(--ink-900)] px-4 py-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">AI Property Manager</p>
          <p className="mt-1 text-base font-semibold">Autopilot Console</p>
        </div>

        <nav className="mt-3 flex-1 space-y-1 overflow-y-auto p-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  active
                    ? "bg-[var(--mint-500)] text-white shadow-sm"
                    : "text-[var(--ink-700)] hover:bg-[var(--sand-100)]"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-2 rounded-xl border border-[var(--sand-200)] bg-white p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--ink-500)]">Account</p>
          <UserButton afterSignOutUrl="/" showName />
        </div>
      </div>
    </aside>
  );
}

