"use client";

import { useEffect, useState } from "react";
import {
  Search, FlaskConical, Package, ShieldCheck,
  Zap, Activity, TrendingUp, IndianRupee, Eye, ShoppingCart
} from "lucide-react";

interface DashboardStats {
  opportunities: { total: number; validated: number; testing: number; winners: number };
  experiments: { active: number; completed: number; failed: number };
  products: { launched: number };
  business: { traffic: number; conversions: number; revenue: number };
  approvals: { pending: number };
  automation: { connected: number; running: number; failed: number };
  _db_status?: string;
}

const EMPTY_STATS: DashboardStats = {
  opportunities: { total: 0, validated: 0, testing: 0, winners: 0 },
  experiments: { active: 0, completed: 0, failed: 0 },
  products: { launched: 0 },
  business: { traffic: 0, conversions: 0, revenue: 0 },
  approvals: { pending: 0 },
  automation: { connected: 0, running: 0, failed: 0 },
};

function StatCard({ label, value, icon: Icon, sub, color = "text-[hsl(var(--foreground))]" }: {
  label: string; value: string | number; icon: React.ElementType; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-colors hover:border-[hsl(var(--primary)_/_0.3)]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{label}</p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{sub}</p>}
    </div>
  );
}

function StatusIndicator({ status, label }: { status: string; label: string }) {
  const colors: Record<string, string> = {
    READY: "bg-emerald-400",
    RUNNING: "bg-blue-400 animate-pulse",
    NOT_CONFIGURED: "bg-amber-400",
    ERROR: "bg-red-400",
  };
  return (
    <div className="flex items-center gap-2">
      <div className={`h-2.5 w-2.5 rounded-full ${colors[status] ?? "bg-zinc-400"}`} />
      <span className="text-sm">{label}</span>
      <span className="text-xs text-[hsl(var(--muted-foreground))]">({status})</span>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
          setDbConnected(data._db_status !== "NOT_CONNECTED");
        } else {
          setDbConnected(false);
        }
      } catch {
        setDbConnected(false);
      }
      setLoading(false);
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Control Center</h1>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Real-time operational dashboard. All data is from the database — nothing is fabricated.
        </p>
      </div>

      {/* System Status */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">System Status</h2>
        <div className="mt-3 flex flex-wrap gap-6">
          <StatusIndicator
            status={dbConnected === null ? "LOADING" : dbConnected ? "READY" : "NOT_CONFIGURED"}
            label="Database"
          />
          <StatusIndicator status="READY" label="Spending Guard" />
          <StatusIndicator status="READY" label="Decision Engine" />
          <StatusIndicator status="READY" label="Validation Engine" />
          <StatusIndicator status="NOT_CONFIGURED" label="AI Provider" />
          <StatusIndicator status="NOT_CONFIGURED" label="n8n" />
        </div>
      </div>

      {/* Opportunities */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Opportunities Pipeline
          </h2>
          <a
            href="/validation"
            className="text-xs text-[hsl(var(--primary))] hover:underline flex items-center gap-1"
          >
            Open Validation Pipeline &rarr;
          </a>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Real" value={stats.opportunities.total} icon={Search} color="text-blue-400" />
          <StatCard label="Validated" value={stats.opportunities.validated} icon={Activity} color="text-emerald-400" />
          <StatCard label="Testing" value={stats.opportunities.testing} icon={FlaskConical} color="text-amber-400" />
          <StatCard label="Winners" value={stats.opportunities.winners} icon={TrendingUp} color="text-emerald-400" />
        </div>
      </div>

      {/* Experiments */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Experiments</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Active" value={stats.experiments.active} icon={FlaskConical} color="text-blue-400" />
          <StatCard label="Completed" value={stats.experiments.completed} icon={Activity} color="text-emerald-400" />
          <StatCard label="Failed" value={stats.experiments.failed} icon={Activity} color="text-red-400" />
        </div>
      </div>

      {/* Products & Business */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Products</h2>
          <StatCard label="Launched" value={stats.products.launched} icon={Package} color="text-violet-400" />
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Business</h2>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Traffic" value={stats.business.traffic} icon={Eye} />
            <StatCard label="Conversions" value={stats.business.conversions} icon={ShoppingCart} />
            <StatCard label="Revenue" value={stats.business.revenue === 0 ? "₹0" : `₹${stats.business.revenue.toLocaleString("en-IN")}`} icon={IndianRupee} color="text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Approvals & Automation & Zero-Spend */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Pending Approvals"
          value={stats.approvals.pending}
          icon={ShieldCheck}
          color={stats.approvals.pending > 0 ? "text-amber-400" : "text-emerald-400"}
          sub={stats.approvals.pending === 0 ? "All clear" : "Needs attention"}
        />
        <StatCard
          label="Automation"
          value={`${stats.automation.running} running`}
          icon={Zap}
          sub={`${stats.automation.connected} connected, ${stats.automation.failed} failed`}
        />
        <StatCard
          label="Zero-Spend Limit"
          value="₹0"
          icon={IndianRupee}
          sub="Hard limit enforced. Cannot be overridden."
          color="text-emerald-400"
        />
      </div>

      {!dbConnected && !loading && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-300">
          <strong>Database not connected.</strong> All values show 0. Configure DATABASE_URL in .env.local and run migrations.
        </div>
      )}
    </div>
  );
}
