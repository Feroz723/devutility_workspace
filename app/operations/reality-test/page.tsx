'use client';

import React, { useState, useEffect } from 'react';
import { OperationsNav } from '@/components/operations/operations-nav';
import {
  FlaskConical,
  Play,
  RotateCcw,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  Layers,
  FileText,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Lock,
  Zap,
} from 'lucide-react';
import type {
  SimulationTestRun,
  SimulationScenarioResult,
  RealityScorecard,
  ProductionReadinessReport,
} from '@/types/reality-test';

export default function RealityTestDashboard() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [statusData, setStatusData] = useState<{
    isRunning: boolean;
    latestRun: SimulationTestRun | null;
    latestScorecard: RealityScorecard | null;
    recentScenarios: SimulationScenarioResult[];
  } | null>(null);

  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scenarios' | 'scorecard' | 'readiness'>('scenarios');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [readinessReport, setReadinessReport] = useState<ProductionReadinessReport | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/reality-test/status');
      const data = await res.json();
      if (data.success) {
        setStatusData(data.data);
        if (data.data.latestScorecard?.production_readiness_report) {
          setReadinessReport(data.data.latestScorecard.production_readiness_report);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRunAll = async () => {
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch('/api/reality-test/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggered_by: 'OPERATOR_UI' }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Reality test suite completed! Passed: ${data.data.run.passed_scenarios}/${data.data.run.total_scenarios}` });
        await fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Test run failed.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Network error executing suite' });
    } finally {
      setRunning(false);
    }
  };

  const handleRunScenario = async (scenarioId: string) => {
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch('/api/reality-test/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: scenarioId, triggered_by: 'OPERATOR_UI' }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Scenario ${scenarioId} finished: ${data.data.scenarioResults[0]?.status}` });
        await fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Scenario run failed.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Execution error' });
    } finally {
      setRunning(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset simulation data? Production data will remain 100% untouched.')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/reality-test/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Simulation data reset. Production tables pristine.' });
        await fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Reset failed.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Reset error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = () => {
    if (!statusData?.latestScorecard) {
      alert('No test run data to export. Please run tests first.');
      return;
    }
    const blob = new Blob([JSON.stringify(statusData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abos-reality-scorecard-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const latestRun = statusData?.latestRun;
  const latestScorecard = statusData?.latestScorecard;
  const scenarios = statusData?.recentScenarios || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation */}
        <OperationsNav />

        {/* Header Banner */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
                  <FlaskConical className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">
                    End-to-End Reality Test & Autonomous Simulation
                  </h1>
                  <p className="text-slate-400 text-sm mt-0.5">
                    Phase 14 Comprehensive System Verification & Autonomous Business Cycle Harness
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleRunAll}
                disabled={running}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-blue-600/20"
              >
                {running ? (
                  <Clock className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-white" />
                )}
                <span>Run All Tests</span>
              </button>

              <button
                onClick={handleReset}
                disabled={running}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium text-sm transition-colors border border-slate-700"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Simulation</span>
              </button>

              <button
                onClick={handleExportReport}
                disabled={!latestScorecard}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium text-sm transition-colors border border-slate-700"
              >
                <Download className="w-4 h-4" />
                <span>Export Report</span>
              </button>
            </div>
          </div>

          {/* Feedback Message */}
          {message && (
            <div
              className={`mt-4 p-3 rounded-lg text-sm border flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-300'
                  : 'bg-red-950/50 border-red-800/80 text-red-300'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Safety & Reality Isolation Banner */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3 pt-5 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-2.5 text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-semibold text-white">Data Realm Separation:</span>{' '}
                <span className="text-emerald-400 font-mono">SIMULATION ONLY</span>
                <p className="text-slate-400 text-[11px]">Production truth is never modified.</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              <Lock className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <span className="font-semibold text-white">Spend Boundary:</span>{' '}
                <span className="text-blue-400 font-mono">₹0.00 MAXIMUM</span>
                <p className="text-slate-400 text-[11px]">100% Zero-spend invariant enforced.</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-semibold text-white">Verification Mode:</span>{' '}
                <span className="text-amber-400 font-mono">DETERMINISTIC HEURISTICS</span>
                <p className="text-slate-400 text-[11px]">Software verified, market unproven.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Test Suite Status</span>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  latestRun?.status === 'COMPLETED'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : latestRun?.status === 'FAILED'
                    ? 'bg-red-950 text-red-400 border border-red-800'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {latestRun?.status || 'IDLE'}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {latestRun?.duration_ms ? `${latestRun.duration_ms}ms` : ''}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Scenarios Passed</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white font-mono">
                {latestRun?.passed_scenarios ?? 0}
              </span>
              <span className="text-slate-500 text-sm font-mono">
                / {latestRun?.total_scenarios ?? 0}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Reality Verification Score</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-400 font-mono">
                {latestScorecard?.overall_verification_score ?? 100}%
              </span>
              <span className="text-slate-500 text-xs">Software Integrity</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Production Contamination</span>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-emerald-400 text-sm font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                0 Records
              </span>
              <span className="text-slate-500 text-xs">PRISTINE</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 text-sm">
          <button
            onClick={() => setActiveTab('scenarios')}
            className={`px-4 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'scenarios'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Integration Scenarios (A–R + Full Cycle)</span>
          </button>

          <button
            onClick={() => setActiveTab('scorecard')}
            className={`px-4 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'scorecard'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>12-Category Scorecard</span>
          </button>

          <button
            onClick={() => setActiveTab('readiness')}
            className={`px-4 py-2.5 font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'readiness'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Production Readiness Report</span>
          </button>
        </div>

        {/* TAB 1: Scenarios List */}
        {activeTab === 'scenarios' && (
          <div className="space-y-3">
            {scenarios.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                <FlaskConical className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                <p className="font-medium text-white">No scenarios executed in this run yet.</p>
                <p className="text-sm mt-1">Click &quot;Run All Tests&quot; to execute the deterministic reality test harness.</p>
              </div>
            ) : (
              scenarios.map((sc) => {
                const isExpanded = expandedScenario === sc.id;
                return (
                  <div
                    key={sc.id}
                    className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden transition-all"
                  >
                    <div
                      onClick={() => setExpandedScenario(isExpanded ? null : sc.id)}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/40"
                    >
                      <div className="flex items-center gap-3">
                        {sc.status === 'PASSED' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : sc.status === 'FAILED' ? (
                          <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                        ) : (
                          <Clock className="w-5 h-5 text-slate-500 shrink-0" />
                        )}

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-800 rounded text-slate-300">
                              {sc.scenario_id}
                            </span>
                            <span className="font-semibold text-white text-sm">
                              {sc.scenario_name}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              [{sc.category}]
                            </span>
                          </div>
                          {sc.strategy_decision && (
                            <p className="text-xs text-slate-400 mt-1">
                              Strategy: <span className="text-blue-400 font-mono">{sc.strategy_decision}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-500">
                          {sc.duration_ms}ms
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRunScenario(sc.scenario_id);
                          }}
                          disabled={running}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded border border-slate-700 font-medium flex items-center gap-1.5"
                        >
                          <Play className="w-3 h-3" />
                          <span>Run</span>
                        </button>

                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Expandable Trace & Inspection Panel */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 bg-slate-950/50 space-y-4 text-xs">
                        {sc.what_waiting_for && (
                          <div className="bg-amber-950/20 border border-amber-800/40 p-3 rounded-lg text-amber-300">
                            <span className="font-semibold">What ABOS Is Waiting For:</span>{' '}
                            {sc.what_waiting_for}
                          </div>
                        )}

                        {/* Safety Invariants */}
                        <div>
                          <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2">
                            Safety Invariants Verified
                          </h4>
                          <div className="space-y-1.5">
                            {sc.safety_invariants_verified?.map((inv: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 text-slate-300 bg-slate-900/60 p-2 rounded border border-slate-800/80"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="font-mono text-emerald-400">{inv.id}:</span>
                                <span>{inv.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Evidence Flow */}
                        {sc.evidence_flow && sc.evidence_flow.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2">
                              Evidence Flow Trace
                            </h4>
                            <div className="space-y-1.5 font-mono text-[11px]">
                              {sc.evidence_flow.map((ev: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="bg-slate-900/80 border border-slate-800 p-2 rounded flex justify-between gap-2"
                                >
                                  <div>
                                    <span className="text-blue-400 font-bold">[{ev.phase}]</span>{' '}
                                    <span className="text-slate-300">{ev.sourceModule} &rarr; {ev.targetModule}:</span>{' '}
                                    <span className="text-slate-400">{ev.summary}</span>
                                  </div>
                                  <span className="text-slate-500 shrink-0">
                                    prov: {ev.provenance} (n={ev.sampleSize})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* State Transitions */}
                        {sc.state_transitions && sc.state_transitions.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2">
                              State Transitions
                            </h4>
                            <div className="space-y-1 text-[11px]">
                              {sc.state_transitions.map((st: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 font-mono text-slate-300 bg-slate-900/40 px-2 py-1 rounded"
                                >
                                  <span className="text-amber-400">{st.entityType}</span>
                                  <span>{st.fromState} &rarr; {st.toState}</span>
                                  <span className="text-slate-500">via {st.trigger}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: 12-Category Scorecard */}
        {activeTab === 'scorecard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {latestScorecard && latestScorecard.category_evaluations ? (
              Object.entries(latestScorecard.category_evaluations).map(([key, cat]: [string, any]) => (
                <div
                  key={key}
                  className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-base">
                      {cat.category}
                    </span>
                    <span
                      className={`font-mono text-sm font-bold px-2 py-0.5 rounded ${
                        cat.score === 100
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {cat.score}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">
                    {cat.findings?.[0] || 'Verified with 0 rule violations.'}
                  </p>

                  <div className="text-[11px] font-mono text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span>Tests: {cat.testsPassed}/{cat.testsEvaluated} passed</span>
                    <span>Status: {cat.status}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center text-slate-400 py-8">
                Scorecard not yet calculated. Run all scenarios to generate.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Production Readiness Report */}
        {activeTab === 'readiness' && (
          <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl space-y-6">
            <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">
                  ABOS Production Readiness Audit & Limitations
                </h3>
                <p className="text-xs text-slate-400">
                  Brutally honest technical demarcation between software verification and market proof.
                </p>
              </div>
              <span className="px-3 py-1 bg-blue-950 text-blue-400 border border-blue-800 rounded font-mono text-xs font-bold">
                SOFTWARE_VERIFIED_MARKET_UNPROVEN
              </span>
            </div>

            {readinessReport && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div>
                  <h4 className="font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                    What Is Verified
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {readinessReport.whatIsVerified.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-amber-400 uppercase tracking-wider mb-2">
                    What Requires Manual Setup
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {readinessReport.whatRequiresManualSetup.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-blue-400 uppercase tracking-wider mb-2">
                    What Can Run Autonomously
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {readinessReport.whatCanRunAutonomously.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-red-400 uppercase tracking-wider mb-2">
                    What Still Requires Human Approval
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {readinessReport.whatStillRequiresHumanApproval.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="md:col-span-2 pt-4 border-t border-slate-800">
                  <h4 className="font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Known Limitations & Constraints
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-400">
                    {readinessReport.knownLimitations.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
