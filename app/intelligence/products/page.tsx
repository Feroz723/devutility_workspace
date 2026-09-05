"use client";

import { useState, useEffect } from "react";
import { Package, RefreshCw, AlertTriangle, Lightbulb, TrendingUp, CheckCircle } from "lucide-react";
import { IntelligenceNav } from "@/components/intelligence/intelligence-nav";

export default function ProductsIntelligencePage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [performances, setPerformances] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/intelligence/products");
      const data = await res.json();
      setProducts(data.products || []);
      setPerformances(data.performances || []);
      setProposals(data.proposals || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Product Performance & Iterations</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Deterministic evaluations, Stop Candidates, and telemetry-derived improvement proposals
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] text-xs font-medium transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <IntelligenceNav />

      {/* Products Matrix */}
      <div className="p-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Package className="h-4 w-4 text-blue-400" />
          Product Performance Matrix
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] uppercase text-[10px]">
              <tr>
                <th className="py-2.5">Product</th>
                <th className="py-2.5">Tier</th>
                <th className="py-2.5">Traffic</th>
                <th className="py-2.5">Paying Customers</th>
                <th className="py-2.5">Activation Rate</th>
                <th className="py-2.5">Revenue</th>
                <th className="py-2.5">Refund Rate</th>
                <th className="py-2.5">Churn Rate</th>
                <th className="py-2.5">Support Burden</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]/40">
              {performances.map((perf) => (
                <tr key={perf.id} className="hover:bg-[hsl(var(--accent))]/20 transition-colors">
                  <td className="py-3 font-medium">
                    {products.find((p) => p.id === perf.product_id)?.name || perf.product_id}
                  </td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        perf.performance_tier === "WINNER"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : perf.performance_tier === "STOP_CANDIDATE"
                          ? "bg-rose-500/20 text-rose-300 animate-pulse"
                          : perf.performance_tier === "PROMISING"
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-zinc-500/20 text-zinc-300"
                      }`}
                    >
                      {perf.performance_tier}
                    </span>
                  </td>
                  <td className="py-3 text-[hsl(var(--muted-foreground))]">{perf.traffic_count}</td>
                  <td className="py-3 font-semibold text-blue-400">{perf.customers_count}</td>
                  <td className="py-3">{perf.activation_rate_percent}%</td>
                  <td className="py-3 font-semibold text-emerald-400">₹{perf.revenue_inr.toLocaleString()}</td>
                  <td className="py-3 text-rose-400">{perf.refund_rate_percent}%</td>
                  <td className="py-3 text-amber-400">{perf.churn_rate_percent}%</td>
                  <td className="py-3 text-[hsl(var(--muted-foreground))]">{perf.support_burden_score}/100</td>
                </tr>
              ))}
              {performances.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-[hsl(var(--muted-foreground))]">
                    No product evaluations generated yet. Run the Autonomous Business Brain Cycle.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Friction & Improvement Proposals */}
      <div className="p-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          Autonomous Product Iteration Proposals
        </h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          Rooted in actual support tickets, churn surveys, and customer upvotes (Requires Operator Approval to Deploy)
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {proposals.map((prop, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--accent))]/10 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{prop.problem_summary}</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold">
                  {prop.status}
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">Evidence:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-[hsl(var(--foreground))]/80">
                  {prop.evidence.map((ev: string, i: number) => (
                    <li key={i}>{ev}</li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 flex items-center justify-between text-[11px] border-t border-[hsl(var(--border))]/50">
                <span className="text-emerald-400 font-medium">Cost: ₹{prop.cost_inr}</span>
                <span className="text-[hsl(var(--muted-foreground))]">Complexity: {prop.complexity}</span>
                <span className="text-[hsl(var(--muted-foreground))]">
                  Affected: {prop.affected_customers_count} customer(s)
                </span>
              </div>
            </div>
          ))}
          {proposals.length === 0 && (
            <p className="col-span-2 text-center text-xs text-[hsl(var(--muted-foreground))] py-6">
              No product friction issues detected from support queues.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
