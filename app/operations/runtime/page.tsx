'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { OperationsNav } from '@/components/operations/operations-nav';
import { 
  Play, 
  Pause, 
  ShieldAlert, 
  ShieldCheck, 
  RefreshCw, 
  Cpu, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronRight,
  Zap,
  Terminal,
  Server,
  Activity,
  Bell
} from 'lucide-react';

interface RuntimeStatus {
  status: string;
  config: {
    safe_mode: boolean;
    dry_run_mode: boolean;
    max_concurrent_jobs: number;
    worker_heartbeat_interval_sec: number;
    stale_worker_timeout_sec: number;
    log_retention_days: number;
  };
  workers: {
    active_count: number;
    instances: Array<{
      id: string;
      worker_id: string;
      hostname: string;
      pid: number;
      status: string;
      started_at: string;
      last_heartbeat_at: string;
    }>;
  };
  cycles: {
    running_count: number;
    recent: any[];
  };
  schedules: {
    active_count: number;
    items: Array<{
      id: string;
      name: string;
      job_type: string;
      cron_expression?: string;
      interval_seconds?: number;
      enabled: boolean;
      last_run_at?: string;
      next_run_at: string;
    }>;
  };
  notifications: {
    unacknowledged_count: number;
    recent: Array<{
      id: string;
      title: string;
      message: string;
      severity: string;
      category: string;
      created_at: string;
      acknowledged: boolean;
    }>;
  };
  system: {
    is_kill_switch_active: boolean;
    is_paused: boolean;
    pause_reason?: string;
  };
}

export default function RuntimeOperationsPage() {
  const [data, setData] = useState<RuntimeStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedCycle, setExpandedCycle] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/runtime/status');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setError(null);
      } else {
        setError(json.error || 'Failed to load runtime status');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleControlAction = async (action: string, extra: Record<string, any> = {}) => {
    setActionLoading(action);
    try {
      const res = await fetch('/api/runtime/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.error || 'Control action failed');
      }
      await fetchStatus();
    } catch (err: any) {
      alert(err.message || 'Network error sending control action');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTriggerSchedule = async (scheduleId: string) => {
    setActionLoading(`trigger_${scheduleId}`);
    try {
      const res = await fetch('/api/runtime/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger_now', schedule_id: scheduleId }),
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.error || 'Failed to trigger schedule');
      }
      await fetchStatus();
    } catch (err: any) {
      alert(err.message || 'Error triggering schedule');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleSchedule = async (scheduleId: string) => {
    setActionLoading(`toggle_${scheduleId}`);
    try {
      const res = await fetch('/api/runtime/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', schedule_id: scheduleId }),
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.error || 'Failed to toggle schedule');
      }
      await fetchStatus();
    } catch (err: any) {
      alert(err.message || 'Error toggling schedule');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcknowledgeNotification = async (notificationId: string) => {
    try {
      await fetch('/api/runtime/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge', notification_id: notificationId }),
      });
      await fetchStatus();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcknowledgeAll = async () => {
    try {
      await fetch('/api/runtime/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge_all' }),
      });
      await fetchStatus();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Header & Nav */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Cpu className="w-7 h-7 text-blue-500" />
              Autonomous Runtime & Worker Daemon
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Phase 12 — Continuous server-side worker daemon, scheduled business cycles, and autonomous loop orchestration.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-sm text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
              <span className={`w-2 h-2 rounded-full ${data?.workers.active_count ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {data?.workers.active_count ? `${data.workers.active_count} Worker Active` : 'No Worker Online'}
            </span>
          </div>
        </div>

        <OperationsNav />
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Global Status Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Runtime State */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Runtime Status</span>
          <div className="flex items-center gap-2 pt-1">
            {data?.system.is_kill_switch_active ? (
              <span className="flex items-center gap-1.5 text-base font-bold text-red-400">
                <XCircle className="w-5 h-5 text-red-500" /> KILL SWITCH ACTIVE
              </span>
            ) : data?.system.is_paused ? (
              <span className="flex items-center gap-1.5 text-base font-bold text-amber-400">
                <Pause className="w-5 h-5 text-amber-500" /> PAUSED
              </span>
            ) : data?.config.safe_mode ? (
              <span className="flex items-center gap-1.5 text-base font-bold text-amber-400">
                <ShieldAlert className="w-5 h-5 text-amber-500" /> SAFE MODE
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-base font-bold text-emerald-400">
                <Play className="w-5 h-5 text-emerald-500" /> RUNNING
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {data?.system.is_kill_switch_active 
              ? 'All pipeline activity strictly halted'
              : data?.system.is_paused 
              ? data.system.pause_reason || 'Autonomous execution paused'
              : data?.config.safe_mode
              ? 'Dry-run mode & write locks active'
              : 'Continuous autonomous loop ready'}
          </p>
        </div>

        {/* Worker Instance */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Worker Daemon</span>
          <div className="flex items-center gap-2 pt-1">
            <Server className={`w-5 h-5 ${data?.workers.active_count ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="text-base font-bold text-slate-100">
              {data?.workers.active_count ? `${data.workers.active_count} Active Process` : 'Worker Offline'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {data?.workers.instances[0] 
              ? `PID: ${data.workers.instances[0].pid} on ${data.workers.instances[0].hostname}`
              : 'Run: npm run worker'}
          </p>
        </div>

        {/* Financial Policy */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Spend Policy</span>
          <div className="flex items-center gap-2 pt-1">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-base font-bold text-slate-100">₹0 Automatic Spend</span>
          </div>
          <p className="text-xs text-slate-500">
            All paid actions routed to Approval Center
          </p>
        </div>

        {/* Concurrency & Slots */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Concurrency Limit</span>
          <div className="flex items-center gap-2 pt-1">
            <Activity className="w-5 h-5 text-blue-400" />
            <span className="text-base font-bold text-slate-100">
              {data?.config.max_concurrent_jobs || 3} Concurrent Jobs
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Resource Governor active
          </p>
        </div>
      </div>

      {/* Operator Controls Bar */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          Operator Runtime Controls
        </h2>
        <div className="flex flex-wrap gap-3">
          {data?.system.is_paused ? (
            <button
              onClick={() => handleControlAction('resume')}
              disabled={!!actionLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Resume Autonomous Execution
            </button>
          ) : (
            <button
              onClick={() => handleControlAction('pause')}
              disabled={!!actionLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              <Pause className="w-4 h-4" />
              Pause Autonomous Execution
            </button>
          )}

          <button
            onClick={() => handleControlAction('toggle_safe_mode', { enabled: !data?.config.safe_mode })}
            disabled={!!actionLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm disabled:opacity-50 ${
              data?.config.safe_mode
                ? 'bg-amber-900/60 border border-amber-600 text-amber-200 hover:bg-amber-800'
                : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            {data?.config.safe_mode ? 'Disable Safe Mode' : 'Enable Safe Mode (Dry-Run)'}
          </button>

          <button
            onClick={() => handleControlAction('trigger_daily_cycle')}
            disabled={!!actionLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            Trigger Daily Cycle Now
          </button>

          <button
            onClick={() => handleControlAction('trigger_weekly_cycle')}
            disabled={!!actionLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
          >
            <Calendar className="w-4 h-4" />
            Trigger Weekly Strategic Review
          </button>
        </div>
      </div>

      {/* Main Grid: Scheduled Jobs & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scheduled Jobs Timetable (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Scheduled Autonomous Business Cycles
            </h2>
            <span className="text-xs text-slate-400">
              Database-backed cron scheduler
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Schedule Name</th>
                  <th className="px-4 py-3">Frequency</th>
                  <th className="px-4 py-3">Last Run</th>
                  <th className="px-4 py-3">Next Due</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data?.schedules.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      No scheduled jobs registered. Start worker daemon to seed baseline schedules.
                    </td>
                  </tr>
                ) : (
                  data?.schedules.items.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-200">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${job.enabled ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                          <div>
                            <div>{job.name}</div>
                            <div className="text-xs text-slate-500 font-mono">{job.job_type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300 font-mono">
                        {job.cron_expression || `${job.interval_seconds}s`}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {job.last_run_at ? new Date(job.last_run_at).toLocaleTimeString() : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300">
                        {job.next_run_at ? new Date(job.next_run_at).toLocaleTimeString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleSchedule(job.id)}
                            disabled={actionLoading === `toggle_${job.id}`}
                            className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                              job.enabled 
                                ? 'border-amber-700 text-amber-300 hover:bg-amber-900/40' 
                                : 'border-emerald-700 text-emerald-300 hover:bg-emerald-900/40'
                            }`}
                          >
                            {job.enabled ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => handleTriggerSchedule(job.id)}
                            disabled={actionLoading === `trigger_${job.id}`}
                            className="px-2.5 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50"
                          >
                            Trigger
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notifications Card (1 col) */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              Runtime Notifications
            </h2>
            {data?.notifications.unacknowledged_count ? (
              <button
                onClick={handleAcknowledgeAll}
                className="text-xs text-blue-400 hover:underline"
              >
                Ack All ({data.notifications.unacknowledged_count})
              </button>
            ) : null}
          </div>

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {data?.notifications.recent.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                No runtime notifications.
              </div>
            ) : (
              data?.notifications.recent.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-lg border text-xs space-y-1 transition-colors ${
                    n.acknowledged 
                      ? 'bg-slate-950/40 border-slate-800 text-slate-400' 
                      : n.severity === 'CRITICAL' 
                      ? 'bg-red-950/40 border-red-800 text-red-200' 
                      : n.severity === 'HIGH'
                      ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                      : 'bg-slate-950 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>{n.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {n.severity}
                    </span>
                  </div>
                  <p className="text-slate-400">{n.message}</p>
                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                    <span>{new Date(n.created_at).toLocaleTimeString()}</span>
                    {!n.acknowledged && (
                      <button
                        onClick={() => handleAcknowledgeNotification(n.id)}
                        className="text-blue-400 hover:underline"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Execution Cycles & Stage Progress */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Execution Cycles & Multi-Stage Pipelines
          </h2>
          <span className="text-xs text-slate-400">
            Complete autonomous loop traces
          </span>
        </div>

        <div className="space-y-3">
          {data?.cycles.recent.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">
              No execution cycles recorded yet. Trigger a Daily or Weekly cycle above.
            </div>
          ) : (
            data?.cycles.recent.map((cycle: any) => {
              const isExpanded = expandedCycle === cycle.id;
              const completedCount = cycle.stages?.filter((s: any) => s.status === 'COMPLETED').length || 0;
              const totalCount = cycle.stages?.length || cycle.total_stages || 1;
              const percent = Math.round((completedCount / totalCount) * 100);

              return (
                <div
                  key={cycle.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden"
                >
                  <div
                    onClick={() => setExpandedCycle(isExpanded ? null : cycle.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200">{cycle.cycle_type} CYCLE</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                            cycle.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                            cycle.status === 'RUNNING' ? 'bg-blue-950 text-blue-300 border border-blue-800 animate-pulse' :
                            cycle.status === 'FAILED' ? 'bg-red-950 text-red-300 border border-red-800' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {cycle.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Started: {new Date(cycle.started_at).toLocaleString()} • Trigger: {cycle.trigger_source}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-32 hidden md:block">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>Progress</span>
                          <span>{percent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${cycle.status === 'FAILED' ? 'bg-red-500' : 'bg-emerald-500'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">
                        {completedCount}/{totalCount} stages
                      </span>
                    </div>
                  </div>

                  {isExpanded && cycle.stages && (
                    <div className="p-4 border-t border-slate-800 bg-slate-950 text-xs space-y-2">
                      <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                        Cycle Stage Breakdown
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {cycle.stages.map((stage: any) => (
                          <div
                            key={stage.id}
                            className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-start justify-between gap-2"
                          >
                            <div>
                              <div className="font-medium text-slate-200">
                                {stage.stage_order}. {stage.stage_name}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Phase: {stage.phase} • Duration: {stage.duration_ms ? `${stage.duration_ms}ms` : '—'}
                              </div>
                              {stage.error_message && (
                                <div className="text-[10px] text-red-400 mt-1">
                                  {stage.error_message}
                                </div>
                              )}
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                              stage.status === 'COMPLETED' ? 'text-emerald-400 bg-emerald-950/60' :
                              stage.status === 'RUNNING' ? 'text-blue-400 bg-blue-950/60 animate-pulse' :
                              stage.status === 'FAILED' ? 'text-red-400 bg-red-950/60' :
                              stage.status === 'SKIPPED' ? 'text-slate-400 bg-slate-800' :
                              'text-slate-500 bg-slate-900'
                            }`}>
                              {stage.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Terminal Instructions Card */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3 text-xs text-slate-400">
        <Terminal className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-200">How to run the background worker daemon:</span>
          <p className="mt-1">
            Execute <code className="px-1.5 py-0.5 rounded bg-slate-800 text-blue-300 font-mono">npm run worker</code> in a separate terminal process to maintain the autonomous loop, evaluate schedules, claim queued jobs with PostgreSQL row-level locks, and emit heartbeats.
          </p>
        </div>
      </div>
    </div>
  );
}
