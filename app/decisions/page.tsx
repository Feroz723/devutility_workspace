"use client";
import { Scale } from "lucide-react";
import { SCORING_WEIGHTS, DECISION_THRESHOLDS } from "@/decision-engine/scoring";

export default function DecisionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Scale className="h-6 w-6 text-[hsl(var(--primary))]" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Decision Engine</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">How opportunities are scored and classified.</p>
        </div>
      </div>

      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Scoring Weights</h2>
        <div className="mt-4 space-y-3">
          {Object.entries(SCORING_WEIGHTS).map(([name, weight]) => (
            <div key={name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium capitalize">{name.replace("_", " ")}</span>
                {name === "competition" && <span className="text-xs text-amber-400">(inverse scored)</span>}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                  <div className="h-full rounded-full bg-[hsl(var(--primary))]" style={{ width: `${weight * 100}%` }} />
                </div>
                <span className="text-sm font-mono w-10 text-right">{(weight * 100).toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Decision Thresholds</h2>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              <span>TEST</span>
            </div>
            <span className="font-mono">{DECISION_THRESHOLDS.TEST}–100</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              <span>RESEARCH MORE</span>
            </div>
            <span className="font-mono">{DECISION_THRESHOLDS.RESEARCH_MORE}–{DECISION_THRESHOLDS.TEST - 1}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span>REJECT</span>
            </div>
            <span className="font-mono">0–{DECISION_THRESHOLDS.RESEARCH_MORE - 1}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-300">
        <strong>Zero-Spend Guard:</strong> A high score cannot override the zero-spend policy.
        If an opportunity requires spending money to test (zero_cost_score &lt; 50), it cannot automatically become TEST.
      </div>
    </div>
  );
}
