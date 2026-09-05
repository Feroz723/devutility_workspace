'use client';

import React, { useState, useEffect } from 'react';
import { OperationsNav } from '@/components/operations/operations-nav';
import { 
  Bot, 
  Play, 
  Pause, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Tag, 
  Layers,
  RefreshCw 
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  phase_number: number;
  capabilities: string[];
  status: string;
  last_execution_at?: string;
  last_error?: string;
  dependencies: string[];
}

export default function OperationsAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/operations/agents');
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch (err) {
      console.error('Failed to load agents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAgent = async (id: string, currentStatus: string) => {
    setProcessingId(id);
    const action = currentStatus === 'PAUSED' ? 'RESUME' : 'PAUSE';
    try {
      const res = await fetch('/api/operations/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) fetchAgents();
    } catch (err) {
      console.error('Failed to toggle agent:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVE</span>;
      case 'PAUSED':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">PAUSED</span>;
      case 'DEGRADED':
      case 'FAILED':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">{status}</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Autonomous Agent Roster
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Lifecycle status, dependency hierarchy, and pause/resume controls for all 10 domain agents.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchAgents}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Roster
        </button>
      </div>

      <OperationsNav />

      {/* Agents Roster */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500">Loading agent roster...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      PHASE {agent.phase_number}
                    </span>
                    <h3 className="font-semibold text-white text-sm mt-1">{agent.name}</h3>
                  </div>
                  {getStatusBadge(agent.status)}
                </div>

                <div className="space-y-1.5 text-xs text-slate-400">
                  <div className="flex flex-wrap gap-1">
                    {agent.capabilities?.map((cap) => (
                      <span key={cap} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                        {cap}
                      </span>
                    ))}
                  </div>

                  {agent.dependencies?.length > 0 && (
                    <div className="pt-2 text-[11px] text-slate-500">
                      <span>Depends on: </span>
                      <span className="text-slate-300">{agent.dependencies.join(', ')}</span>
                    </div>
                  )}

                  {agent.last_error && (
                    <div className="p-2 rounded bg-rose-950/30 border border-rose-900/50 text-[11px] text-rose-300 truncate" title={agent.last_error}>
                      {agent.last_error}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">
                  {agent.last_execution_at ? `Last run: ${new Date(agent.last_execution_at).toLocaleTimeString()}` : 'Idle'}
                </span>
                <button
                  onClick={() => handleToggleAgent(agent.id, agent.status)}
                  disabled={processingId === agent.id}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    agent.status === 'PAUSED'
                      ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400'
                      : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-400'
                  }`}
                >
                  {agent.status === 'PAUSED' ? (
                    <>
                      <Play className="w-3 h-3" /> Resume
                    </>
                  ) : (
                    <>
                      <Pause className="w-3 h-3" /> Pause
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
