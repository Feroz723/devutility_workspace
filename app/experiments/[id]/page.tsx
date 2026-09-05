"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  FlaskConical,
  ExternalLink,
  ShieldCheck,
  Plus,
  TrendingUp,
  Clock,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Experiment, ExperimentMetric } from "@/types/experiment";
import type { ExperimentAnalysisResult, CriteriaComparison, LearningData } from "@/experiments/types";

export default function ExperimentDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [exp, setExp] = useState<Experiment | null>(null);
  const [metrics, setMetrics] = useState<ExperimentMetric[]>([]);
  const [analysis, setAnalysis] = useState<ExperimentAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Manual metric form state
  const [showMetricForm, setShowMetricForm] = useState(false);
  const [metricName, setMetricName] = useState("signups");
  const [metricValue, setMetricValue] = useState("1");
  const [metricSource, setMetricSource] = useState("MANUAL");

  async function loadData() {
    try {
      const [expRes, metRes] = await Promise.all([
        fetch(`/api/experiments/${id}`),
        fetch(`/api/experiments/${id}/metrics`),
      ]);

      if (expRes.ok) setExp(await expRes.json());
      if (metRes.ok) {
        const d = await metRes.json();
        setMetrics(d.metrics || []);
      }
    } catch {
      setError("Failed to load experiment.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function executeAction(action: "start" | "pause" | "resume" | "complete" | "analyze" | "stop") {
    setActing(true);
    setError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/experiments/${id}/${action}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Action "${action}" failed.`);
      } else {
        setActionSuccess(data.message || `Action "${action}" succeeded.`);
        if (data.analysis) {
          setAnalysis(data.analysis);
        }
        await loadData();
      }
    } catch {
      setError(`Network error during action "${action}".`);
    } finally {
      setActing(false);
    }
  }

  async function handleBuildProduct() {
    setActing(true);
    setError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/products/from-experiment/${id}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate product from experiment.");
      } else {
        setActionSuccess("Product plan generated! Redirecting to Product Control Center...");
        const targetId = data.product?.id;
        if (targetId) {
          window.location.href = `/products/${targetId}`;
        }
      }
    } catch {
      setError("Network error creating product from experiment.");
    } finally {
      setActing(false);
    }
  }


  async function handleAddMetric(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/experiments/${id}/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metric_name: metricName,
          metric_value: parseFloat(metricValue),
          source: metricSource,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to record metric.");
      } else {
        setActionSuccess(`Recorded ${metricName} = ${metricValue} (${metricSource}).`);
        setShowMetricForm(false);
        await loadData();
      }
    } catch {
      setError("Network error adding metric.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[hsl(var(--muted-foreground))]">
        Loading experiment...
      </div>
    );
  }
  if (!exp) {
    return (
      <div className="py-20 text-center text-[hsl(var(--muted-foreground))]">
        Experiment not found.
      </div>
    );
  }

  const isRunning = exp.status === "RUNNING" || exp.status === "active";
  const isPaused = exp.status === "PAUSED" || exp.status === "paused";
  const isProposed = exp.status === "PROPOSED" || exp.status === "APPROVED" || exp.status === "READY" || exp.status === "SETUP";
  const isCompleted = exp.status === "COMPLETED" || exp.status === "completed";
  const isFinal = exp.status === "WINNER" || exp.status === "PROMISING" || exp.status === "ITERATE" || exp.status === "STOPPED" || exp.status === "FAILED";

  const learnings = (exp.learning_data || analysis?.learnings) as LearningData | null;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/experiments"
            className="rounded-lg border border-[hsl(var(--border))] p-2 hover:bg-[hsl(var(--accent))]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              {exp.title}
              {exp.is_demo && (
                <span className="rounded bg-amber-400/10 px-2 py-0.5 text-xs font-semibold text-amber-400">
                  DEMO
                </span>
              )}
              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                {exp.status}
              </span>
            </h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              Type: {exp.experiment_type || "LANDING_PAGE"} | Channel: {exp.channel || "Organic"} | Cost: ₹0 INR
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/experiments/${id}/preview`}
            className="px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-xs font-medium hover:bg-[hsl(var(--accent))] flex items-center gap-1.5 text-zinc-200"
          >
            <Eye className="h-3.5 w-3.5" />
            Landing Preview
          </Link>

          {isProposed && (
            <Button
              onClick={() => executeAction("start")}
              disabled={acting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs"
            >
              <Play className="h-3.5 w-3.5" />
              Start Experiment
            </Button>
          )}

          {isRunning && (
            <>
              <Button
                onClick={() => executeAction("pause")}
                disabled={acting}
                variant="outline"
                className="gap-1.5 text-xs"
              >
                <Pause className="h-3.5 w-3.5 text-amber-400" />
                Pause
              </Button>
              <Button
                onClick={() => executeAction("complete")}
                disabled={acting}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Complete
              </Button>
            </>
          )}

          {isPaused && (
            <Button
              onClick={() => executeAction("resume")}
              disabled={acting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs"
            >
              <Play className="h-3.5 w-3.5" />
              Resume
            </Button>
          )}

          {(isCompleted || isRunning) && (
            <Button
              onClick={() => executeAction("analyze")}
              disabled={acting}
              className="bg-[hsl(var(--primary))] text-white gap-1.5 text-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Analyze Result
            </Button>
          )}

          {(exp.result === "WINNER" || exp.result === "PROMISING" || exp.result === "WIN") && (
            <Button
              onClick={handleBuildProduct}
              disabled={acting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-semibold shadow"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Build Product (₹0)
            </Button>
          )}


          {!isFinal && exp.status !== "STOPPED" && (
            <Button
              onClick={() => executeAction("stop")}
              disabled={acting}
              variant="destructive"
              className="gap-1.5 text-xs"
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </Button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {actionSuccess}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Details & Metrics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hypothesis Card */}
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Experiment Hypothesis
            </h2>
            <p className="text-sm font-medium leading-relaxed text-zinc-100 italic">
              &ldquo;{exp.hypothesis}&rdquo;
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-2.5 rounded bg-[hsl(var(--background))] border border-[hsl(var(--border))]">
                <span className="text-[hsl(var(--muted-foreground))] block">Problem:</span>
                <span className="text-zinc-200 mt-0.5 block">{exp.problem || "Friction in manual workflow"}</span>
              </div>
              <div className="p-2.5 rounded bg-[hsl(var(--background))] border border-[hsl(var(--border))]">
                <span className="text-[hsl(var(--muted-foreground))] block">Proposed Solution:</span>
                <span className="text-zinc-200 mt-0.5 block">{exp.solution || "Lightweight digital tool"}</span>
              </div>
            </div>
          </div>

          {/* Success Criteria vs Target */}
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Measurable Success Targets
              </h2>
              <span className="text-xs font-mono text-emerald-400 font-semibold">
                Target: {exp.success_criteria || "15 signups in 7 days"}
              </span>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              The experiment declares success if conversion targets are achieved within the 7-day test window without paid advertising.
            </p>
          </div>

          {/* Live Metrics Table */}
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
              <div>
                <h2 className="text-sm font-semibold">Live Experiment Metrics ({metrics.length})</h2>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  Verifiable metrics collected manually or via public landing page events.
                </p>
              </div>
              <Button
                onClick={() => setShowMetricForm(!showMetricForm)}
                variant="outline"
                className="text-xs gap-1.5 h-8"
              >
                <Plus className="h-3.5 w-3.5" />
                Record Metric
              </Button>
            </div>

            {/* Inline Form */}
            {showMetricForm && (
              <form
                onSubmit={handleAddMetric}
                className="p-3.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] space-y-3"
              >
                <h3 className="text-xs font-semibold text-zinc-200">Record Real Measurement</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[hsl(var(--muted-foreground))] block mb-1">Metric Name</label>
                    <select
                      value={metricName}
                      onChange={(e) => setMetricName(e.target.value)}
                      className="w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="signups">signups</option>
                      <option value="views">views</option>
                      <option value="clicks">clicks</option>
                      <option value="downloads">downloads</option>
                      <option value="tool_usage">tool_usage</option>
                      <option value="replies">replies</option>
                      <option value="sales">sales</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[hsl(var(--muted-foreground))] block mb-1">Value</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={metricValue}
                      onChange={(e) => setMetricValue(e.target.value)}
                      className="w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[hsl(var(--muted-foreground))] block mb-1">Source</label>
                    <select
                      value={metricSource}
                      onChange={(e) => setMetricSource(e.target.value)}
                      className="w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="MANUAL">MANUAL</option>
                      <option value="WEBSITE">WEBSITE</option>
                      <option value="ANALYTICS">ANALYTICS</option>
                      <option value="API">API</option>
                      <option value="IMPORT">IMPORT</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    onClick={() => setShowMetricForm(false)}
                    variant="ghost"
                    className="text-xs h-7"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="text-xs h-7 bg-[hsl(var(--primary))] text-white">
                    Save Metric
                  </Button>
                </div>
              </form>
            )}

            {/* Metrics List */}
            {metrics.length === 0 ? (
              <p className="text-xs text-[hsl(var(--muted-foreground))] py-4 text-center">
                No metrics recorded yet. Launch the preview landing page or submit manual measurements above.
              </p>
            ) : (
              <div className="divide-y divide-[hsl(var(--border))]">
                {metrics.map((m) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-200">{m.metric_name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                        {m.source}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {m.metric_value}
                      </span>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        {new Date(m.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Results & Learnings */}
          {learnings && (
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Experiment Learnings & Next Action
                </h2>
                <span className="text-xs font-bold text-white px-2 py-0.5 rounded bg-[hsl(var(--primary))]">
                  {exp.result || analysis?.result || "ANALYZED"}
                </span>
              </div>
              <div className="space-y-2 text-xs text-zinc-300">
                <p>
                  <strong>Summary: </strong> {learnings.what_happened}
                </p>
                <div>
                  <strong className="text-emerald-400">What Worked:</strong>
                  <ul className="list-disc pl-5 mt-0.5 space-y-0.5 text-zinc-300">
                    {learnings.what_worked.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong className="text-amber-400">What Failed:</strong>
                  <ul className="list-disc pl-5 mt-0.5 space-y-0.5 text-zinc-300">
                    {learnings.what_failed.map((f, idx) => (
                      <li key={idx}>{f}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 rounded bg-[hsl(var(--background))] border border-[hsl(var(--border))] mt-2">
                  <strong className="text-white block">Recommended Next Action:</strong>
                  <p className="text-zinc-300 mt-1">{learnings.recommended_next_action}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Zero-Spend Status & Metadata */}
        <div className="space-y-4">
          {/* Zero-Spend Verification Card */}
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Zero-Spend Policy Guard</h2>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2 rounded bg-[hsl(var(--background))] border border-[hsl(var(--border))]">
                <span className="text-[hsl(var(--muted-foreground))]">Estimated Cost:</span>
                <span className="font-mono font-bold text-emerald-400">₹0 INR</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[hsl(var(--background))] border border-[hsl(var(--border))]">
                <span className="text-[hsl(var(--muted-foreground))]">Actual Cost Incurred:</span>
                <span className="font-mono font-bold text-emerald-400">₹0 INR</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[hsl(var(--background))] border border-[hsl(var(--border))]">
                <span className="text-[hsl(var(--muted-foreground))]">Cost Classification:</span>
                <span className="font-semibold text-zinc-200">FREE</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[hsl(var(--background))] border border-[hsl(var(--border))]">
                <span className="text-[hsl(var(--muted-foreground))]">Paid Dependencies:</span>
                <span className="text-emerald-400 font-semibold">None (0)</span>
              </div>
            </div>
          </div>

          {/* Timeline Card */}
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Execution Timeline
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Created:</span>
                <span className="text-zinc-200">{new Date(exp.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Start Date:</span>
                <span className="text-zinc-200">{exp.start_date || "Pending"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">End Date:</span>
                <span className="text-zinc-200">{exp.end_date || "Pending"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Current Stage:</span>
                <span className="font-semibold text-white">{exp.stage}</span>
              </div>
            </div>
          </div>

          {/* Parent Opportunity Link */}
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Originating Opportunity
            </h2>
            <Link
              href={`/hunter/${exp.opportunity_id}`}
              className="text-xs text-[hsl(var(--primary))] hover:underline flex items-center gap-1 font-medium"
            >
              View Research & Validation &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
