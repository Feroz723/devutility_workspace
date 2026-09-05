'use client';

import React, { useState, useEffect } from 'react';
import { OperationsNav } from '@/components/operations/operations-nav';
import { 
  Radio, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  ExternalLink, 
  Play, 
  Clock, 
  RefreshCw 
} from 'lucide-react';

interface Integration {
  provider: string;
  category: string;
  capabilities: string[];
  connection_status: string;
  last_successful_check?: string;
  last_error?: string;
  required_env_vars: string[];
  latency_ms?: number;
}

export default function OperationsIntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/operations/integrations');
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations || []);
      }
    } catch (err) {
      console.error('Failed to load integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (provider: string) => {
    setTestingProvider(provider);
    try {
      const res = await fetch(`/api/operations/integrations/${provider}/test`, { method: 'POST' });
      if (res.ok) {
        fetchIntegrations();
      }
    } catch (err) {
      console.error('Testing connection failed:', err);
    } finally {
      setTestingProvider(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'HEALTHY':
      case 'CONFIGURED_LIVE':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{status}</span>;
      case 'CONFIGURED_TEST':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">{status}</span>;
      case 'DEGRADED':
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">{status}</span>;
      case 'FAILED':
      case 'BLOCKED':
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
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Integration Health & Credential Monitor
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Verifiable connection health and latency reporting across AI providers, databases, payment gateways, and email dispatchers.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchIntegrations}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh All
        </button>
      </div>

      <OperationsNav />

      {/* Integrations Grid */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500">Checking integration statuses...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {integrations.map((int) => (
            <div
              key={int.provider}
              className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">{int.provider}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {int.category}
                    </span>
                  </div>
                  {getStatusBadge(int.connection_status)}
                </div>

                <div className="space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Capabilities:</span>
                    <span className="text-slate-300 font-medium text-[11px]">
                      {int.capabilities?.slice(0, 2).join(', ') || 'N/A'}
                    </span>
                  </div>
                  {int.latency_ms !== undefined && int.latency_ms !== null && (
                    <div className="flex items-center justify-between">
                      <span>Latency:</span>
                      <span className="text-emerald-400 font-mono">{int.latency_ms}ms</span>
                    </div>
                  )}
                  {int.last_error && (
                    <div className="p-2 rounded bg-rose-950/30 border border-rose-900/50 text-[11px] text-rose-300 font-mono truncate" title={int.last_error}>
                      {int.last_error}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {int.last_successful_check ? new Date(int.last_successful_check).toLocaleTimeString() : 'Never checked'}
                </span>
                <button
                  onClick={() => handleTestConnection(int.provider)}
                  disabled={testingProvider === int.provider}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                >
                  {testingProvider === int.provider ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
