'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { OperationsNav } from '@/components/operations/operations-nav';
import { 
  SlidersHorizontal, 
  Activity, 
  ShieldAlert, 
  Play, 
  Pause, 
  RotateCcw, 
  AlertOctagon, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Radio, 
  Sparkles, 
  ArrowRight,
  RefreshCw,
  HardDrive
} from 'lucide-react';

interface ReadinessData {
  status: string;
  reasons: string[];
  databaseHealthy: boolean;
  killSwitchActive: boolean;
  isPaused: boolean;
  deadLetterCount: number;
  pendingApprovalsCount: number;
  unconnectedIntegrationsCount: number;
}

interface Recommendation {
  priority: number;
  category: string;
  title: string;
  action: string;
  reason: string;
  target_url: string;
  severity: string;
}

export default function OperationsCommandCenterPage() {
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [emergencyState, setEmergencyState] = useState<any>(null);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningCycle, setRunningCycle] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [readRes, recRes, emRes, jobsRes] = await Promise.all([
        fetch('/api/operations/readiness'),
        fetch('/api/operations/recommendations'),
        fetch('/api/operations/emergency'),
        fetch('/api/operations/jobs?limit=5'),
      ]);

      if (readRes.ok) setReadiness(await readRes.json());
      if (recRes.ok) {
        const data = await recRes.json();
        setRecommendations(data.recommendations || []);
      }
      if (emRes.ok) setEmergencyState(await emRes.json());
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setRecentJobs(data.jobs || []);
      }
    } catch (err) {
      console.error('Failed to load operations dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerCycle = async (cycleType: 'DAILY' | 'WEEKLY') => {
    setRunningCycle(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/operations/cycle/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycle_type: cycleType, is_demo: false }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Autonomous ${cycleType} Cycle completed successfully in ${data.result?.duration_ms}ms!`);
        loadDashboardData();
      } else {
        setActionMessage(`Cycle failed: ${data.error}`);
      }
    } catch (err: any) {
      setActionMessage(`Error triggering cycle: ${err.message}`);
    } finally {
      setRunningCycle(false);
    }
  };

  const handleEmergencyAction = async (action: string, reason?: string) => {
    try {
      const res = await fetch('/api/operations/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      if (res.ok) {
        loadDashboardData();
      }
    } catch (err) {
      console.error('Emergency action failed:', err);
    }
  };

  const getReadinessColor = (status?: string) => {
    switch (status) {
      case 'SYSTEM_READY':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'SYSTEM_PARTIALLY_READY':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'SYSTEM_BLOCKED':
        return 'bg-rose-500/10 border-rose-500/30 text-rose-400';
      default:
        return 'bg-rose-500/10 border-rose-500/30 text-rose-400';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Operations Command Center
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                  Phase 11 Orchestrator
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Central operational nerve center managing autonomous pipeline cycles, system readiness, safety bounds, and emergency controls.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Triggers */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleTriggerCycle('DAILY')}
            disabled={runningCycle || emergencyState?.is_paused || emergencyState?.is_kill_switch_active}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50 shadow-lg shadow-blue-900/20"
          >
            <Play className={`w-4 h-4 ${runningCycle ? 'animate-spin' : ''}`} />
            {runningCycle ? 'Running Cycle...' : 'Run Daily Cycle'}
          </button>
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Refresh dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <OperationsNav />

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/60 text-sm text-blue-200 flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-xs text-blue-400 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* System Readiness & Emergency Governance Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Readiness Card */}
        <div className="md:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">System Readiness</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getReadinessColor(readiness?.status)}`}>
              {readiness?.status || 'EVALUATING...'}
            </span>
          </div>

          <div className="space-y-1">
            {readiness?.reasons?.map((reason, idx) => (
              <p key={idx} className="text-sm text-slate-300 leading-relaxed flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                {reason}
              </p>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-800 text-center">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">PostgreSQL</span>
              <p className={`text-xs font-bold mt-0.5 ${readiness?.databaseHealthy ? 'text-emerald-400' : 'text-rose-400'}`}>
                {readiness?.databaseHealthy ? 'HEALTHY' : 'FAILED'}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Spend Boundary</span>
              <p className="text-xs font-bold text-emerald-400 mt-0.5">₹0 AUTO LIMIT</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Dead Letter</span>
              <p className={`text-xs font-bold mt-0.5 ${(readiness?.deadLetterCount || 0) > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                {readiness?.deadLetterCount || 0} JOBS
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Pending Approvals</span>
              <p className={`text-xs font-bold mt-0.5 ${(readiness?.pendingApprovalsCount || 0) > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                {readiness?.pendingApprovalsCount || 0} ITEMS
              </p>
            </div>
          </div>
        </div>

        {/* Emergency Kill Switch & Pause Controls */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Emergency Controls
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Operator Only
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Global Pause halts job queue execution. The Kill Switch immediately suspends all autonomous execution while preserving all historical audit records.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            {emergencyState?.is_kill_switch_active ? (
              <button
                onClick={() => handleEmergencyAction('KILL_SWITCH_DISENGAGE')}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Disengage Kill Switch & Resume
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {emergencyState?.is_paused ? (
                  <button
                    onClick={() => handleEmergencyAction('RESUME')}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-medium transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Resume Global
                  </button>
                ) : (
                  <button
                    onClick={() => handleEmergencyAction('PAUSE', 'Operator paused via command center')}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 text-xs font-medium transition-colors"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    Pause Global
                  </button>
                )}

                <button
                  onClick={() => {
                    const reason = prompt('Reason for Emergency Kill Switch engagement:');
                    if (reason) handleEmergencyAction('KILL_SWITCH_ENGAGE', reason);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-medium transition-colors"
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  Kill Switch
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* "What Should I Do Now?" Command Center Recommendations */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-semibold text-white">What Should I Do Now? (Deterministic Priority)</h2>
          </div>
          <span className="text-xs text-slate-400">
            {recommendations.length} Prioritized Action{recommendations.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((rec) => (
            <div
              key={rec.priority}
              className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    PRIORITY #{rec.priority}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      rec.severity === 'CRITICAL'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : rec.severity === 'HIGH'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {rec.severity}
                  </span>
                </div>

                <h3 className="font-semibold text-white text-sm leading-snug">{rec.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{rec.action}</p>
                <p className="text-[11px] text-slate-500 italic leading-relaxed">Context: {rec.reason}</p>
              </div>

              <Link
                href={rec.target_url}
                className="pt-2 border-t border-slate-800/80 text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center justify-between group"
              >
                <span>Resolve Action</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Autonomous Jobs Ticker */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Recent Orchestrator Jobs
          </h2>
          <Link href="/operations/jobs" className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-medium">
            View All Jobs <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentJobs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No operational jobs queued or executed yet. Click &quot;Run Daily Cycle&quot; to begin.
          </div>
        ) : (
          <div className="space-y-2">
            {recentJobs.map((j) => (
              <div
                key={j.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {j.module}
                  </span>
                  <span className="font-medium text-white">{j.name}</span>
                  <span className="text-slate-500 font-mono">({j.action})</span>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`font-semibold px-2 py-0.5 rounded ${
                      j.status === 'SUCCEEDED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : j.status === 'FAILED' || j.status === 'DEAD_LETTER'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}
                  >
                    {j.status}
                  </span>
                  <span className="text-slate-500">{new Date(j.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
