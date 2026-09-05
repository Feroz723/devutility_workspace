"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Search, Compass, CheckCircle2, Scale, ShieldCheck, FlaskConical,
  Package, Megaphone, ShoppingCart, HeartHandshake, Brain, ShieldOff, Zap, Bot, Activity, ScrollText, Settings, SlidersHorizontal, Target
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hunter", label: "Hunter", icon: Search },
  { href: "/research", label: "Research", icon: Compass },
  { href: "/validation", label: "Validation", icon: CheckCircle2 },
  { href: "/decisions", label: "Decisions", icon: Scale },
  { href: "/approvals", label: "Approvals", icon: ShieldCheck },
  { href: "/experiments", label: "Experiments", icon: FlaskConical },
  { href: "/products", label: "Products", icon: Package },
  { href: "/distribution", label: "Distribution", icon: Megaphone },
  { href: "/sales", label: "Sales & Orders", icon: ShoppingCart },
  { href: "/customer-success", label: "Customer Success", icon: HeartHandshake },
  { href: "/strategy", label: "Strategy Governor", icon: Target },
  { href: "/intelligence", label: "Business Brain", icon: Brain },
  { href: "/operations", label: "Operations Center", icon: SlidersHorizontal },
  { href: "/zero-spend", label: "Zero-Spend", icon: ShieldOff },

  { href: "/automation", label: "Automation", icon: Zap },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/system", label: "System Status", icon: Activity },
  { href: "/logs", label: "Logs", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-[hsl(var(--border))] px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--primary))]">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">ABOS</p>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Control Center</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-[hsl(var(--primary))] text-white font-medium"
                      : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-[hsl(var(--border))] px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
          <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
          <span>Spending limit: ₹0</span>
        </div>
      </div>
    </aside>
  );
}
