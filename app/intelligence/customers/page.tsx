"use client";

import { useState, useEffect } from "react";
import { Users, RefreshCw, Calendar, TrendingDown, LifeBuoy } from "lucide-react";
import { IntelligenceNav } from "@/components/intelligence/intelligence-nav";

export default function CustomerCohortsPage() {
  const [loading, setLoading] = useState(true);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<string>("ALL");

  async function fetchCohorts() {
    setLoading(true);
    try {
      const res = await fetch("/api/intelligence/cohorts");
      const data = await res.json();
      setCohorts(data.cohorts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCohorts();
  }, []);

  const filtered = selectedType === "ALL"
    ? cohorts
    : cohorts.filter((c) => c.cohort_type === selectedType);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Cohorts & Retention Economics</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Cohort breakdown across acquisition channels, products purchased, and signup periods
          </p>
        </div>
        <button
          onClick={fetchCohorts}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] text-xs font-medium transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <IntelligenceNav />

      {/* Type selector */}
      <div className="flex items-center gap-2 text-xs">
        {["ALL", "CHANNEL", "PRODUCT", "SIGNUP_MONTH"].map((t) => (
          <button
            key={t}
            onClick={() => setSelectedType(t)}
            className={`px-3 py-1 rounded-lg transition ${
              selectedType === t
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
                <th className="py-3">Cohort Name</th>
                <th className="py-3">Type</th>
                <th className="py-3">Cohort Size</th>
                <th className="py-3">Activated</th>
                <th className="py-3">Retained</th>
                <th className="py-3">Churned</th>
                <th className="py-3">Total Revenue</th>
                <th className="py-3">Support Tickets</th>
                <th className="py-3">Sample Sufficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]/40">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-[hsl(var(--accent))]/20 transition-colors">
                  <td className="py-3 font-semibold">{c.cohort_name}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded bg-[hsl(var(--accent))] text-[10px]">
                      {c.cohort_type}
                    </span>
                  </td>
                  <td className="py-3">{c.cohort_size}</td>
                  <td className="py-3 text-blue-400">{c.activated_count}</td>
                  <td className="py-3 text-emerald-400 font-semibold">{c.retained_30d_count}</td>
                  <td className="py-3 text-rose-400">{c.churned_count}</td>
                  <td className="py-3 text-emerald-400 font-bold">₹{c.total_revenue_inr.toLocaleString()}</td>
                  <td className="py-3">{c.support_tickets_count}</td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] ${
                        c.has_sufficient_data
                          ? "bg-emerald-500/20 text-emerald-300 font-medium"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {c.has_sufficient_data ? "SUFFICIENT (>=5)" : "EARLY (<5)"}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[hsl(var(--muted-foreground))]">
                    No customer cohorts analyzed yet. Run an Autonomous Business Brain cycle.
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
