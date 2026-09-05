"use client";

import { useState, useEffect } from "react";
import { Layers, RefreshCw, Filter, ArrowUpDown } from "lucide-react";
import { IntelligenceNav } from "@/components/intelligence/intelligence-nav";

export default function PortfolioMatrixPage() {
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<string>("ALL");

  async function fetchPortfolio() {
    setLoading(true);
    try {
      const res = await fetch("/api/intelligence/portfolio");
      const data = await res.json();
      setPortfolio(data.portfolio || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const filtered = filterType === "ALL"
    ? portfolio
    : portfolio.filter((item) => item.type === filterType);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolio Decision Matrix</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Ranked prioritization across all business assets (Opportunities, Experiments, Products, Campaigns, Offers)
          </p>
        </div>
        <button
          onClick={fetchPortfolio}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] text-xs font-medium transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <IntelligenceNav />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs">
        {["ALL", "PRODUCT", "CAMPAIGN", "EXPERIMENT", "OPPORTUNITY", "OFFER"].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1 rounded-lg transition ${
              filterType === t
                ? "bg-[hsl(var(--primary))] text-white font-medium"
                : "bg-[hsl(var(--accent))]/50 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] uppercase text-[10px]">
              <tr>
                <th className="py-3">Asset Name</th>
                <th className="py-3">Type</th>
                <th className="py-3">Priority Score</th>
                <th className="py-3">Evidence Confidence</th>
                <th className="py-3">Revenue (INR)</th>
                <th className="py-3">Users / Leads</th>
                <th className="py-3">Recommended Action</th>
                <th className="py-3">Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]/40">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[hsl(var(--accent))]/20 transition-colors">
                  <td className="py-3 font-medium">{item.name}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded bg-[hsl(var(--accent))] text-[10px]">
                      {item.type}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-[hsl(var(--accent))] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-500 h-full rounded-full"
                          style={{ width: `${item.priority_score}%` }}
                        />
                      </div>
                      <span className="font-semibold">{item.priority_score}</span>
                    </div>
                  </td>
                  <td className="py-3 text-[hsl(var(--muted-foreground))]">
                    {item.evidence_strength}
                  </td>
                  <td className="py-3 font-semibold text-emerald-400">
                    ₹{item.revenue_inr.toLocaleString()}
                  </td>
                  <td className="py-3 text-[hsl(var(--muted-foreground))]">
                    {item.users_count}
                  </td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                        item.recommended_action === "SCALE"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : item.recommended_action === "STOP" || item.recommended_action === "PAUSE"
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-blue-500/20 text-blue-300"
                      }`}
                    >
                      {item.recommended_action}
                    </span>
                  </td>
                  <td className="py-3 text-[hsl(var(--muted-foreground))] max-w-sm">
                    {item.rationale}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[hsl(var(--muted-foreground))]">
                    No portfolio assets found for this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
