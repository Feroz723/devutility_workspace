"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Check, X, Clock } from "lucide-react";

interface Approval {
  id: string; action_type: string; action_description: string; reason: string | null;
  estimated_cost_inr: number; risk_level: string; expected_benefit: string | null;
  status: string; requested_by: string; approved_by: string | null;
  approved_at: string | null; rejected_at: string | null; rejection_reason: string | null;
  created_at: string;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => { loadApprovals(); }, []);

  async function loadApprovals() {
    setLoading(true);
    try {
      const res = await fetch("/api/approvals");
      if (res.ok) {
        const data = await res.json();
        setApprovals(data.approvals ?? []);
      }
    } catch { /* noop */ }
    setLoading(false);
  }

  async function handleApprove(id: string) {
    setProcessing(id);
    try {
      const res = await fetch(`/api/approvals/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved_by: "owner" }),
      });
      if (res.ok) await loadApprovals();
    } catch { /* noop */ }
    setProcessing(null);
  }

  async function handleReject(id: string) {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    setProcessing(id);
    try {
      const res = await fetch(`/api/approvals/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejected_by: "owner", rejection_reason: reason }),
      });
      if (res.ok) await loadApprovals();
    } catch { /* noop */ }
    setProcessing(null);
  }

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      PENDING: "text-amber-400 bg-amber-400/10", APPROVED: "text-emerald-400 bg-emerald-400/10",
      REJECTED: "text-red-400 bg-red-400/10", EXPIRED: "text-zinc-400 bg-zinc-400/10",
    };
    return map[s] ?? "text-zinc-400 bg-zinc-400/10";
  };

  const riskColor = (r: string) => {
    const map: Record<string, string> = { low: "text-emerald-400", medium: "text-amber-400", high: "text-red-400", critical: "text-red-500" };
    return map[r] ?? "text-zinc-400";
  };

  const pending = approvals.filter((a) => a.status === "PENDING");
  const resolved = approvals.filter((a) => a.status !== "PENDING");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-[hsl(var(--primary))]" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Approval Queue</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Every irreversible or paid action requires your approval. The system never overrides this.
          </p>
        </div>
      </div>

      {/* Pending */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-400">
          Pending ({pending.length})
        </h2>
        {loading ? (
          <p className="text-[hsl(var(--muted-foreground))]">Loading...</p>
        ) : pending.length === 0 ? (
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
            No pending approvals. All clear.
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((a) => (
              <div key={a.id} className="rounded-xl border border-amber-500/20 bg-[hsl(var(--card))] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{a.action_type}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(a.status)}`}>{a.status}</span>
                      <span className={`text-xs font-medium ${riskColor(a.risk_level)}`}>Risk: {a.risk_level}</span>
                    </div>
                    <p className="mt-2 text-sm text-[hsl(var(--foreground))] break-words">{a.action_description}</p>
                    {a.reason && <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] break-words">Reason: {a.reason}</p>}
                    {a.expected_benefit && <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] break-words">Benefit: {a.expected_benefit}</p>}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                      <span>Cost: ₹{a.estimated_cost_inr}</span>
                      <span>By: {a.requested_by}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(a.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(a.id)}
                      disabled={processing === a.id}
                      className="flex items-center gap-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                    >
                      <Check className="h-4 w-4" /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(a.id)}
                      disabled={processing === a.id}
                      className="flex items-center gap-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                    >
                      <X className="h-4 w-4" /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolved */}
      {resolved.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Resolved ({resolved.length})
          </h2>
          <div className="space-y-2">
            {resolved.map((a) => (
              <div key={a.id} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{a.action_type}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(a.status)}`}>{a.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] break-words">{a.action_description}</p>
                    {a.rejection_reason && <p className="mt-1 text-xs text-red-400">Reason: {a.rejection_reason}</p>}
                  </div>
                  <span className="text-xs text-[hsl(var(--muted-foreground))] shrink-0">
                    {a.approved_by ?? "—"} · {new Date(a.approved_at || a.rejected_at || a.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
