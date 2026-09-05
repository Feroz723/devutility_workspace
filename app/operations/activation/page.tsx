'use client';

import React, { useState, useEffect } from 'react';
import { OperationsNav } from '@/components/operations/operations-nav';
import {
  Activity,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  Globe,
  ExternalLink,
  Target,
  Database,
  Cpu,
  Layers,
  ArrowRight,
  MessageSquare,
  Users,
  Compass,
  AlertCircle,
  RefreshCw,
  Zap,
} from 'lucide-react';
import type { ActivationControlStatus, RealBusinessCycleResult } from '@/types/activation';

export default function RealWorldActivationPage() {
  const [loading, setLoading] = useState(true);
  const [runningCycle, setRunningCycle] = useState(false);
  const [statusData, setStatusData] = useState<ActivationControlStatus | null>(null);
  const [cycleResult, setCycleResult] = useState<RealBusinessCycleResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/operations/activation/status');
      const data = await res.json();
      if (res.ok) {
        setStatusData(data);
      } else {
        setErrorMsg(data.error || 'Failed to load status');
      }
    } catch (err: any) {
      console.error('Error fetching activation status:', err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleRunRealCycle = async () => {
    setRunningCycle(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/operations/activation/run', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCycleResult(data.result);
        await fetchStatus();
      } else {
        setErrorMsg(data.error || 'Failed to complete real cycle');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Cycle execution error');
    } finally {
      setRunningCycle(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED':
      case 'RUNNING':
      case 'DEPLOYED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            {status}
          </span>
        );
      case 'DEGRADED':
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-950/80 text-amber-400 border border-amber-800">
            <AlertTriangle className="w-3 h-3" />
            {status}
          </span>
        );
      case 'REQUIRES_MANUAL_SETUP':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800">
            <Clock className="w-3 h-3" />
            REQUIRES_MANUAL_SETUP
          </span>
        );
      case 'NOT_CONNECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-900 text-slate-400 border border-slate-700">
            NOT_CONNECTED
          </span>
        );
      case 'FAILED':
      case 'STOPPED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-950/80 text-rose-400 border border-rose-800">
            <XCircle className="w-3 h-3" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Navigation */}
      <OperationsNav />

      {/* Header & Main Trigger */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Real-World Autonomous Activation & First Business Loop
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Operating one real digital business in the real world with ₹0 automatic spending and strict reality demarcation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Refresh Status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleRunRealCycle}
            disabled={runningCycle}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition active:scale-[0.99] disabled:opacity-50"
          >
            <Play className={`w-4 h-4 ${runningCycle ? 'animate-spin' : ''}`} />
            {runningCycle ? 'Executing Real Cycle...' : 'Run Real Cycle'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Zero Spend Card */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Spend Guard</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 font-mono">₹0.00 Spent</div>
          <p className="text-[11px] text-slate-500">100% Free Autonomous Path</p>
        </div>

        {/* Real Visitors */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Real Visitors</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {statusData?.metrics.realVisitorsCount ?? 0}
          </div>
          <p className="text-[11px] text-slate-500">REAL Realm (is_demo = false)</p>
        </div>

        {/* Real Events */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Real Events</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {statusData?.metrics.realEventsCount ?? 0}
          </div>
          <p className="text-[11px] text-slate-500">Page Views & Core Actions</p>
        </div>

        {/* Real Feedback */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>User Feedback</span>
            <MessageSquare className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {statusData?.metrics.realFeedbackCount ?? 0}
          </div>
          <p className="text-[11px] text-slate-500">Live Ingested Submissions</p>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Primary Product Focus & Strategy Governor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Primary Product Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-semibold text-white">Current Primary Product Focus</h2>
              </div>
              <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono">
                Backlog: {statusData?.metrics.backlogCount ?? 0} opportunities
              </span>
            </div>

            {statusData?.primaryProduct.id ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <div className="text-base font-bold text-white">
                      {statusData.primaryProduct.name}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      Slug: /{statusData.primaryProduct.slug}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
                      {statusData.primaryProduct.status}
                    </span>
                    {statusData.primaryProduct.isVerified && (
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified Public URL
                      </span>
                    )}
                  </div>
                </div>

                {/* Public URL Live Link */}
                {statusData.primaryProduct.publicUrl ? (
                  <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-cyan-300">
                      <Globe className="w-4 h-4 text-cyan-400" />
                      <span className="font-semibold">Live Public URL:</span>
                      <a
                        href={statusData.primaryProduct.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:text-white font-mono break-all"
                      >
                        {statusData.primaryProduct.publicUrl}
                      </a>
                    </div>
                    <a
                      href={statusData.primaryProduct.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-200 font-medium ml-2 shrink-0"
                    >
                      Visit <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                    No public URL deployed yet. Click &quot;Run Real Cycle&quot; to build and deploy.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                No active primary product set. Run real cycle to select top opportunity.
              </div>
            )}
          </div>

          {/* Strategy Governor Real Data Decision */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-purple-400" />
                <h2 className="text-base font-semibold text-white">Strategy Governor (Real Data Only)</h2>
              </div>
              {statusData?.strategy.confidence && (
                <span className="text-xs px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono">
                  Confidence: {statusData.strategy.confidence}%
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Recommended Strategy
                </div>
                <div className="text-sm font-bold text-white">
                  {statusData?.strategy.currentStrategy || 'EVALUATING_INITIAL_TRACTION'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Primary Bottleneck
                </div>
                <div className="text-sm font-bold text-amber-400">
                  {statusData?.strategy.bottleneck || 'EXPOSURE'}
                </div>
              </div>
            </div>

            {/* Waiting For */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <div className="text-slate-400 font-medium">What We Are Waiting For:</div>
              <div className="text-slate-200 font-mono">
                {statusData?.strategy.waitingFor || 'WAIT_FOR_DATA: Observing initial organic traffic volume before evaluating conversion pivot.'}
              </div>
            </div>

            {/* Next 3-5 Actions */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300">
                Prioritized Next Actions (3–5 Actions):
              </div>
              {statusData?.strategy.nextActions && statusData.strategy.nextActions.length > 0 ? (
                <div className="space-y-1.5">
                  {statusData.strategy.nextActions.map((act, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center gap-2 text-slate-300"
                    >
                      <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-500">
                  Awaiting next cycle action generation.
                </div>
              )}
            </div>
          </div>

          {/* Last Real Cycle Run Log */}
          {cycleResult && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  Latest Real Business Cycle Execution ({cycleResult.cycleId})
                </h3>
                <span className="text-xs font-mono text-slate-400">{cycleResult.durationMs}ms</span>
              </div>

              <div className="space-y-2">
                {cycleResult.stages.map((stg, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-cyan-300">{stg.stage}</span>
                      <span className="text-[11px] font-mono text-slate-500">{stg.durationMs}ms</span>
                    </div>
                    <p className="text-slate-300">{stg.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: 15-Subsystem Health Status Grid */}
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              Subsystems Health Matrix
            </h2>
            <p className="text-xs text-slate-400">
              Live operational health and connection state across all 15 ABOS components.
            </p>

            <div className="space-y-2.5 divide-y divide-slate-800/60">
              {statusData?.components &&
                Object.entries(statusData.components).map(([key, info]) => (
                  <div key={key} className="pt-2.5 first:pt-0 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-200">{info.name}</span>
                      {getStatusBadge(info.status)}
                    </div>
                    {info.details && (
                      <span className="text-[11px] text-slate-400 leading-tight">
                        {info.details}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
