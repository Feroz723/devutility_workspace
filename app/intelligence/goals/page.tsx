'use client';

import React, { useState, useEffect } from 'react';
import { IntelligenceNav } from '@/components/intelligence/intelligence-nav';
import { 
  Target, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  X,
  Flag
} from 'lucide-react';

interface BusinessGoal {
  id: string;
  title: string;
  metric_name: string;
  target_value: number;
  current_value: number;
  status: 'ACTIVE' | 'ACHIEVED' | 'MISSED';
  deadline?: string;
  created_at: string;
}

export default function BusinessGoalsPage() {
  const [goals, setGoals] = useState<BusinessGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [metricName, setMetricName] = useState('REVENUE');
  const [targetValue, setTargetValue] = useState('');
  const [currentValue, setCurrentValue] = useState('0');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/intelligence/goals');
      if (res.ok) {
        const data = await res.json();
        setGoals(data.goals || []);
      }
    } catch (err) {
      console.error('Failed to load goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetValue) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/intelligence/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          metric_name: metricName,
          target_value: parseFloat(targetValue),
          current_value: parseFloat(currentValue) || 0,
          deadline: deadline || undefined,
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setTitle('');
        setTargetValue('');
        setCurrentValue('0');
        setDeadline('');
        fetchGoals();
      }
    } catch (err) {
      console.error('Failed to create goal:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACHIEVED':
        return (
          <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            <CheckCircle2 className="w-3 h-3" /> Achieved
          </span>
        );
      case 'MISSED':
        return (
          <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
            <AlertTriangle className="w-3 h-3" /> Missed
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
            <Clock className="w-3 h-3" /> Active
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Business Goals & Objective Tracker
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium">
                  Autonomous OKRs
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Set and track north star milestones. The autonomous system prioritizes resource allocation and decisions toward these goals.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors shadow-lg shadow-teal-900/20"
        >
          <Plus className="w-4 h-4" />
          Define Goal
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <IntelligenceNav />

      {/* Goals Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-48 bg-slate-900/40 border border-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-slate-900/30 border border-slate-800 text-slate-400">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30 text-teal-500" />
          <p className="text-base font-medium text-slate-300">No active goals configured</p>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Define high-level revenue, customer acquisition, or conversion targets to align autonomous decision-making.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Create First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map(goal => {
            const pct = Math.min(100, Math.round((goal.current_value / (goal.target_value || 1)) * 100));
            return (
              <div 
                key={goal.id}
                className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                      {goal.metric_name}
                    </span>
                    <h3 className="font-semibold text-white text-base mt-2">{goal.title}</h3>
                  </div>
                  {getStatusBadge(goal.status)}
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Current Progress</span>
                    <span className="font-bold text-white">{pct}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        goal.status === 'ACHIEVED' 
                          ? 'bg-emerald-500' 
                          : goal.status === 'MISSED' 
                          ? 'bg-rose-500' 
                          : 'bg-teal-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>Current: <strong className="text-slate-200">{goal.current_value.toLocaleString()}</strong></span>
                    <span>Target: <strong className="text-slate-200">{goal.target_value.toLocaleString()}</strong></span>
                  </div>
                </div>

                {/* Footer details */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'No Deadline'}
                  </span>
                  <span>Created {new Date(goal.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Flag className="w-5 h-5 text-teal-400" />
                Define Business Target
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Goal Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Reach ₹50,000 monthly revenue"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Metric Type</label>
                  <select
                    value={metricName}
                    onChange={(e) => setMetricName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="REVENUE">Revenue (₹)</option>
                    <option value="CUSTOMERS">Total Customers</option>
                    <option value="CONVERSION_RATE">Conversion Rate (%)</option>
                    <option value="RETENTION_RATE">Retention Rate (%)</option>
                    <option value="LEADS">Qualified Leads</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target Value</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50000"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Current Value</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Deadline (Optional)</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
