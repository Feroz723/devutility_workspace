"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, ShieldAlert, CheckCircle2, XCircle, Mail, AlertTriangle, Send, RefreshCw
} from "lucide-react";

export default function ManualActionCenterPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/customer-success/manual");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleApprove(id: string) {
    try {
      const res = await fetch(`/api/customer-success/interventions/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved_by: "human_operator" }),
      });
      if (res.ok) {
        setActionMessage("Intervention approved successfully.");
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCancel(id: string) {
    try {
      const res = await fetch(`/api/customer-success/interventions/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Rejected by human operator" }),
      });
      if (res.ok) {
        setActionMessage("Intervention cancelled.");
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleExecute(id: string) {
    try {
      const res = await fetch(`/api/customer-success/interventions/${id}/execute`, {
        method: "POST",
      });
      const resJson = await res.json();
      if (res.ok) {
        setActionMessage(`Intervention executed (Status: ${resJson.status}).`);
        await loadData();
      } else {
        setActionMessage(`Execution failed: ${resJson.reason || "Unknown error"}`);
      }
    } catch (e) {
      console.error(e);
    }
  }

  const emailProvider = data?.email_provider;
  const pendingApprovals = data?.pending_approvals || [];
  const manualDispatches = data?.manual_dispatches || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/customer-success" className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3 h-3" /> Back to Customer Success Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Manual Action Center & Provider Governance</h1>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Human-in-the-loop intervention approval, provider status tracking, and offline dispatches
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[hsl(var(--border))] rounded-lg hover:bg-[hsl(var(--accent))]"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-400 text-xs flex justify-between items-center">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="underline">Dismiss</button>
        </div>
      )}

      {/* Provider Status Card */}
      <div className="p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Mail className="w-5 h-5 text-[hsl(var(--primary))]" />
            <h2 className="text-base font-semibold">Transactional Email Integration</h2>
          </div>
          <span className={`px-2.5 py-1 rounded text-xs font-bold ${
            emailProvider?.status === "CONNECTED"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
          }`}>
            {emailProvider?.status || "NOT_CONNECTED"}
          </span>
        </div>

        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          {emailProvider?.details || "Checking provider configuration..."}
        </p>

        {emailProvider?.config_guide && (
          <div className="p-4 rounded-lg bg-[hsl(var(--accent))] space-y-1.5 text-xs">
            <span className="font-semibold text-[hsl(var(--foreground))]">Configuration Guidance:</span>
            <ul className="list-disc pl-4 space-y-1 text-[hsl(var(--muted-foreground))]">
              {emailProvider.config_guide.map((step: string, i: number) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Grid: Pending Approvals & Manual Dispatches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <div className="p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Pending Approvals ({pendingApprovals.length})</h2>
            <span className="text-xs text-amber-400 font-mono font-medium">Requires Approval</span>
          </div>

          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Interventions generated by the autonomous health engine that require human confirmation.
          </p>

          {pendingApprovals.length === 0 ? (
            <div className="p-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
              No interventions awaiting approval.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((item: any) => (
                <div key={item.id} className="p-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-[hsl(var(--primary))]">{item.intervention_type}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400">
                      {item.urgency} URGENCY
                    </span>
                  </div>
                  <p className="text-[hsl(var(--foreground))] font-medium">{item.reason}</p>
                  <p className="text-[hsl(var(--muted-foreground))]">{item.recommended_action}</p>
                  <div className="flex justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
                    <button
                      onClick={() => handleCancel(item.id)}
                      className="px-3 py-1 text-xs text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(item.id)}
                      className="px-3 py-1 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 rounded transition-colors"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Staged Manual Dispatches */}
        <div className="p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Staged Manual Dispatches ({manualDispatches.length})</h2>
            <span className="text-xs text-blue-400 font-mono font-medium">Ready for Outreach</span>
          </div>

          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Approved communications staged for manual transmission or direct personal outreach.
          </p>

          {manualDispatches.length === 0 ? (
            <div className="p-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
              No communications staged for manual dispatch.
            </div>
          ) : (
            <div className="space-y-3">
              {manualDispatches.map((item: any) => (
                <div key={item.id} className="p-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{item.intervention_type}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400">
                      MANUAL STAGED
                    </span>
                  </div>
                  <p className="text-[hsl(var(--foreground))]">{item.recommended_action}</p>
                  <div className="flex justify-end pt-2 border-t border-[hsl(var(--border))]">
                    <button
                      onClick={() => handleExecute(item.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[hsl(var(--primary))] text-white rounded hover:opacity-90 transition-opacity"
                    >
                      <Send className="w-3 h-3" /> Mark as Sent
                    </button>
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
