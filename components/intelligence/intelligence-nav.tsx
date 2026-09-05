"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  Layers,
  Package,
  Share2,
  Tag,
  Users,
  CheckSquare,
  AlertTriangle,
  BookOpen,
  TrendingUp,
  Target,
  Wrench,
} from "lucide-react";

const NAV_TABS = [
  { href: "/intelligence", label: "Brain Overview", icon: Brain, exact: true },
  { href: "/intelligence/portfolio", label: "Portfolio Matrix", icon: Layers },
  { href: "/intelligence/products", label: "Products", icon: Package },
  { href: "/intelligence/channels", label: "Channels", icon: Share2 },
  { href: "/intelligence/offers", label: "Offers & Pricing", icon: Tag },
  { href: "/intelligence/customers", label: "Customer Cohorts", icon: Users },
  { href: "/intelligence/decisions", label: "Decisions", icon: CheckSquare },
  { href: "/intelligence/risks", label: "Risks", icon: AlertTriangle },
  { href: "/intelligence/learning", label: "Knowledge Base", icon: BookOpen },
  { href: "/intelligence/forecasts", label: "Forecasts", icon: TrendingUp },
  { href: "/intelligence/goals", label: "Goals", icon: Target },
  { href: "/intelligence/manual", label: "Manual Action Center", icon: Wrench },
];

export function IntelligenceNav() {
  const pathname = usePathname();

  return (
    <div className="mb-6 overflow-x-auto border-b border-[hsl(var(--border))] pb-2">
      <nav className="flex items-center space-x-1 min-w-max">
        {NAV_TABS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-[hsl(var(--primary))] text-white shadow-sm"
                  : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
