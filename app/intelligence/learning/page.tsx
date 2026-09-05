'use client';

import React, { useState, useEffect } from 'react';
import { IntelligenceNav } from '@/components/intelligence/intelligence-nav';
import { 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  Lightbulb, 
  HelpCircle, 
  Search, 
  Filter,
  Tag,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface BusinessLearning {
  id: string;
  category: string;
  source_type: string;
  source_id?: string;
  what_worked?: string;
  what_failed?: string;
  why_reasoning?: string;
  evidence_summary?: string;
  recommendation?: string;
  confidence_score: number;
  created_at: string;
}

export default function BusinessLearningPage() {
  const [learnings, setLearnings] = useState<BusinessLearning[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLearnings();
  }, [filterCategory]);

  const fetchLearnings = async () => {
    setLoading(true);
    try {
      const url = filterCategory === 'ALL' 
        ? '/api/intelligence/learning' 
        : `/api/intelligence/learning?category=${filterCategory}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLearnings(data.learnings || []);
      }
    } catch (err) {
      console.error('Failed to load organizational learnings:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = learnings.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (item.what_worked && item.what_worked.toLowerCase().includes(term)) ||
      (item.what_failed && item.what_failed.toLowerCase().includes(term)) ||
      (item.why_reasoning && item.why_reasoning.toLowerCase().includes(term)) ||
      (item.recommendation && item.recommendation.toLowerCase().includes(term)) ||
      item.category.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Organizational Learning Base
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Long-term Memory
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Verifiable post-mortems and success patterns: What worked, what failed, why, and actionable guidance for future iterations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <IntelligenceNav />

      {/* Controls / Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search learnings by keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="ALL">All Categories</option>
              <option value="PRODUCT">Product</option>
              <option value="DISTRIBUTION">Distribution</option>
              <option value="SALES">Sales / Pricing</option>
              <option value="CUSTOMER_SUCCESS">Customer Success</option>
              <option value="EXPERIMENT">Experimentation</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="text-white font-medium">{filtered.length}</span> recorded learnings
        </div>
      </div>

      {/* Learnings Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-64 bg-slate-900/40 border border-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-slate-900/30 border border-slate-800 text-slate-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-500" />
          <p className="text-base font-medium text-slate-300">No organizational learnings recorded yet</p>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            When experiments finish, products are sunset or validated, or customer retention changes, the learning engine extracts actionable patterns.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map(item => (
            <div 
              key={item.id}
              className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-4 hover:border-slate-700 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Meta header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      {item.category}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {item.source_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* What worked */}
                {item.what_worked && (
                  <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      What Worked
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      {item.what_worked}
                    </p>
                  </div>
                )}

                {/* What failed */}
                {item.what_failed && (
                  <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/40 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
                      <XCircle className="w-3.5 h-3.5" />
                      What Failed
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      {item.what_failed}
                    </p>
                  </div>
                )}

                {/* Why reasoning */}
                {item.why_reasoning && (
                  <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-900/40 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
                      <HelpCircle className="w-3.5 h-3.5" />
                      Root Cause Analysis (Why)
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {item.why_reasoning}
                    </p>
                  </div>
                )}

                {/* Recommendation */}
                {item.recommendation && (
                  <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/40 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                      <Lightbulb className="w-3.5 h-3.5" />
                      System Guidance
                    </div>
                    <p className="text-sm text-amber-200 leading-relaxed">
                      {item.recommendation}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer Evidence & Confidence */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Confidence:</span>
                  <span className="font-semibold text-slate-200">
                    {Math.round(item.confidence_score * 100)}%
                  </span>
                </div>
                {item.evidence_summary && (
                  <div className="text-slate-400 truncate max-w-[200px]" title={item.evidence_summary}>
                    {item.evidence_summary}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
