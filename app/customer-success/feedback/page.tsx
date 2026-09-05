"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare, ArrowLeft, Star, ThumbsUp, ThumbsDown, Sparkles,
  Layers, ArrowUpRight
} from "lucide-react";

export default function FeedbackDashboardPage() {
  const [feedbackItems, setFeedbackItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [clusters, setClusters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const [feedRes, featRes] = await Promise.all([
        fetch("/api/customer-success/feedback"),
        fetch("/api/customer-success/feature-requests"),
      ]);
      const feedData = await feedRes.json();
      const featData = await featRes.json();

      setFeedbackItems(feedData?.items || []);
      setSummary(feedData?.summary || null);
      setClusters(Array.isArray(featData) ? featData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/customer-success" className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3 h-3" /> Back to Customer Success Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Customer Feedback & Feature Requests</h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              NPS, CSAT, sentiment trends, and prioritized feature clustering
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Net Promoter Score</span>
          <p className="mt-3 text-2xl font-bold">
            {summary?.nps_score !== null && summary?.nps_score !== undefined ? summary.nps_score : "N/A"}
          </p>
          <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
            {summary?.has_sufficient_data ? "Sample size verified" : "Requires >= 5 responses"}
          </p>
        </div>

        <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Customer Satisfaction (CSAT)</span>
          <p className="mt-3 text-2xl font-bold">
            {summary?.average_csat !== null && summary?.average_csat !== undefined ? `${summary.average_csat} / 5` : "N/A"}
          </p>
          <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">Average rating</p>
        </div>

        <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Sentiment Breakdown</span>
          <div className="mt-3 flex items-center gap-3 text-xs">
            <span className="text-emerald-400 font-semibold">{summary?.sentiment_breakdown?.POSITIVE ?? 0} Pos</span>
            <span className="text-zinc-400 font-semibold">{summary?.sentiment_breakdown?.NEUTRAL ?? 0} Neu</span>
            <span className="text-rose-400 font-semibold">{summary?.sentiment_breakdown?.NEGATIVE ?? 0} Neg</span>
          </div>
          <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">Total: {summary?.total_feedback ?? 0} entries</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Request Clusters */}
        <div className="p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[hsl(var(--primary))]" />
            <h2 className="text-base font-semibold">Prioritized Feature Clusters</h2>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Clustered suggestions grouped to feed directly into Phase 6 Product Improvements
          </p>

          {clusters.length === 0 ? (
            <p className="text-xs text-[hsl(var(--muted-foreground))] py-6 text-center">No feature requests recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {clusters.map((c) => (
                <div key={c.id} className="p-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{c.theme}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      c.priority_tier === "HIGH_PRIORITY" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                      c.priority_tier === "VALIDATED" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                      c.priority_tier === "EMERGING" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                      "bg-zinc-500/10 text-zinc-400"
                    }`}>
                      {c.priority_tier} ({c.count} requests)
                    </span>
                  </div>
                  <p className="text-[hsl(var(--muted-foreground))] italic">&ldquo;{c.sample_comments[0]}&rdquo;</p>
                  <div className="text-emerald-400 font-medium pt-1">Action: {c.suggested_action}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feedback Feed */}
        <div className="p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <h2 className="text-base font-semibold">Recent Feedback & Reviews</h2>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Direct customer comments and ratings across in-app prompts and emails
          </p>

          {feedbackItems.length === 0 ? (
            <p className="text-xs text-[hsl(var(--muted-foreground))] py-6 text-center">No feedback entries recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {feedbackItems.slice(0, 10).map((f) => (
                <div key={f.id} className="p-3.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{f.feedback_type} {f.score !== null ? `(${f.score}/10)` : ""}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      f.sentiment === "POSITIVE" ? "bg-emerald-500/10 text-emerald-400" :
                      f.sentiment === "NEGATIVE" ? "bg-rose-500/10 text-rose-400" :
                      "bg-zinc-500/10 text-zinc-400"
                    }`}>
                      {f.sentiment || "NEUTRAL"}
                    </span>
                  </div>
                  <p className="text-sm text-[hsl(var(--foreground))]">{f.comment || "No comment provided."}</p>
                  <div className="text-[10px] text-[hsl(var(--muted-foreground))] flex justify-between pt-1">
                    <span>Source: {f.source}</span>
                    <span>{new Date(f.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
