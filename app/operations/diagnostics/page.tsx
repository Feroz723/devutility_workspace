'use client';

import React, { useState, useEffect } from 'react';
import { OperationsNav } from '@/components/operations/operations-nav';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Play, 
  RefreshCw 
} from 'lucide-react';

interface DiagnosticItem {
  id: string;
  name: string;
  category: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  message: string;
  duration_ms?: number;
}

export default function OperationsDiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [overallStatus, setOverallStatus] = useState<string>('PASS');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/operations/diagnostics');
      if (res.ok) {
        const data = await res.json();
        setDiagnostics(data.diagnostics || []);
        setOverallStatus(data.overall_status || 'PASS');
      }
    } catch (err) {
      console.error('Failed to run diagnostics:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'WARN':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      default:
        return <XCircle className="w-5 h-5 text-rose-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                System Diagnostics & Sanity Runner
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Automated machine-readable inspection verifying database integrity, queue state, scheduler health, and ₹0 safety boundaries.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Play className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Running Tests...' : 'Run Diagnostics'}
        </button>
      </div>

      <OperationsNav />

      {/* Overall Health Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
        <div>
          <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Overall System Health</span>
          <h2 className="text-xl font-bold text-white mt-0.5">
            {overallStatus === 'PASS' ? 'All Core Checks Passed' : overallStatus === 'WARN' ? 'Warnings Detected' : 'System Failures Detected'}
          </h2>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold border ${
            overallStatus === 'PASS'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : overallStatus === 'WARN'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}
        >
          {overallStatus}
        </span>
      </div>

      {/* Diagnostic Checks List */}
      <div className="space-y-3">
        {diagnostics.map((diag) => (
          <div
            key={diag.id}
            className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5">{getStatusIcon(diag.status)}</div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">{diag.name}</h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    {diag.category}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">{diag.message}</p>
              </div>
            </div>

            {diag.duration_ms !== undefined && (
              <span className="text-xs text-slate-500 font-mono shrink-0">
                {diag.duration_ms}ms
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
