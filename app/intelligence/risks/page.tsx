"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw, ShieldAlert, CheckCircle2 } from "lucide-react";
import { IntelligenceNav } from "@/components/intelligence/intelligence-nav";

export default function BusinessRisksPage() {
  const [loading, setLoading] = useState(true);
  const [risks, setRisks] = useState<any[]>([]);

  async function fetchRisks() {
    setLoading(true);
    try {
      const res = await fetch("/api/intelligence/risks");
      const data = await res.json();
      setRisks(data.active_risks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRisks();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Business Risk Register</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Continuously monitored risk conditions across dependencies, customer retention, distribution, and compliance
          </p>
        </div>
        <button
          onClick={fetchRisks}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] text-xs font-medium transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <IntelligenceNav />

      <div className="space-y-4">
        {risks.map((risk) => (
          <div
            key={risk.id}
            className="p-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-3 text-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{risk.title}</span>
                <span className="px-2 py-0.5 rounded bg-[hsl(var(--accent))] text-[10px]">
                  {risk.category}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded font-bold text-[10px] ${
                    risk.severity === "CRITICAL"
                      ? "bg-rose-500/20 text-rose-300"
                      : risk.severity === "HIGH"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-blue-500/20 text-blue-300"
                  }`}
                >
                  {risk.severity}
                </span>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  Status: {risk.status}
                </span>
              </div>
            </div>

            <p className="text-[hsl(var(--muted-foreground))]">{risk.description}</p>

            <div className="p-3 rounded-xl bg-[hsl(var(--accent))]/20 space-y-1">
              <span className="font-semibold text-[11px] text-emerald-400">Actionable Mitigation:</span>
              <p className="text-[11px] text-[hsl(var(--foreground))]/90">{risk.mitigation}</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[hsl(var(--border))]/50 text-[10px] text-[hsl(var(--muted-foreground))]">
              <span>Evidence: {risk.evidence || "Telemetry anomaly"}</span>
              <span>Owner: {risk.owner}</span>
            </div>
          </div>
        ))}
        {risks.length === 0 && (
          <div className="p-12 text-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs text-[hsl(var(--muted-foreground))]">
            No active risks registered. System running within normal operating parameters.
          </div>
        )}
      </div>
    </div>
  );
}
