"use client";
import { ShieldOff, Check, AlertTriangle, XCircle } from "lucide-react";
import { classifyAction } from "@/decision-engine/zero-spend-guard";
import { useState } from "react";

const EXAMPLES = [
  { label: "₹0 safe action", input: { estimated_cost_inr: 0, is_reversible: true, is_sensitive: false, action_type: "read_data", description: "Read public data" } },
  { label: "₹5000 advertising", input: { estimated_cost_inr: 5000, is_reversible: true, is_sensitive: false, action_type: "advertising", description: "Run Google Ads campaign" } },
  { label: "Domain purchase", input: { estimated_cost_inr: 800, is_reversible: false, is_sensitive: true, action_type: "domain_purchase", description: "Buy example.com" } },
  { label: "Prohibited action", input: { estimated_cost_inr: 0, is_reversible: true, is_sensitive: false, action_type: "spam_campaign", description: "Send unsolicited spam emails" } },
] as const;

export default function ZeroSpendPage() {
  const [results] = useState(() => EXAMPLES.map((ex) => ({
    ...ex,
    result: classifyAction(ex.input),
  })));

  const classColor = (c: string) => {
    if (c === "FREE") return "text-emerald-400 bg-emerald-400/10";
    if (c === "REQUIRES_APPROVAL") return "text-amber-400 bg-amber-400/10";
    return "text-red-400 bg-red-400/10";
  };

  const classIcon = (c: string) => {
    if (c === "FREE") return Check;
    if (c === "REQUIRES_APPROVAL") return AlertTriangle;
    return XCircle;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldOff className="h-6 w-6 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Zero-Spend Guard</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Hard ₹0 spending limit. Cannot be overridden by AI.</p>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-emerald-300">Automatic Spending Limit</p>
          <p className="text-5xl font-bold text-emerald-400 mt-2">₹0</p>
          <p className="mt-2 text-sm text-emerald-300/80">Enforced server-side. Not a frontend button.</p>
        </div>
      </div>

      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Classification Rules</h2>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center gap-3"><Check className="h-4 w-4 text-emerald-400" /><span>₹0 + safe + reversible = <strong className="text-emerald-400">FREE</strong></span></div>
          <div className="flex items-center gap-3"><AlertTriangle className="h-4 w-4 text-amber-400" /><span>Any spending &gt; ₹0 = <strong className="text-amber-400">REQUIRES_APPROVAL</strong></span></div>
          <div className="flex items-center gap-3"><AlertTriangle className="h-4 w-4 text-amber-400" /><span>Sensitive or irreversible = <strong className="text-amber-400">REQUIRES_APPROVAL</strong></span></div>
          <div className="flex items-center gap-3"><XCircle className="h-4 w-4 text-red-400" /><span>Illegal/fraudulent/malicious = <strong className="text-red-400">BLOCKED</strong></span></div>
        </div>
      </div>

      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Live Examples</h2>
        <div className="mt-4 space-y-3">
          {results.map((r, i) => {
            const Icon = classIcon(r.result.classification);
            return (
              <div key={i} className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] p-3">
                <div>
                  <span className="text-sm font-medium">{r.label}</span>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{r.result.reason}</p>
                </div>
                <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${classColor(r.result.classification)}`}>
                  <Icon className="h-3 w-3" />
                  {r.result.classification}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
