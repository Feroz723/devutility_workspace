'use client';

import React, { useState, useEffect } from 'react';
import { OperationsNav } from '@/components/operations/operations-nav';
import { 
  ListTree, 
  RotateCcw, 
  XCircle, 
  AlertOctagon, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter,
  RefreshCw
} from 'lucide-react';

interface Job {
  id: string;
  name: string;
  module: string;
  action: string;
  status: string;
  priority: number;
  attempts: number;
  max_attempts: number;
  failure_classification?: string;
  last_error?: string;
  created_at: string;
}

export default function OperationsJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
  }, [statusFilter]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'ALL' ? '/api/operations/jobs' : `/api/operations/jobs?status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryJob = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/operations/jobs/${id}/retry`, { method: 'POST' });
      if (res.ok) fetchJobs();
    } catch (err) {
      console.error('Failed to retry job:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelJob = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/operations/jobs/${id}/cancel`, { method: 'POST' });
      if (res.ok) fetchJobs();
    } catch (err) {
      console.error('Failed to cancel job:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRetryAllDeadLetter = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/operations/jobs/dead-letter', { method: 'POST' });
      if (res.ok) fetchJobs();
    } catch (err) {
      console.error('Failed to retry dead letters:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">SUCCEEDED</span>;
      case 'RUNNING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">RUNNING</span>;
      case 'RETRYING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">RETRYING</span>;
      case 'DEAD_LETTER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">DEAD LETTER</span>;
      case 'BLOCKED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">BLOCKED</span>;
      case 'WAITING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">WAITING</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <ListTree className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Job Queue & Dead-Letter Manager
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Inspect atomic job queues, retry policies, failure classifications, and dead-letter pipelines.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {statusFilter === 'DEAD_LETTER' && (
            <button
              onClick={handleRetryAllDeadLetter}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry All Dead Letters
            </button>
          )}
          <button
            onClick={fetchJobs}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <OperationsNav />

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="QUEUED">QUEUED</option>
            <option value="RUNNING">RUNNING</option>
            <option value="SUCCEEDED">SUCCEEDED</option>
            <option value="RETRYING">RETRYING</option>
            <option value="DEAD_LETTER">DEAD_LETTER</option>
            <option value="WAITING">WAITING</option>
            <option value="BLOCKED">BLOCKED</option>
          </select>
        </div>

        <span className="text-xs text-slate-400">
          Showing <span className="text-white font-medium">{jobs.length}</span> jobs
        </span>
      </div>

      {/* Jobs Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading orchestrator jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No jobs found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Job Name</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Attempts</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Last Error</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">{job.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                        {job.module}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono">{job.action}</td>
                    <td className="py-3 px-4">{getStatusBadge(job.status)}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {job.attempts} / {job.max_attempts}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {job.failure_classification ? (
                        <span className="text-[10px] font-mono text-amber-400">
                          {job.failure_classification}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate" title={job.last_error || ''}>
                      {job.last_error || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {(job.status === 'DEAD_LETTER' || job.status === 'FAILED') && (
                          <button
                            onClick={() => handleRetryJob(job.id)}
                            disabled={processingId === job.id}
                            className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[11px] font-medium"
                          >
                            Retry
                          </button>
                        )}
                        {(job.status === 'QUEUED' || job.status === 'RUNNING' || job.status === 'RETRYING') && (
                          <button
                            onClick={() => handleCancelJob(job.id)}
                            disabled={processingId === job.id}
                            className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-[11px] font-medium"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
