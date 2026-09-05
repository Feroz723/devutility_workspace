"use client";

import { useState, useEffect } from "react";
import { Tag, RefreshCw, AlertCircle, TrendingUp, ShieldCheck } from "lucide-react";
import { IntelligenceNav } from "@/components/intelligence/intelligence-nav";

export default function OffersIntelligencePage() {
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<any[]>([]);

  async function fetchOffers() {
    setLoading(true);
    try {
      const res = await fetch("/api/intelligence/offers");
      const data = await res.json();
      setOffers(data.offers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOffers();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Offers & Pricing Decisions</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Checkout conversion analytics, pricing elasticity, and approval-gated commercial recommendations
          </p>
        </div>
        <button
          onClick={fetchOffers}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] text-xs font-medium transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <IntelligenceNav />

      <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-xs flex items-center gap-2 text-amber-200">
        <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" />
        <span>
          Safety Control: Live pricing adjustments, fee changes, or guarantee alterations require explicit human operator approval before execution.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {offers.map((off) => (
          <div
            key={off.offer_id}
            className="p-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm font-mono truncate max-w-xs">{off.offer_id}</span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                  off.decision === "SCALE"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : off.decision === "ITERATE"
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-blue-500/20 text-blue-300"
                }`}
              >
                {off.decision}
              </span>
            </div>

            <p className="text-[hsl(var(--muted-foreground))]">{off.rationale}</p>

            <div className="grid grid-cols-2 gap-3 py-3 bg-[hsl(var(--accent))]/30 rounded-xl text-center">
              <div>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Checkout Conversion</p>
                <p className="text-base font-bold text-blue-400">{off.conversion_rate_percent}%</p>
              </div>
              <div>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Refund Rate</p>
                <p className="text-base font-bold text-rose-400">{off.refund_rate_percent}%</p>
              </div>
            </div>

            <div className="space-y-1.5 p-3 rounded-xl border border-purple-500/20 bg-purple-500/10">
              <p className="text-[10px] font-bold text-purple-300">Commercial Recommendation:</p>
              <p className="text-[11px] text-purple-100">{off.pricing_recommendation}</p>
            </div>

            <div className="flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))] pt-2 border-t border-[hsl(var(--border))]/50">
              <span>Confidence: {off.confidence}</span>
              <span className="text-amber-300 font-semibold">Human Approval Required</span>
            </div>
          </div>
        ))}
        {offers.length === 0 && (
          <p className="col-span-2 text-center text-xs text-[hsl(var(--muted-foreground))] py-8">
            No active offers evaluated yet. Run the Autonomous Business Brain Cycle.
          </p>
        )}
      </div>
    </div>
  );
}
