'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { IntelligenceNav } from '@/components/intelligence/intelligence-nav';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Play, 
  AlertTriangle, 
  Link2Off, 
  Lock, 
  Clock,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  RefreshCw
} from 'lucide-react';

interface DecisionRecord {
  id: string;
  scope: string;
  action: string;
  recommendation: string;
  risk_level: string;
  target_id?: string;
  requires_approval: boolean;
  status: string;
  created_at: string;
}

interface UnconnectedAdapter {
  name: string;
  category: string;
  status: 'NOT_CONNECTED' | 'REQUIRES_MANUAL_SETUP' | 'REQUIRES_APPROVAL';
  description: string;
  required_credentials: string[];
}

export default function ManualActionCenterPage() {
  const [pendingApprovals, setPendingApprovals] = useState<DecisionRecord[]>([]);
  const [unconnectedAdapters, setUnconnectedAdapters] = useState<UnconnectedAdapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchManualData();
  }, []);

  const fetchManualData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/intelligence/manual');
      if (res.ok) {
        const data = await res.json();
        setPendingApprovals(data.pending_approvals || []);
        setUnconnectedAdapters(data.unconnected_adapters || []);
      }
    } catch (err) {
      console.error('Failed to load manual action center data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/intelligence/decisions/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        fetchManualData();
      }
    } catch (err) {
      console.error('Failed to approve decision:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Reason for rejection:');
    if (reason === null) return;

    setProcessingId(id);
    try {
      const res = await fetch(`/api/intelligence/decisions/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Operator rejected' }),
      });
      if (res.ok) {
        fetchManualData();
      }
    } catch (err) {
      console.error('Failed to reject decision:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk.toUpperCase()) {
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">HIGH RISK</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">MEDIUM RISK</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">LOW RISK</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Manual Action & Approval Center
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                  Operator Oversight
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Review high-impact autonomous recommendations, manage human-in-the-loop approvals, and audit external integrations requiring setup.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchManualData}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <IntelligenceNav />

      {/* Safety Protocol Banner */}
      <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-5 flex items-start gap-4">
        <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-amber-300">Safety & Human Approval Boundaries Active</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            By system decree, the autonomous loop cannot execute price changes, permanent product retirements, or monetary allocations without operator sign-off.
            Any external provider lacking verified API keys is gracefully held in <code>NOT_CONNECTED</code> status without disrupting internal execution.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Decisions Requiring Approval */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-amber-400" />
              Pending Portfolio Decisions
              <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">
                {pendingApprovals.length}
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-32 bg-slate-900/40 border border-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-slate-900/30 border border-slate-800 text-slate-400 space-y-2">
              <ShieldCheck className="w-10 h-10 mx-auto opacity-30 text-emerald-500" />
              <p className="text-sm font-medium text-slate-300">No decisions pending human approval</p>
              <p className="text-xs text-slate-500">
                All autonomous operations within approved bounds are running seamlessly.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map(dec => (
                <div 
                  key={dec.id}
                  className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {dec.scope}
                        </span>
                        <span className="text-xs font-mono text-cyan-400 font-medium">
                          {dec.action}
                        </span>
                        {getRiskBadge(dec.risk_level)}
                      </div>
                      <p className="text-sm text-white font-medium">
                        {dec.recommendation}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleApprove(dec.id)}
                        disabled={processingId === dec.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-xs font-medium transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(dec.id)}
                        disabled={processingId === dec.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-400 text-xs font-medium transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Created {new Date(dec.created_at).toLocaleString()}
                    </span>
                    <Link
                      href={`/intelligence/decisions/${dec.id}`}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline font-medium"
                    >
                      Audit Evidence
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: External Integration Statuses */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Link2Off className="w-4 h-4 text-rose-400" />
              External Adapters & Credentials
            </h2>
          </div>

          <div className="space-y-3">
            {unconnectedAdapters.map(adapter => (
              <div 
                key={adapter.name}
                className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-sm">{adapter.name}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {adapter.status}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {adapter.description}
                </p>

                <div className="pt-2 border-t border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-500">Required Setup:</span>
                  <div className="flex flex-wrap gap-1">
                    {adapter.required_credentials.map((cred, idx) => (
                      <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded font-mono">
                        {cred}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
