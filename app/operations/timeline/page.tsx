'use client';

import React, { useState, useEffect } from 'react';
import { OperationsNav } from '@/components/operations/operations-nav';
import { 
  Clock, 
  Tag, 
  Activity, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  RefreshCw 
} from 'lucide-react';

interface EventItem {
  event_id: string;
  event_type: string;
  source_module: string;
  entity_type: string;
  entity_id: string;
  correlation_id?: string;
  payload: Record<string, any>;
  timestamp: string;
}

export default function OperationsTimelinePage() {
  const [timeline, setTimeline] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeline();
  }, []);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/operations/timeline?limit=100');
      if (res.ok) {
        const data = await res.json();
        setTimeline(data.timeline || []);
      }
    } catch (err) {
      console.error('Failed to load timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Unified Operational Audit Timeline
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Chronological ledger of operational events, autonomous state transitions, job executions, and safety actions.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchTimeline}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <OperationsNav />

      {/* Timeline Stream */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading audit timeline...</div>
        ) : timeline.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No operational events recorded yet.</div>
        ) : (
          <div className="relative border-l border-slate-800 ml-4 space-y-6">
            {timeline.map((evt) => (
              <div key={evt.event_id} className="relative pl-6">
                <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-slate-950" />

                <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{evt.event_type}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {evt.source_module}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">{new Date(evt.timestamp).toLocaleString()}</span>
                  </div>

                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span>Entity: <strong className="text-slate-200">{evt.entity_type}</strong> ({evt.entity_id})</span>
                    {evt.correlation_id && (
                      <span className="text-slate-500 font-mono text-[10px]">corr: {evt.correlation_id}</span>
                    )}
                  </div>

                  {evt.payload && Object.keys(evt.payload).length > 0 && (
                    <pre className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono overflow-x-auto">
                      {JSON.stringify(evt.payload, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
