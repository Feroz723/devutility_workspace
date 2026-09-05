"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Check, X, Play, FileText, CheckCircle2 } from "lucide-react";
import { IntelligenceNav } from "@/components/intelligence/intelligence-nav";

export default function DecisionDetailPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  async function fetchDetail() {
    setLoading(true);
    try {
      const res = await fetch(`/api/intelligence/decisions/${params.id}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDetail();
  }, [params.id]);

  async function handleApprove() {
    try {
      const res = await fetch(`/api/intelligence/decisions/${params.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator: "human_operator" }),
      });
      const json = await res.json();
      if (json.success) {
        setActionMsg("Decision approved.");
        fetchDetail();
      } else {
        setActionMsg(`Error: ${json.error}`);
      }
    } catch (err: any) {
      setActionMsg(`Error: ${err.message}`);
    }
  }

  async function handleReject() {
    try {
      const res = await fetch(`/api/intelligence/decisions/${params.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator: "human_operator", reason: "Rejected in detail inspector" }),
      });
      const json = await res.json();
      if (json.success) {
        setActionMsg("Decision rejected.");
        fetchDetail();
      } else {
        setActionMsg(`Error: ${json.error}`);
      }
    } catch (err: any) {
      setActionMsg(`Error: ${err.message}`);
    }
  }

  async function handleExecute() {
    try {
      const res = await fetch(`/api/intelligence/decisions/${params.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator: "human_operator" }),
      });
      const json = await res.json();
      if (json.success) {
        setActionMsg("Decision executed.");
        fetchDetail();
      } else {
        setActionMsg(`Error: ${json.error}`);
      }
    } catch (err: any) {
      setActionMsg(`Error: ${err.message}`);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-xs text-[hsl(var(--muted-foreground))]">Loading decision...</div>;
  }

  if (!data?.decision) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Link href="/intelligence/decisions" className="text-xs text-[hsl(var(--primary))] flex items-center gap-1 hover:underline">
          <ArrowLeft className="h-3 w-3" /> Back to Decisions
        </Link>
        <p className="text-rose-400 text-sm">Decision not found.</p>
      </div>
    );
  }

  const { decision, recommendations, evidence } = data;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/intelligence/decisions" className="text-xs text-[hsl(var(--primary))] flex items-center gap-1 hover:underline">
          <ArrowLeft className="h-3 w-3" /> Back to Decisions
        </Link>

        <div className="flex items-center gap-2">
          {decision.status === "PROPOSED" && (
            <>
              <button
                onClick={handleApprove}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 transition"
              >
                <Check className="h-3.5 w-3.5" /> Approve Decision
              </button>
              <button
                onClick={handleReject}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600/80 text-white text-xs font-medium hover:bg-rose-500 transition"
              >
                <X className="h-3.5 w-3.5" /> Reject
              </button>
            </>
          )}

          {decision.status === "APPROVED" && (
            <button
              onClick={handleExecute}
              className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-[hsl(var(--primary))] text-white text-xs font-medium hover:opacity-90 transition"
            >
              <Play className="h-3.5 w-3.5" /> Execute Decision
            </button>
          )}
        </div>
      </div>

      <IntelligenceNav />

      {actionMsg && (
        <div className="p-3 rounded-lg border border-purple-500/20 bg-purple-500/10 text-xs text-purple-200">
          {actionMsg}
        </div>
      )}

      {/* Decision Card */}
      <div className="p-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase font-mono">{decision.subject_type}</span>
            <h1 className="text-2xl font-bold tracking-tight">{decision.subject_name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full font-bold text-xs ${
                decision.decision === "STOP"
                  ? "bg-rose-500/20 text-rose-300"
                  : decision.decision === "SCALE"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-blue-500/20 text-blue-300"
              }`}
            >
              {decision.decision}
            </span>
            <span className="px-3 py-1 rounded-full bg-[hsl(var(--accent))] text-xs font-medium">
              Status: {decision.status}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--accent))]/20 space-y-1">
          <p className="text-xs font-semibold text-[hsl(var(--foreground))]">Recommended Action:</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">{decision.recommended_next_action}</p>
        </div>

        {decision.reasons && decision.reasons.length > 0 && (
          <div className="space-y-1.5">
            <h2 className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">Decision Reasons</h2>
            <ul className="list-disc pl-5 text-xs space-y-1 text-[hsl(var(--foreground))]/80">
              {decision.reasons.map((r: string, i: number) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="p-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Concrete Recommendations
        </h2>

        <div className="space-y-3">
          {recommendations.map((rec: any) => (
            <div
              key={rec.id}
              className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--accent))]/10 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">{rec.title}</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold">
                  Cost: ₹{rec.cost_estimate_inr}
                </span>
              </div>
              <p className="text-[hsl(var(--muted-foreground))]">{rec.description}</p>
              <div className="flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))] pt-2 border-t border-[hsl(var(--border))]/50">
                <span>Priority: {rec.priority}</span>
                <span>Effort: {rec.effort_estimate}</span>
                <span>Approval: {rec.requires_approval ? "Required" : "Autonomous"}</span>
              </div>
            </div>
          ))}
          {recommendations.length === 0 && (
            <p className="text-xs text-[hsl(var(--muted-foreground))] text-center py-4">
              No standalone recommendations logged for this decision.
            </p>
          )}
        </div>
      </div>

      {/* Verifiable Evidence Inspector */}
      <div className="p-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4 text-purple-400" />
          Verifiable Evidence & Live Data Links
        </h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          Every decision proposal is anchored in verifiable observations from prior phases. No simulated facts.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] uppercase text-[10px]">
              <tr>
                <th className="py-2.5">Evidence Type</th>
                <th className="py-2.5">Metric Observed</th>
                <th className="py-2.5">Value</th>
                <th className="py-2.5">Sample Size</th>
                <th className="py-2.5">Source Reference</th>
                <th className="py-2.5">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]/40">
              {evidence.map((ev: any) => (
                <tr key={ev.id} className="hover:bg-[hsl(var(--accent))]/20 transition-colors">
                  <td className="py-2.5 font-semibold">{ev.evidence_type}</td>
                  <td className="py-2.5 font-mono text-blue-400">{ev.metric_name}</td>
                  <td className="py-2.5 font-bold text-emerald-400">{ev.metric_value}</td>
                  <td className="py-2.5">{ev.sample_size}</td>
                  <td className="py-2.5 text-[hsl(var(--muted-foreground))]">{ev.source_reference}</td>
                  <td className="py-2.5">{ev.confidence}%</td>
                </tr>
              ))}
              {evidence.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[hsl(var(--muted-foreground))]">
                    No discrete evidence rows attached.
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
