"use client";

import { useState, useEffect } from "react";
import { Share2, RefreshCw, TrendingUp, AlertOctagon, CheckCircle2, RotateCcw } from "lucide-react";
import { IntelligenceNav } from "@/components/intelligence/intelligence-nav";

export default function ChannelsIntelligencePage() {
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<any[]>([]);

  async function fetchChannels() {
    setLoading(true);
    try {
      const res = await fetch("/api/intelligence/channels");
      const data = await res.json();
      setChannels(data.channels || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchChannels();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Channel Performance & Decisions</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Evaluating organic distribution efficacy, qualified leads yield, and autonomous stop/scale decisions
          </p>
        </div>
        <button
          onClick={fetchChannels}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] text-xs font-medium transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <IntelligenceNav />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {channels.map((ch) => (
          <div
            key={ch.channel_type}
            className="p-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4 text-xs"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">{ch.channel_type}</h2>
              <span
                className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                  ch.decision === "SCALE"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : ch.decision === "STOP"
                    ? "bg-rose-500/20 text-rose-300"
                    : ch.decision === "ITERATE"
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-blue-500/20 text-blue-300"
                }`}
              >
                {ch.decision}
              </span>
            </div>

            <p className="text-[hsl(var(--muted-foreground))] text-[11px]">{ch.rationale}</p>

            <div className="grid grid-cols-3 gap-2 py-3 bg-[hsl(var(--accent))]/30 rounded-xl text-center">
              <div>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Traffic</p>
                <p className="text-sm font-bold">{ch.metrics?.traffic ?? 0}</p>
              </div>
              <div>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Qualified Leads</p>
                <p className="text-sm font-bold text-blue-400">{ch.metrics?.leads ?? 0}</p>
              </div>
              <div>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Revenue</p>
                <p className="text-sm font-bold text-emerald-400">₹{ch.metrics?.revenue_inr ?? 0}</p>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] font-semibold">Recommended Next Action:</p>
              <p className="text-[11px] bg-[hsl(var(--accent))]/10 p-2.5 rounded-lg text-[hsl(var(--foreground))]/90">
                {ch.recommended_next_step}
              </p>
            </div>

            <div className="flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))] pt-2 border-t border-[hsl(var(--border))]/50">
              <span>Confidence: {ch.confidence}</span>
              <span>{ch.requires_approval ? "Requires Approval" : "Autonomous"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
