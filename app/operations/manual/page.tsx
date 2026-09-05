'use client';

import React, { useState, useEffect } from 'react';
import { OperationsNav } from '@/components/operations/operations-nav';
import { 
  Wrench, 
  KeyRound, 
  ExternalLink, 
  CheckCircle2, 
  HelpCircle, 
  MapPin, 
  FileCode2,
  RefreshCw 
} from 'lucide-react';

interface ManualAction {
  id: string;
  title: string;
  module: string;
  category: string;
  what: string;
  why: string;
  where_location: string;
  how_instructions: string;
  status: string;
  required_keys?: string[];
  severity: string;
}

export default function OperationsManualPage() {
  const [actions, setActions] = useState<ManualAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActions();
  }, []);

  const fetchActions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/operations/manual');
      if (res.ok) {
        const data = await res.json();
        setActions(data.actions || []);
      }
    } catch (err) {
      console.error('Failed to load manual actions:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Manual Action & Setup Center
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Explicit instructions on what credentials or manual setups are required to unlock live external integrations.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchActions}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <OperationsNav />

      {/* Manual Actions List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500">Loading setup actions...</div>
      ) : actions.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400 space-y-2">
          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500/40" />
          <p className="font-medium text-slate-200">All integrations and manual configs resolved</p>
          <p className="text-xs text-slate-500">No human configuration tasks are currently blocking autonomous operations.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {actions.map((act) => (
            <div
              key={act.id}
              className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3.5 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {act.module}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {act.status}
                  </span>
                </div>

                <h3 className="font-semibold text-white text-base">{act.title}</h3>

                <div className="space-y-2 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-slate-500 font-semibold uppercase text-[10px]">What:</span>
                    <p className="text-slate-300">{act.what}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-500 font-semibold uppercase text-[10px]">Why:</span>
                    <p className="text-slate-300">{act.why}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-500 font-semibold uppercase text-[10px]">Where:</span>
                    <p className="text-slate-300 font-mono">{act.where_location}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-500 font-semibold uppercase text-[10px]">How:</span>
                    <p className="text-slate-200 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed font-mono text-[11px]">
                      {act.how_instructions}
                    </p>
                  </div>
                </div>
              </div>

              {act.required_keys && act.required_keys.length > 0 && (
                <div className="pt-3 border-t border-slate-800 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Required Keys:</span>
                  {act.required_keys.map((k) => (
                    <span key={k} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400">
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
