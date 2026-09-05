"use client";

import { useEffect, useState } from "react";
import { Compass, RefreshCw, CheckCircle2, AlertCircle, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProviderInfo {
  id: string;
  name: string;
  status: string;
  isFree: boolean;
  rateLimit?: string;
  lastSuccess?: string;
  lastError?: string;
  configurationRequired?: string;
}

interface ResearchRun {
  id: string;
  provider: string | null;
  query: string | null;
  run_type: string;
  status: string;
  cost_classification: string;
  opportunities_created: number;
  opportunities_updated: number;
  evidence_collected: number;
  duration_ms: number;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  result_summary?: {
    queries_executed?: string[];
    providers_used?: string[];
    raw_items_found?: number;
  };
}

export default function ResearchActivityPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [runs, setRuns] = useState<ResearchRun[]>([]);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [provRes, runsRes] = await Promise.all([
        fetch("/api/research/providers"),
        fetch("/api/research/runs?limit=15"),
      ]);

      if (provRes.ok) {
        const pData = await provRes.json();
        setProviders(pData.providers || []);
      }
      if (runsRes.ok) {
        const rData = await runsRes.json();
        setRuns(rData.runs || []);
      }
    } catch {
      // offline/error fallback
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleTestProvider = async (providerId: string) => {
    setTestingId(providerId);
    setStatusMessage(`Testing ${providerId}...`);
    try {
      const res = await fetch("/api/research/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage(`✓ ${providerId}: ${data.message} (${data.latencyMs ?? 0}ms)`);
      } else {
        setStatusMessage(`✕ ${providerId}: ${data.message || data.error || "Failed"}`);
      }
      loadAll();
    } catch (err) {
      setStatusMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
    setTestingId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONNECTED":
        return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20";
      case "READY":
        return "bg-blue-500/15 text-blue-400 border border-blue-500/20";
      case "RATE_LIMITED":
        return "bg-amber-500/15 text-amber-400 border border-amber-500/20";
      case "FAILED":
        return "bg-red-500/15 text-red-400 border border-red-500/20";
      case "NOT_CONFIGURED":
      default:
        return "bg-zinc-800 text-zinc-400 border border-zinc-700";
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Research Engine Activity</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            Live provider connections and auditable internet research execution runs.
          </p>
        </div>
        <Button onClick={loadAll} variant="outline" size="sm" className="gap-2 border-[hsl(var(--border))]">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm flex items-center justify-between">
          <span className="text-zinc-200">{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-xs text-[hsl(var(--muted-foreground))] hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Provider Status Grid */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-[hsl(var(--primary))]" />
          Research Providers & Sources
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {providers.map((p) => (
            <div key={p.id} className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm text-zinc-100">{p.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusBadge(p.status)}`}>
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  Cost: <span className="text-emerald-400 font-semibold">{p.isFree ? "₹0 (Free)" : "Paid"}</span>
                </p>
                {p.rateLimit && (
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                    Limit: {p.rateLimit}
                  </p>
                )}
                {p.lastError && (
                  <p className="text-[11px] text-red-400 mt-1 line-clamp-2">
                    {p.lastError}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-[hsl(var(--border))] flex items-center justify-between">
                <span className="text-[10px] text-zinc-400">
                  {p.lastSuccess ? `Active ${new Date(p.lastSuccess).toLocaleTimeString()}` : "Not tested yet"}
                </span>
                <Button
                  onClick={() => handleTestProvider(p.id)}
                  disabled={testingId === p.id}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-[hsl(var(--border))]"
                >
                  {testingId === p.id ? "Testing..." : "Test Connection"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historical Research Runs */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <Compass className="h-4 w-4 text-[hsl(var(--primary))]" />
          Historical Research Runs
        </h2>
        <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]">
                <th className="px-4 py-3 text-left font-medium">Run ID</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Opportunities</th>
                <th className="px-4 py-3 text-left font-medium">Evidence</th>
                <th className="px-4 py-3 text-left font-medium">Cost</th>
                <th className="px-4 py-3 text-left font-medium">Duration</th>
                <th className="px-4 py-3 text-left font-medium">Executed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">
                    No research runs recorded yet. Click &ldquo;Run Research&rdquo; in Hunter to execute the first cycle.
                  </td>
                </tr>
              ) : (
                runs.map((run) => (
                  <tr key={run.id} className="hover:bg-[hsl(var(--accent))] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                      {run.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold ${
                        run.status === "completed"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-red-500/15 text-red-400"
                      }`}>
                        {run.status === "completed" ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="text-emerald-400 font-semibold">+{run.opportunities_created} new</span>
                      {run.opportunities_updated > 0 && (
                        <span className="text-zinc-400 ml-1.5">({run.opportunities_updated} merged)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono">
                      {run.evidence_collected} items
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-emerald-400">
                      ₹0 (FREE)
                    </td>
                    <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))] font-mono">
                      {(run.duration_ms / 1000).toFixed(1)}s
                    </td>
                    <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]">
                      {new Date(run.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
