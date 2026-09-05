"use client";
import { useEffect, useState } from "react";
import { Activity } from "lucide-react";

interface HealthData {
  status: string;
  database: { status: string; reason: string; latencyMs?: number };
}

const integrations = [
  { id: "database", label: "Database (PostgreSQL)" },
  { id: "ai", label: "AI Provider" },
  { id: "n8n", label: "n8n Automation" },
  { id: "github", label: "GitHub" },
  { id: "research", label: "Research Engine" },
  { id: "payment", label: "Payment / Revenue" },
  { id: "distribution", label: "Distribution Channels" },
];

export default function SystemPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/health").then((r) => r.json()).then(setHealth).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const dbConnected = health?.database?.status === "CONNECTED";

  function getIntegrationStatus(id: string): { status: string; color: string } {
    if (id === "database") {
      return dbConnected
        ? { status: "CONNECTED", color: "bg-emerald-400" }
        : { status: "NOT_CONNECTED", color: "bg-zinc-400" };
    }
    return { status: "NOT_CONNECTED", color: "bg-zinc-400" };
  }

  const systemState = dbConnected ? "READY" : "NOT_CONFIGURED";
  const systemColor = systemState === "READY" ? "text-emerald-400" : "text-amber-400";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6 text-[hsl(var(--primary))]" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Status</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Honest view. No connection is claimed without testing.</p>
        </div>
      </div>

      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">System State</h2>
          <span className={`text-lg font-bold ${systemColor}`}>{systemState}</span>
        </div>
        {health?.database?.latencyMs !== undefined && (
          <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">DB latency: {health.database.latencyMs}ms</p>
        )}
      </div>

      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Integrations</h2>
        <div className="mt-4 divide-y divide-[hsl(var(--border))]">
          {integrations.map((int) => {
            const s = getIntegrationStatus(int.id);
            return (
              <div key={int.id} className="flex items-center justify-between py-3">
                <span className="text-sm">{int.label}</span>
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">{s.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
