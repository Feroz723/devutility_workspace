'use client';

import React, { useState, useEffect } from 'react';
import { IntelligenceNav } from '@/components/intelligence/intelligence-nav';
import { 
  TrendingUp, 
  Calendar, 
  AlertCircle, 
  Info, 
  Sparkles, 
  ChevronRight,
  BarChart2,
  Users,
  DollarSign,
  Layers
} from 'lucide-react';

interface ForecastData {
  target: string;
  projection_30d: number;
  projection_60d: number;
  projection_90d: number;
  confidence_interval_low: number;
  confidence_interval_high: number;
  historical_growth_rate_daily: number;
  insufficient_data: boolean;
}

export default function BusinessForecastsPage() {
  const [forecasts, setForecasts] = useState<ForecastData[]>([]);
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [dataWindowDays, setDataWindowDays] = useState<number>(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForecasts();
  }, []);

  const fetchForecasts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/intelligence/forecasts');
      if (res.ok) {
        const data = await res.json();
        setForecasts(data.forecasts || []);
        setAssumptions(data.assumptions || []);
        setDataWindowDays(data.data_window_days || 30);
      }
    } catch (err) {
      console.error('Failed to load forecasts:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMetricIcon = (target: string) => {
    switch (target.toLowerCase()) {
      case 'revenue':
        return <DollarSign className="w-5 h-5 text-emerald-400" />;
      case 'customers':
        return <Users className="w-5 h-5 text-blue-400" />;
      case 'traffic':
        return <BarChart2 className="w-5 h-5 text-purple-400" />;
      default:
        return <Layers className="w-5 h-5 text-cyan-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Deterministic Forecasting
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                  Linear Projections
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Transparent runway and growth projections based purely on verified past performance. Strictly zero fabricated trends.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <IntelligenceNav />

      {/* Assumptions Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Info className="w-4 h-4 text-cyan-400" />
          Forecast Modeling Disclosures & Assumptions ({dataWindowDays}-Day Historical Window)
        </div>
        <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
          {assumptions.map((asm, idx) => (
            <li key={idx} className="leading-relaxed">{asm}</li>
          ))}
        </ul>
      </div>

      {/* Projections Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-64 bg-slate-900/40 border border-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : forecasts.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-slate-900/30 border border-slate-800 text-slate-400">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-500" />
          <p className="text-base font-medium text-slate-300">Insufficient Data for Forecasting</p>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            The business operating system requires historical baseline events before running deterministic forward linear projections.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {forecasts.map(fc => (
            <div 
              key={fc.target}
              className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-5 hover:border-slate-700 transition-colors"
            >
              {/* Target Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                    {getMetricIcon(fc.target)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white capitalize">{fc.target}</h3>
                    <p className="text-xs text-slate-400">Deterministic Linear Model</p>
                  </div>
                </div>

                {fc.insufficient_data ? (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                    Insufficient Data
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    Active
                  </span>
                )}
              </div>

              {fc.insufficient_data ? (
                <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/50 text-xs text-slate-400 leading-relaxed">
                  No verified historical volume in the last {dataWindowDays} days. Forward extrapolation has been truthfully paused to avoid false assumptions.
                </div>
              ) : (
                <>
                  {/* Projections Matrix */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                    <div className="text-center">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">30 Days</div>
                      <div className="text-base font-bold text-white mt-1">
                        {fc.target.toLowerCase() === 'revenue' ? `₹${fc.projection_30d.toLocaleString()}` : fc.projection_30d.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-center border-x border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">60 Days</div>
                      <div className="text-base font-bold text-white mt-1">
                        {fc.target.toLowerCase() === 'revenue' ? `₹${fc.projection_60d.toLocaleString()}` : fc.projection_60d.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">90 Days</div>
                      <div className="text-base font-bold text-white mt-1">
                        {fc.target.toLowerCase() === 'revenue' ? `₹${fc.projection_90d.toLocaleString()}` : fc.projection_90d.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Confidence Interval & Daily Rate */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>90-Day Range:</span>
                      <span className="font-medium text-slate-300">
                        {fc.target.toLowerCase() === 'revenue' ? `₹${fc.confidence_interval_low.toLocaleString()} - ₹${fc.confidence_interval_high.toLocaleString()}` : `${fc.confidence_interval_low.toLocaleString()} - ${fc.confidence_interval_high.toLocaleString()}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Historical Daily Rate:</span>
                      <span className="font-medium text-slate-300">
                        {fc.historical_growth_rate_daily >= 0 ? '+' : ''}{fc.historical_growth_rate_daily.toFixed(2)}/day
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
