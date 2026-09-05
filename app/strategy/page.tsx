"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Target,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  FileText,
  Activity,
  Layers,
  Sparkles,
  Info,
  Lock,
  Search,
  ExternalLink,
} from "lucide-react";

export default function StrategyGovernorPage() {
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [currentData, setCurrentData] = useState<any>(null);
  const [dailyBrief, setDailyBrief] = useState<any>(null);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [observationWindows, setObservationWindows] = useState<any[]>([]);
  const [bottlenecks, setBottlenecks] = useState<any[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [backlog, setBacklog] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "funnel" | "bottlenecks" | "patterns" | "brief" | "backlog">("overview");

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [currRes, briefRes, evidRes, bottleRes, pattRes, oppRes] = await Promise.all([
        fetch("/api/strategy/current").then((r) => r.json()),
        fetch("/api/strategy/daily").then((r) => r.json()),
        fetch("/api/strategy/evidence").then((r) => r.json()),
        fetch("/api/strategy/bottlenecks").then((r) => r.json()),
        fetch("/api/strategy/patterns").then((r) => r.json()),
        fetch("/api/strategy/opportunities").then((r) => r.json()),
      ]);

      if (currRes.success) setCurrentData(currRes);
      if (briefRes.success) setDailyBrief(briefRes.brief);
      if (evidRes.success) {
        setFunnelData(evidRes.funnel_stages || []);
        setObservationWindows(evidRes.observation_windows || []);
      }
      if (bottleRes.success) setBottlenecks(bottleRes.bottlenecks || []);
      if (pattRes.success) setPatterns(pattRes.patterns || []);
      if (oppRes.success) setBacklog(oppRes.backlog_opportunities || []);
    } catch (err) {
      console.error("Failed to load strategy data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleRunEvaluation = async () => {
    try {
      setEvaluating(true);
      const res = await fetch("/api/strategy/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Manual operator trigger from Strategy Control Center" }),
      });
      const data = await res.json();
      if (data.success) {
        await loadAllData();
      }
    } catch (err) {
      console.error("Evaluation failed:", err);
    } finally {
      setEvaluating(false);
    }
  };

  const primaryProduct = currentData?.focus?.primary_product;
  const primaryStrategy = currentData?.primary_strategy;
  const actions = currentData?.actions || [];
  const primaryBottleneck = bottlenecks.find((b) => b.is_primary) || bottlenecks[0];
  const activeWindow = observationWindows.find((w) => w.window_status === "IN_PROGRESS" || w.window_status === "TIMING_UNKNOWN");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-8 space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                Strategy Governor & Decision Control
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                  Zero Spend ₹0
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Evidence-backed strategic direction, single primary focus governance, and deterministic execution
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAllData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Sync
          </button>
          <button
            onClick={handleRunEvaluation}
            disabled={evaluating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            <Sparkles className={`h-3.5 w-3.5 ${evaluating ? "animate-spin" : ""}`} />
            {evaluating ? "Evaluating Evidence..." : "Run Strategic Evaluation"}
          </button>
        </div>
      </div>

      {/* Primary Status Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="text-xs text-slate-400 font-medium">Single Primary Focus</div>
          <div className="mt-2 text-base font-semibold text-white truncate">
            {primaryProduct ? primaryProduct.name : "Evaluating Portfolio"}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
            <Lock className="h-3 w-3 text-blue-400" />
            <span>Focus locked; backlog preserved</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="text-xs text-slate-400 font-medium">Strategic Status</div>
          <div className="mt-2 text-base font-semibold text-white flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                currentData?.state?.status === "ACTIVE"
                  ? "bg-emerald-400"
                  : currentData?.state?.status === "WAITING_FOR_DATA"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-blue-400"
              }`}
            />
            {currentData?.state?.status || "INITIALIZING"}
          </div>
          <div className="mt-1 text-xs text-slate-400 truncate">
            Horizon: {currentData?.state?.focus_horizon || "TODAY"}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="text-xs text-slate-400 font-medium">Primary Objective</div>
          <div className="mt-2 text-base font-semibold text-white truncate">
            {currentData?.focus?.primary_business_objective || "ACHIEVE_FIRST_RETAINED_CUSTOMER"}
          </div>
          <div className="mt-1 text-xs text-emerald-400 flex items-center gap-1 font-medium">
            <ShieldCheck className="h-3 w-3" />
            <span>Verified ₹0 software cost</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="text-xs text-slate-400 font-medium">Backlog Opportunities</div>
          <div className="mt-2 text-2xl font-bold text-white">
            {backlog.length}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Isolated to avoid context switching
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-medium">
        {[
          { id: "overview", label: "Strategic Overview", icon: Target },
          { id: "funnel", label: "9-Stage Business Funnel", icon: TrendingUp },
          { id: "bottlenecks", label: "Structural Bottlenecks", icon: AlertTriangle },
          { id: "patterns", label: "Discovered Patterns", icon: Layers },
          { id: "brief", label: "Daily Strategic Brief", icon: FileText },
          { id: "backlog", label: `Opportunity Backlog (${backlog.length})`, icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition whitespace-nowrap ${
                isSelected
                  ? "bg-blue-600 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column: Primary Strategy & Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Strategy Card */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider uppercase text-blue-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  The One Primary Strategy
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                    {primaryStrategy?.strategy_type || "CONTINUE"}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    Confidence: {primaryStrategy?.confidence || "HIGH"}
                  </span>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-white">
                  {primaryStrategy?.objective || "Maintain Baseline Operating Cadence"}
                </h2>
                <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
                  {primaryStrategy?.proposed_action || "Continue structured organic distribution loops and observe conversion signals."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-400 border-t border-slate-800/80">
                <div>
                  <span className="font-semibold text-slate-300">Expected Outcome:</span>{" "}
                  {primaryStrategy?.expected_outcome || "Accumulate sufficient sample volume."}
                </div>
                <div>
                  <span className="font-semibold text-slate-300">Evidence Provenance:</span>{" "}
                  <span className="text-blue-400">{primaryStrategy?.evidence_provenance || "OBSERVED"}</span>
                </div>
              </div>
            </div>

            {/* Waiting for Data Card if applicable */}
            {activeWindow && (
              <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between text-amber-400">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <Clock className="h-4 w-4 animate-pulse" />
                    First-Class Waiting Strategy Active
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                    Status: {activeWindow.window_status}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Waiting is an active, deliberate decision to prevent premature interventions. ABOS is waiting to accumulate{" "}
                  <strong className="text-white">{activeWindow.min_sample_size_required} samples</strong> (currently collected:{" "}
                  <strong className="text-amber-400">{activeWindow.actual_sample_size_collected}</strong>).
                </p>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>Target Review:</span>
                  <span className="text-slate-200 font-mono">
                    {activeWindow.target_review_date ? new Date(activeWindow.target_review_date).toLocaleDateString() : "7 days"}
                  </span>
                </div>
              </div>
            )}

            {/* Prioritized Actions List */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Prioritized Execution Actions
                </h3>
                <span className="text-xs text-slate-400">Max 5 actions • Zero Spend Checked</span>
              </div>

              <div className="space-y-2.5">
                {actions.length === 0 ? (
                  <div className="text-xs text-slate-500 py-4 text-center">
                    No active actions registered. Click &quot;Run Strategic Evaluation&quot; to synthesize steps.
                  </div>
                ) : (
                  actions.map((act: any, idx: number) => (
                    <div
                      key={act.id || idx}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-full bg-slate-800 text-[11px] font-bold flex items-center justify-center text-slate-300">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-semibold text-white">{act.action_name}</span>
                        </div>
                        <p className="text-xs text-slate-400 pl-7">{act.description}</p>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                            act.execution_type === "AUTOMATIC"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : act.execution_type === "WAITING"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          }`}
                        >
                          {act.execution_type}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400">
                          ₹{act.estimated_cost_inr || 0}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Bottleneck & Brief Summary */}
          <div className="space-y-6">
            {/* Primary Structural Bottleneck Card */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Primary Structural Bottleneck
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300">
                  {primaryBottleneck?.severity || "MEDIUM"}
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-white capitalize">
                  {primaryBottleneck?.bottleneck_type ? `${primaryBottleneck.bottleneck_type.replace(/_/g, " ")} constraint` : "None detected"}
                </h4>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  {primaryBottleneck?.description || "Funnel telemetry operates within healthy baseline parameters."}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5">
                <div className="text-slate-400">Recommended Resolution:</div>
                <div className="text-slate-200 font-medium">
                  {primaryBottleneck?.recommended_focus || "Expand organic distribution reach"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
                <div>
                  Magnitude: <strong className="text-white">{primaryBottleneck?.magnitude_score || 0}/100</strong>
                </div>
                <div>
                  Reversibility: <strong className="text-emerald-400">{primaryBottleneck?.reversibility || "HIGH"}</strong>
                </div>
              </div>
            </div>

            {/* Today's Priority from Brief */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-blue-400" />
                  Daily Strategic Brief Snapshot
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">
                  {dailyBrief?.brief_date || "Today"}
                </span>
              </div>

              <div>
                <div className="text-xs text-slate-400 font-medium">Today&apos;s Single Focus:</div>
                <p className="text-sm font-semibold text-white mt-1">
                  {dailyBrief?.today_priority || "Maintain controlled distribution and observe conversion evidence."}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                <div className="text-slate-400">What The Data Actually Says:</div>
                <p className="text-slate-300 text-xs leading-relaxed italic">
                  &quot;{dailyBrief?.what_data_says || "Data remains consistent with baseline traffic."}&quot;
                </p>
              </div>

              <button
                onClick={() => setActiveTab("brief")}
                className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-xs font-medium text-slate-200 transition flex items-center justify-center gap-1.5"
              >
                <span>Read Full Brief</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 9-STAGE FUNNEL */}
      {activeTab === "funnel" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">9-Stage Business Funnel</h3>
              <p className="text-xs text-slate-400 mt-1">
                Stages with fewer than 10 events are strictly guarded with <span className="text-amber-400 font-mono">INSUFFICIENT_DATA</span> to prevent hallucinated conclusions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-9 gap-3">
              {funnelData.map((stage: any, idx: number) => {
                const isInsufficient = stage.sample_size_status === "INSUFFICIENT_DATA";
                const isBottleneck = stage.bottleneck_candidate;
                return (
                  <div
                    key={stage.stage_name || idx}
                    className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
                      isBottleneck
                        ? "bg-red-950/20 border-red-500/40"
                        : "bg-slate-950/60 border-slate-800"
                    }`}
                  >
                    <div>
                      <div className="text-[10px] font-mono text-slate-500">#{stage.stage_order}</div>
                      <div className="text-xs font-bold text-white mt-0.5 truncate">{stage.stage_name}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-white">{stage.raw_count}</div>
                      <div className="text-[11px] text-slate-400">
                        {stage.conversion_rate_to_next !== null ? (
                          <span className="font-semibold text-blue-400">
                            {stage.conversion_rate_to_next}% next
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                          isInsufficient
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {stage.sample_size_status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: BOTTLENECKS */}
      {activeTab === "bottlenecks" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">Structural Bottlenecks Evaluation</h3>
              <p className="text-xs text-slate-400 mt-1">
                Deterministic ranking across 18 candidate categories based on magnitude, business impact, and reversibility.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bottlenecks.map((b: any) => (
                <div
                  key={b.id}
                  className={`p-5 rounded-xl border space-y-3 ${
                    b.is_primary
                      ? "bg-amber-950/20 border-amber-500/40 shadow-lg"
                      : "bg-slate-950/60 border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      {b.is_primary && <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                      {b.bottleneck_type}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                        b.severity === "CRITICAL"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : b.severity === "HIGH"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}
                    >
                      {b.severity}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{b.description}</p>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                    <span className="text-slate-500">Action:</span> {b.recommended_focus || "Standard tuning"}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                    <div>Impact: <strong className="text-white">{b.business_impact_score}</strong></div>
                    <div>Reversibility: <strong className="text-emerald-400">{b.reversibility}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PATTERNS */}
      {activeTab === "patterns" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">Empirical Patterns with Strict Causality Discipline</h3>
              <p className="text-xs text-slate-400 mt-1">
                ABOS adheres to rigorous statistical honesty: correlation is NEVER labeled as causation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patterns.map((p: any) => (
                <div key={p.id} className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">{p.pattern_name}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {p.causality_type}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{p.description}</p>

                  {p.limitations && (
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-amber-300/90 flex items-start gap-2">
                      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{p.limitations}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                    <div>Sample size: <strong className="text-white">{p.sample_size}</strong></div>
                    <div>Confidence: <strong className="text-emerald-400">{p.confidence}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: BRIEF */}
      {activeTab === "brief" && dailyBrief && (
        <div className="space-y-6">
          <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6 max-w-4xl mx-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-blue-400">
                  Autonomous Business Operating System
                </span>
                <h2 className="text-2xl font-bold text-white mt-1">Daily Strategic Brief</h2>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
                {dailyBrief.brief_date}
              </span>
            </div>

            <div className="space-y-6 text-sm text-slate-300">
              {/* 1. Current State */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">1. Current State of the Business</h4>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">Active Product:</span>
                    <div className="font-semibold text-white mt-0.5">{dailyBrief.current_business_state?.primary_product || "N/A"}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Status:</span>
                    <div className="font-semibold text-emerald-400 mt-0.5">{dailyBrief.current_business_state?.status || "ACTIVE"}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Visitors:</span>
                    <div className="font-semibold text-white mt-0.5">{dailyBrief.current_business_state?.total_visitors || 0}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Revenue / Spend:</span>
                    <div className="font-semibold text-emerald-400 mt-0.5">₹{dailyBrief.current_business_state?.revenue_inr || 0} / ₹0</div>
                  </div>
                </div>
              </div>

              {/* 2. What Changed */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">2. What Changed Since Last Assessment</h4>
                <p className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs leading-relaxed">
                  {dailyBrief.what_changed}
                </p>
              </div>

              {/* 3. What Data Says vs Does Not Say */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">3. What the Data Actually Says (and DOES NOT Say)</h4>
                <p className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs leading-relaxed">
                  {dailyBrief.what_data_says}
                </p>
              </div>

              {/* 4. What We Know vs Don't Know */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <h5 className="text-xs font-bold text-emerald-400">What We Know (Verified Facts)</h5>
                  <ul className="space-y-1 text-xs text-slate-300 list-disc pl-4">
                    {dailyBrief.what_we_know?.map((k: string, i: number) => (
                      <li key={i}>{k}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <h5 className="text-xs font-bold text-amber-400">What We DO NOT Know (Honest Unknowns)</h5>
                  <ul className="space-y-1 text-xs text-slate-300 list-disc pl-4">
                    {dailyBrief.what_we_do_not_know?.map((k: string, i: number) => (
                      <li key={i}>{k}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 5. Invalidation Triggers */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">What Would Invalidate / Change This Strategy</h4>
                <p className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs leading-relaxed text-slate-300">
                  {dailyBrief.what_would_change_strategy}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: BACKLOG */}
      {activeTab === "backlog" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Opportunity Backlog & Focus Isolation</h3>
                <p className="text-xs text-slate-400 mt-1">
                  New research discoveries enter this backlog to strictly protect the active product from context switching.
                </p>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
                Primary Product Protected
              </span>
            </div>

            <div className="space-y-2.5">
              {backlog.length === 0 ? (
                <div className="text-xs text-slate-500 py-8 text-center">
                  No pending opportunities in backlog. Continuous research loops will queue new candidates here.
                </div>
              ) : (
                backlog.map((opp: any) => (
                  <div
                    key={opp.id}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-white">{opp.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-1">{opp.problem || "No problem statement recorded"}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        Score: {opp.overall_score || "N/A"}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Held in Backlog
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
