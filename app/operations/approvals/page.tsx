'use client';

import React, { useState, useEffect } from 'react';
import { OperationsNav } from '@/components/operations/operations-nav';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Tag, 
  DollarSign,
  RefreshCw 
} from 'lucide-react';

interface ApprovalItem {
  id: string;
  action_type: string;
  action_description: string;
  originating_module: string;
  entity_type: string;
  estimated_cost_inr: number;
  risk_level: string;
  evidence_summary?: string;
  status: string;
  requested_by: string;
  created_at: string;
}

export default function OperationsApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/operations/approvals');
      if (res.ok) {
        const data = await res.json();
        setApprovals(data.approvals || []);
      }
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/operations/approvals/${id}/approve`, { method: 'POST' });
      if (res.ok) fetchApprovals();
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Reason for rejection:');
    if (reason === null) return;

    setProcessingId(id);
    try {
      const res = await fetch(`/api/operations/approvals/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) fetchApprovals();
    } catch (err) {
      console.error('Rejection failed:', err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Unified Approval Center
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Operator oversight across financial spend, sensitive publications, pricing changes, and customer interventions.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchApprovals}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <OperationsNav />

      {/* Approvals List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500">Loading pending approvals...</div>
      ) : approvals.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400 space-y-2">
          <ShieldCheck className="w-12 h-12 mx-auto text-emerald-500/40" />
          <p className="font-medium text-slate-200">No actions pending operator approval</p>
          <p className="text-xs text-slate-500">
            Autonomous operations within ₹0 spend parameters and low-risk bounds are executing automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((appr) => (
            <div
              key={appr.id}
              className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {appr.originating_module}
                    </span>
                    <span className="text-xs font-mono text-cyan-400 font-semibold">{appr.action_type}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        appr.risk_level === 'high' || appr.risk_level === 'critical'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {appr.risk_level.toUpperCase()} RISK
                    </span>
                    {appr.estimated_cost_inr > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        ₹{appr.estimated_cost_inr} INR
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-medium text-white">{appr.action_description}</p>
                  {appr.evidence_summary && (
                    <p className="text-xs text-slate-400 leading-relaxed italic">Evidence: {appr.evidence_summary}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(appr.id)}
                    disabled={processingId === appr.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-xs font-medium transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(appr.id)}
                    disabled={processingId === appr.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-400 text-xs font-medium transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Requested by: <strong className="text-slate-300">{appr.requested_by}</strong></span>
                <span>Created {new Date(appr.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
