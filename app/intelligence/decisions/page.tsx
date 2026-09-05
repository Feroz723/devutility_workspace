"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckSquare, RefreshCw, ArrowRight, ShieldCheck, Check, X, Play } from "lucide-react";
import { IntelligenceNav } from "@/components/intelligence/intelligence-nav";

export default function DecisionsListPage() {
  const [loading, setLoading] = useState(true);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  async function fetchDecisions() {
    setLoading(true);
    try {
      const url = statusFilter === "ALL"
        ? "/api/intelligence/decisions?limit=100"
        : `/api/intelligence/decisions?status=${statusFilter}&limit=100`;
      const res = await fetch(url);
      const data = await res.json();
      setDecisions(data.decisions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDecisions();
  }, [statusFilter]);

  async function handleApprove(id: string) {
    try {
      const res = await fetch(`/api/intelligence/decisions/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator: "human_operator" }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Decision approved successfully.`);
        fetchDecisions();
      } else {
        setActionMessage(`Error approving decision: ${data.error}`);
      }
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    }
  }

  async function handleReject(id: string) {
    try {
      const res = await fetch(`/api/intelligence/decisions/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator: "human_operator", reason: "Rejected via UI" }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Decision rejected.`);
        fetchDecisions();
      } else {
        setActionMessage(`Error rejecting decision: ${data.error}`);
      }
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    }
  }

  async function handleExecute(id: string) {
    try {
      const res = await fetch(`/api/intelligence/decisions/${id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator: "human_operator" }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Decision executed successfully.`);
        fetchDecisions();
      } else {
        setActionMessage(`Error executing decision: ${data.error}`);
      }
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolio Decision Management</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Evidence-backed decision lifecycle (Proposed → Review → Approved → Executing → Completed)
          </p>
        </div>
        <button
          onClick={fetchDecisions}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] text-xs font-medium transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <IntelligenceNav />

      {actionMessage && (
        <div className="p-3 rounded-lg border border-purple-500/20 bg-purple-500/10 text-xs text-purple-200">
          {actionMessage}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs">
        {["ALL", "PROPOSED", "REVIEW", "APPROVED", "EXECUTING", "COMPLETED", "REJECTED"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-lg transition ${
              statusFilter === s
                ? "bg-[hsl(var(--primary))] text-white font-medium"
                : "bg-[hsl(var(--accent))]/50 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {decisions.map((dec) => (
          <div
            key={dec.id}
            className="p-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-3 text-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{dec.subject_name}</span>
                <span className="px-2 py-0.5 rounded bg-[hsl(var(--accent))] text-[10px] uppercase">
                  {dec.subject_type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded font-bold text-[10px] ${
                    dec.decision === "STOP"
                      ? "bg-rose-500/20 text-rose-300"
                      : dec.decision === "SCALE"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-blue-500/20 text-blue-300"
                  }`}
                >
                  {dec.decision}
                </span>
                <span className="px-2 py-0.5 rounded bg-[hsl(var(--accent))] text-[10px] text-[hsl(var(--muted-foreground))]">
                  Status: {dec.status}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[hsl(var(--muted-foreground))] font-medium">Recommended Next Step:</p>
              <p className="text-[11px] p-2.5 rounded-lg bg-[hsl(var(--accent))]/30 text-[hsl(var(--foreground))]/90">
                {dec.recommended_next_action}
              </p>
            </div>

            {dec.reasons && dec.reasons.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] font-medium">Key Reasoning Signals:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-[hsl(var(--foreground))]/80">
                  {dec.reasons.map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[hsl(var(--border))]/50">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  Confidence: <span className="font-semibold text-[hsl(var(--foreground))]">{dec.confidence}</span>
                </span>
                {dec.requires_approval && (
                  <span className="text-[10px] text-amber-300 flex items-center gap-1 font-medium">
                    <ShieldCheck className="h-3 w-3" /> Requires Operator Approval
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/intelligence/decisions/${dec.id}`}
                  className="px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] text-[11px] font-medium transition flex items-center gap-1"
                >
                  Inspect Evidence <ArrowRight className="h-3 w-3" />
                </Link>

                {dec.status === "PROPOSED" && (
                  <>
                    <button
                      onClick={() => handleApprove(dec.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-medium hover:bg-emerald-500 transition"
                    >
                      <Check className="h-3 w-3" /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(dec.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600/80 text-white text-[11px] font-medium hover:bg-rose-500 transition"
                    >
                      <X className="h-3 w-3" /> Reject
                    </button>
                  </>
                )}

                {dec.status === "APPROVED" && (
                  <button
                    onClick={() => handleExecute(dec.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[hsl(var(--primary))] text-white text-[11px] font-medium hover:opacity-90 transition"
                  >
                    <Play className="h-3 w-3" /> Execute Action
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {decisions.length === 0 && (
          <div className="p-12 text-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs text-[hsl(var(--muted-foreground))]">
            No decisions match this filter. Run an Autonomous Business Brain cycle to generate new decision proposals.
          </div>
        )}
      </div>
    </div>
  );
}
