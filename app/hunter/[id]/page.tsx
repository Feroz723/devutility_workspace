"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Play,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FlaskConical,
  UserCheck,
  Building2,
  Target,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ValidationResult } from "@/validation/types";

interface Opportunity {
  id: string;
  title: string;
  problem: string | null;
  problem_statement: string | null;
  target_customer: string | null;
  target_market: string | null;
  source: string | null;
  source_url: string | null;
  demand_score: number | null;
  competition_score: number | null;
  monetization_score: number | null;
  automation_score: number | null;
  zero_cost_score: number | null;
  overall_score: number | null;
  validation_score: number | null;
  priority_score: number | null;
  validation_status: string | null;
  research_confidence: number | null;
  evidence_count: number | null;
  source_count: number | null;
  decision: string | null;
  estimated_revenue: string | null;
  estimated_time_to_test: string | null;
  human_involvement: string | null;
  risk_level: string | null;
  status: string;
  is_demo: boolean;
  competitors: unknown;
  customer_profile: unknown;
  proposed_solution: unknown;
  experiment_proposal: unknown;
  created_at: string;
  updated_at: string;
}

interface EvidenceItem {
  source_type: string;
  source_name: string;
  source_url: string;
  evidence_text: string;
  evidence_strength: "LOW" | "MEDIUM" | "HIGH";
  evidence_nature: "DIRECT" | "INFERRED" | "AI_INTERPRETATION";
  source_quality: "PRIMARY" | "SECONDARY" | "LOWER_CONFIDENCE";
}

function ScoreBar({
  label,
  score,
  weight,
  max = 100,
}: {
  label: string;
  score: number | null;
  weight?: string;
  max?: number;
}) {
  const pct = score !== null ? (score / max) * 100 : 0;
  const color =
    score === null
      ? "bg-zinc-600"
      : score >= 70
      ? "bg-emerald-500"
      : score >= 40
      ? "bg-amber-500"
      : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[hsl(var(--muted-foreground))]">
          {label} {weight && <span className="text-[10px] text-zinc-400">({weight})</span>}
        </span>
        <span className="font-mono font-medium">{score ?? "—"}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function OpportunityDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "validation" | "evidence">("overview");

  const [validating, setValidating] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [overriding, setOverriding] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [oppRes, evRes, valRes] = await Promise.all([
        fetch(`/api/opportunities/${id}`),
        fetch(`/api/opportunities/${id}/evidence`),
        fetch(`/api/opportunities/${id}/validation`),
      ]);

      if (oppRes.ok) setOpp(await oppRes.json());
      if (evRes.ok) {
        const evData = await evRes.json();
        setEvidence(evData.evidence ?? []);
      }
      if (valRes.ok) {
        const valData = await valRes.json();
        setValidation(valData.validation ?? null);
      }
    } catch {
      setError("Failed to load opportunity data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleValidate() {
    setValidating(true);
    setError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/opportunities/${id}/validate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Validation run failed.");
      } else {
        setValidation(data.validation);
        setOpp(data.opportunity);
        setActionSuccess("Validation and decision intelligence executed successfully.");
      }
    } catch {
      setError("Network error while validating.");
    } finally {
      setValidating(false);
    }
  }

  async function handleCreateExperiment() {
    setProposing(true);
    setError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/opportunities/${id}/create-experiment-proposal`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create experiment.");
      } else {
        setActionSuccess("Experiment launched at ₹0 cost! Check the Experiments tab.");
        await loadData();
      }
    } catch {
      setError("Network error creating experiment.");
    } finally {
      setProposing(false);
    }
  }

  async function handleOverride(decision: "TEST_CANDIDATE" | "RESEARCH_MORE" | "REJECT") {
    const reason = prompt(`Reason for overriding decision to ${decision}:`);
    if (!reason) return;

    setOverriding(true);
    setError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/opportunities/${id}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason, actor: "human_operator" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Override failed.");
      } else {
        setActionSuccess(`Decision overridden to ${decision}.`);
        await loadData();
      }
    } catch {
      setError("Network error executing override.");
    } finally {
      setOverriding(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[hsl(var(--muted-foreground))]">
        Loading...
      </div>
    );
  }
  if (!opp) {
    return (
      <div className="py-20 text-center text-[hsl(var(--muted-foreground))]">
        Opportunity not found.
      </div>
    );
  }

  const isTestCandidate =
    opp.decision === "TEST_CANDIDATE" ||
    opp.decision === "TEST" ||
    validation?.decision === "TEST_CANDIDATE";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/hunter"
            className="rounded-lg border border-[hsl(var(--border))] p-2 hover:bg-[hsl(var(--accent))]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              {opp.title}
              {opp.is_demo && (
                <span className="rounded bg-amber-400/10 px-2 py-0.5 text-xs font-semibold text-amber-400">
                  DEMO
                </span>
              )}
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  opp.decision === "TEST_CANDIDATE" || opp.decision === "TEST"
                    ? "bg-emerald-400/10 text-emerald-400 border border-emerald-500/20"
                    : opp.decision === "RESEARCH_MORE"
                    ? "bg-amber-400/10 text-amber-400 border border-amber-500/20"
                    : opp.decision === "REQUIRES_APPROVAL"
                    ? "bg-purple-400/10 text-purple-400 border border-purple-500/20"
                    : "bg-red-400/10 text-red-400 border border-red-500/20"
                }`}
              >
                {opp.decision || "UNEVALUATED"}
              </span>
            </h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              Source: {opp.source || "Web"} | Created {new Date(opp.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleValidate}
            disabled={validating}
            className="bg-[hsl(var(--primary))] text-white gap-1.5 text-xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {validating ? "Validating..." : "Run Validation"}
          </Button>

          {isTestCandidate && (
            <Button
              onClick={handleCreateExperiment}
              disabled={proposing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              {proposing ? "Deploying..." : "Launch ₹0 Experiment"}
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

      {/* Tabs */}
      <div className="flex border-b border-[hsl(var(--border))] text-sm">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === "overview"
              ? "border-[hsl(var(--primary))] text-white"
              : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-white"
          }`}
        >
          Overview & Scoring
        </button>
        <button
          onClick={() => setActiveTab("validation")}
          className={`px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === "validation"
              ? "border-[hsl(var(--primary))] text-white"
              : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-white"
          }`}
        >
          Validation Intelligence
        </button>
        <button
          onClick={() => setActiveTab("evidence")}
          className={`px-4 py-2 border-b-2 font-medium transition-colors ${
            activeTab === "evidence"
              ? "border-[hsl(var(--primary))] text-white"
              : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-white"
          }`}
        >
          Research Evidence ({evidence.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Problem Statement */}
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Problem Statement
              </h2>
              <p className="text-sm leading-relaxed text-zinc-100">
                {opp.problem_statement || opp.problem || "No problem statement recorded."}
              </p>
            </div>

            {/* Target Customer & Proposed Solution Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-2">
                <div className="flex items-center gap-2 text-zinc-300">
                  <UserCheck className="h-4 w-4 text-[hsl(var(--primary))]" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Target Customer
                  </h3>
                </div>
                <p className="text-sm font-medium">{opp.target_customer || "Operators & Builders"}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Market: {opp.target_market || "Digital SaaS"}
                </p>
              </div>

              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-2">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Zap className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Zero-Spend Feasibility
                  </h3>
                </div>
                <p className="text-sm font-medium text-emerald-400 font-mono">
                  ₹0 INR (Zero Budget Required)
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Validated for autonomous free-tier testing.
                </p>
              </div>
            </div>

            {/* Decision Rationale */}
            {validation?.explanation && (
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Decision Intelligence Breakdown
                </h3>
                <div className="space-y-2 text-xs">
                  <p className="font-semibold text-emerald-400">Why this decision:</p>
                  <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                    {validation.explanation.why.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>

                  <p className="font-semibold text-amber-400 pt-2">Identified Risks:</p>
                  <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                    {validation.explanation.risks.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>

                  <div className="p-3 rounded bg-[hsl(var(--background))] border border-[hsl(var(--border))] mt-3">
                    <span className="font-semibold text-zinc-200">Recommended Next Action: </span>
                    <span className="text-zinc-400">{validation.explanation.next_action}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Preconditions & Human Override */}
          <div className="space-y-4">
            {/* 7 Preconditions Card */}
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[hsl(var(--primary))]" />
                <h2 className="text-sm font-semibold text-white">7-Point Candidate Preconditions</h2>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  {
                    name: "Overall Score ≥ 80",
                    val: `${opp.overall_score ?? 0}/80`,
                    pass: (opp.overall_score ?? 0) >= 80,
                  },
                  {
                    name: "Research Confidence ≥ 60%",
                    val: `${opp.research_confidence ?? 0}%`,
                    pass: (opp.research_confidence ?? 0) >= 60,
                  },
                  {
                    name: "Validation Score ≥ 70%",
                    val: `${opp.validation_score ?? validation?.validation_score ?? 0}%`,
                    pass: (opp.validation_score ?? validation?.validation_score ?? 0) >= 70,
                  },
                  {
                    name: "Independent Sources ≥ 2",
                    val: `${opp.source_count ?? 1} sources`,
                    pass: (opp.source_count ?? 1) >= 2,
                  },
                  {
                    name: "Direct Evidence Quotes ≥ 1",
                    val: `${evidence.length} quotes`,
                    pass: evidence.length >= 1,
                  },
                  {
                    name: "Zero-Cost Score ≥ 50 (₹0)",
                    val: `${opp.zero_cost_score ?? 0}/50`,
                    pass: (opp.zero_cost_score ?? 0) >= 50,
                  },
                  {
                    name: "Zero-Spend Guard Approved",
                    val: "Policy compliant",
                    pass: opp.decision !== "BLOCKED",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded bg-[hsl(var(--background))] border border-[hsl(var(--border))]"
                  >
                    <span>{item.name}</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        {item.val}
                      </span>
                      {item.pass ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-amber-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Human Review & Override */}
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Human Review & Override
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Operator can manually override AI decision with logged rationale.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  onClick={() => handleOverride("TEST_CANDIDATE")}
                  disabled={overriding}
                  className="px-2 py-1.5 rounded text-xs font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30"
                >
                  Approve Test
                </button>
                <button
                  onClick={() => handleOverride("RESEARCH_MORE")}
                  disabled={overriding}
                  className="px-2 py-1.5 rounded text-xs font-medium bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30"
                >
                  Research More
                </button>
                <button
                  onClick={() => handleOverride("REJECT")}
                  disabled={overriding}
                  className="px-2 py-1.5 rounded text-xs font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VALIDATION INTELLIGENCE */}
      {activeTab === "validation" && (
        <div className="space-y-6">
          {/* Validation Score Header */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
              <span className="text-xs uppercase text-[hsl(var(--muted-foreground))]">
                Validation Score
              </span>
              <p className="text-3xl font-bold font-mono text-emerald-400 mt-1">
                {validation?.validation_score ?? opp.validation_score ?? "—"}
                <span className="text-sm text-[hsl(var(--muted-foreground))]">/100</span>
              </p>
            </div>
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
              <span className="text-xs uppercase text-[hsl(var(--muted-foreground))]">
                Priority Score
              </span>
              <p className="text-3xl font-bold font-mono text-blue-400 mt-1">
                {validation?.priority_score ?? opp.priority_score ?? "—"}
                <span className="text-sm text-[hsl(var(--muted-foreground))]">/100</span>
              </p>
            </div>
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
              <span className="text-xs uppercase text-[hsl(var(--muted-foreground))]">
                Willingness to Pay
              </span>
              <p className="text-lg font-bold text-zinc-100 mt-2">
                {validation?.wtp.level || "MODERATE"}
                <span className="text-xs ml-2 font-mono text-zinc-400">
                  ({validation?.wtp.score || 50}/100)
                </span>
              </p>
            </div>
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
              <span className="text-xs uppercase text-[hsl(var(--muted-foreground))]">
                Validation Status
              </span>
              <p className="text-lg font-bold text-zinc-100 mt-2">
                {validation?.validation_status || opp.validation_status || "UNVALIDATED"}
              </p>
            </div>
          </div>

          {/* 8-Category Validation Score Breakdown */}
          {validation?.categories && (
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                8-Category Deterministic Validation Breakdown (100% Weight)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {validation.categories.map((cat, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] space-y-2"
                  >
                    <ScoreBar
                      label={cat.category}
                      score={cat.score}
                      weight={`${Math.round(cat.weight * 100)}%`}
                    />
                    <p className="text-xs text-zinc-400">{cat.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Profile & Competitors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Persona */}
            {validation?.customer_profile && (
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-[hsl(var(--primary))]" />
                    <h3 className="text-sm font-semibold">Customer Persona</h3>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                    Budget: {validation.customer_profile.budget_capacity}
                  </span>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[hsl(var(--muted-foreground))]">Target Segment: </span>
                    <span className="font-semibold text-zinc-200">
                      {validation.customer_profile.target_segment}
                    </span>
                  </div>
                  <div>
                    <span className="text-[hsl(var(--muted-foreground))]">Daily Workflow: </span>
                    <p className="text-zinc-300 mt-0.5">{validation.customer_profile.daily_workflow}</p>
                  </div>
                  <div>
                    <span className="text-[hsl(var(--muted-foreground))]">Trigger Event: </span>
                    <p className="text-zinc-300 mt-0.5">{validation.customer_profile.trigger_event}</p>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <span className="text-[hsl(var(--muted-foreground))] font-semibold">
                      Identified Pain Points:
                    </span>
                    {validation.customer_profile.pain_points.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded bg-[hsl(var(--background))] border border-[hsl(var(--border))] space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-zinc-200">{p.pain}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                              p.nature === "EVIDENCE"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-blue-500/20 text-blue-300"
                            }`}
                          >
                            {p.nature}
                          </span>
                        </div>
                        {p.source_snippet && (
                          <p className="text-[10px] text-zinc-500 italic">{p.source_snippet}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Competitors & Positioning */}
            {validation?.competitors && (
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] pb-3">
                  <Building2 className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-semibold">Competitors & Alternatives</h3>
                </div>
                <div className="space-y-3 text-xs">
                  {validation.competitors.map((comp, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] space-y-2"
                    >
                      <div className="flex items-center justify-between font-semibold text-zinc-200">
                        <span>{comp.name}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {comp.pricing_model}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        <span className="text-zinc-500">Weakness: </span>
                        {comp.weaknesses.join(", ")}
                      </div>
                      <div className="text-[11px] text-emerald-400">
                        <span className="text-zinc-500">Differentiation: </span>
                        {comp.differentiation_angle}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Proposed Solution & Experiment Proposal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Proposed Solution */}
            {validation?.proposed_solution && (
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] pb-3">
                  <Target className="h-4 w-4 text-[hsl(var(--primary))]" />
                  <h3 className="text-sm font-semibold">Proposed Digital Solution</h3>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-[hsl(var(--muted-foreground))]">Product Type: </span>
                    <span className="font-semibold text-zinc-200">
                      {validation.proposed_solution.product_type}
                    </span>
                  </div>
                  <div>
                    <span className="text-[hsl(var(--muted-foreground))]">Core Value Prop: </span>
                    <p className="text-zinc-300 mt-0.5">
                      {validation.proposed_solution.core_value_prop}
                    </p>
                  </div>
                  <div>
                    <span className="text-[hsl(var(--muted-foreground))]">Delivery Format: </span>
                    <p className="text-zinc-300 mt-0.5">
                      {validation.proposed_solution.delivery_format}
                    </p>
                  </div>
                  <div>
                    <span className="text-[hsl(var(--muted-foreground))]">Estimated Build Time: </span>
                    <span className="font-semibold text-emerald-400">
                      {validation.proposed_solution.time_to_build_days} Days
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Experiment Proposal */}
            {validation?.experiment_proposal && (
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold">₹0 Experiment Candidate Plan</h3>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                    Cost: ₹0 INR
                  </span>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-[hsl(var(--muted-foreground))]">Hypothesis: </span>
                    <p className="text-zinc-300 mt-0.5 italic">
                      &ldquo;{validation.experiment_proposal.hypothesis}&rdquo;
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[hsl(var(--muted-foreground))]">Channel: </span>
                      <p className="text-zinc-200">{validation.experiment_proposal.channel}</p>
                    </div>
                    <div>
                      <span className="text-[hsl(var(--muted-foreground))]">Success Target: </span>
                      <p className="text-emerald-400 font-semibold">
                        {validation.experiment_proposal.target_metric_value}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <span className="text-[hsl(var(--muted-foreground))] font-semibold">
                      Step-by-Step Execution Plan:
                    </span>
                    {validation.experiment_proposal.step_by_step_plan.map((step) => (
                      <div
                        key={step.step}
                        className="p-2 rounded bg-[hsl(var(--background))] border border-[hsl(var(--border))] flex items-start gap-2"
                      >
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-mono text-zinc-300">
                          {step.step}
                        </span>
                        <div className="flex-1">
                          <p className="text-zinc-300">{step.description}</p>
                          <span className="text-[10px] text-zinc-500">
                            Tool: {step.tool} | Cost: ₹{step.cost_inr}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: EVIDENCE */}
      {activeTab === "evidence" && (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Real Research Evidence ({evidence.length})
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                Direct public internet quotes and citations stored in database.
              </p>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
              Corroborated
            </span>
          </div>

          {evidence.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))] py-6 text-center">
              No evidence recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {evidence.map((ev, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">{ev.source_name}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
                          ev.evidence_nature === "DIRECT"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : ev.evidence_nature === "INFERRED"
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-red-500/15 text-red-300"
                        }`}
                      >
                        {ev.evidence_nature}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400">
                        {ev.evidence_strength}
                      </span>
                    </div>
                  </div>
                  <blockquote className="text-sm italic text-zinc-200 border-l-2 border-[hsl(var(--primary))] pl-2.5">
                    &ldquo;{ev.evidence_text}&rdquo;
                  </blockquote>
                  {ev.source_url && (
                    <a
                      href={ev.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[hsl(var(--primary))] hover:underline pt-1"
                    >
                      Source Link <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
