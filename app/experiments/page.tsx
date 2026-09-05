"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FlaskConical,
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  Search,
  ExternalLink,
  ShieldCheck,
  Zap,
  TrendingUp,
  XCircle,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Experiment {
  id: string;
  opportunity_id: string;
  title: string;
  experiment_type: string | null;
  hypothesis: string | null;
  target_customer: string | null;
  channel: string | null;
  success_criteria: string | null;
  estimated_cost_inr: number;
  actual_cost_inr: number;
  stage: string;
  status: string;
  result: string | null;
  decision: string | null;
  start_date: string | null;
  end_date: string | null;
  is_demo: boolean;
  created_at: string;
}

const statusColors: Record<string, string> = {
  PROPOSED: "text-purple-400 bg-purple-400/10 border-purple-500/20",
  APPROVED: "text-blue-400 bg-blue-400/10 border-blue-500/20",
  SETUP: "text-cyan-400 bg-cyan-400/10 border-cyan-500/20",
  READY: "text-indigo-400 bg-indigo-400/10 border-indigo-500/20",
  RUNNING: "text-emerald-400 bg-emerald-400/10 border-emerald-500/20 animate-pulse",
  active: "text-emerald-400 bg-emerald-400/10 border-emerald-500/20",
  PAUSED: "text-amber-400 bg-amber-400/10 border-amber-500/20",
  paused: "text-amber-400 bg-amber-400/10 border-amber-500/20",
  COMPLETED: "text-blue-400 bg-blue-400/10 border-blue-500/20",
  completed: "text-blue-400 bg-blue-400/10 border-blue-500/20",
  ANALYZING: "text-violet-400 bg-violet-400/10 border-violet-500/20 animate-pulse",
  WINNER: "text-emerald-400 bg-emerald-400/20 border-emerald-500/30 font-bold",
  PROMISING: "text-teal-400 bg-teal-400/15 border-teal-500/25",
  ITERATE: "text-amber-400 bg-amber-400/15 border-amber-500/25",
  STOPPED: "text-zinc-400 bg-zinc-800 border-zinc-700",
  stopped: "text-zinc-400 bg-zinc-800 border-zinc-700",
  FAILED: "text-red-400 bg-red-400/10 border-red-500/20",
  failed: "text-red-400 bg-red-400/10 border-red-500/20",
};

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  async function loadExperiments() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("experiment_type", typeFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/experiments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setExperiments(data.experiments || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExperiments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter]);

  const runningCount = experiments.filter(
    (e) => e.status === "RUNNING" || e.status === "active"
  ).length;
  const winnersCount = experiments.filter((e) => e.status === "WINNER").length;
  const promisingCount = experiments.filter((e) => e.status === "PROMISING").length;
  const proposedCount = experiments.filter((e) => e.status === "PROPOSED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-[hsl(var(--primary))]" />
            Autonomous ₹0 Experiments
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Controlled market tests executing under a strict ₹0 budget constraint.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Total Experiments
          </p>
          <p className="mt-2 text-2xl font-bold font-mono">{experiments.length}</p>
        </div>
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Running Tests
          </p>
          <p className="mt-2 text-2xl font-bold font-mono text-emerald-400">{runningCount}</p>
        </div>
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">
            Promising Signals
          </p>
          <p className="mt-2 text-2xl font-bold font-mono text-teal-400">{promisingCount}</p>
        </div>
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
            Winners Validated
          </p>
          <p className="mt-2 text-2xl font-bold font-mono text-emerald-300">{winnersCount}</p>
        </div>
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-400">
            Pending Proposals
          </p>
          <p className="mt-2 text-2xl font-bold font-mono text-purple-400">{proposedCount}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              placeholder="Search experiments by title or hypothesis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadExperiments()}
              className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
            />
          </div>
          <Button onClick={loadExperiments} variant="outline" className="text-xs h-8">
            Filter
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[hsl(var(--muted-foreground))]">Status:</span>
          {["", "PROPOSED", "RUNNING", "COMPLETED", "WINNER", "PROMISING", "ITERATE"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded border text-xs transition-colors ${
                statusFilter === st
                  ? "bg-[hsl(var(--primary))] text-white border-transparent font-medium"
                  : "bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-white"
              }`}
            >
              {st || "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Experiments List */}
      {loading ? (
        <div className="py-20 text-center text-sm text-[hsl(var(--muted-foreground))]">
          Loading experiments...
        </div>
      ) : experiments.length === 0 ? (
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-10 text-center space-y-3">
          <FlaskConical className="h-10 w-10 text-[hsl(var(--muted-foreground))] mx-auto opacity-50" />
          <p className="text-sm font-medium text-white">No experiments found.</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-md mx-auto">
            Opportunities with score &ge; 80 and validation score &ge; 70% can be promoted to an experiment from the Hunter or Validation pages.
          </p>
          <Link
            href="/validation"
            className="inline-flex items-center gap-1.5 text-xs text-[hsl(var(--primary))] hover:underline pt-2"
          >
            Go to Validation Review &rarr;
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {experiments.map((exp) => (
            <div
              key={exp.id}
              className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 hover:border-[hsl(var(--primary)_/_0.4)] transition-colors space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/experiments/${exp.id}`}
                      className="font-semibold text-sm text-white hover:underline"
                    >
                      {exp.title}
                    </Link>
                    {exp.is_demo && (
                      <span className="rounded bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-400">
                        DEMO
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                        statusColors[exp.status] || "text-zinc-400 bg-zinc-800 border-zinc-700"
                      }`}
                    >
                      {exp.status}
                    </span>
                    {exp.experiment_type && (
                      <span className="rounded bg-zinc-800 text-zinc-300 px-2 py-0.5 text-[10px] font-mono">
                        {exp.experiment_type}
                      </span>
                    )}
                    <span className="rounded bg-emerald-500/10 text-emerald-400 px-2 py-0.5 text-[10px] font-mono border border-emerald-500/20">
                      Cost: ₹0 INR
                    </span>
                  </div>

                  {exp.hypothesis && (
                    <p className="text-xs text-zinc-300 leading-relaxed italic">
                      &ldquo;{exp.hypothesis}&rdquo;
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))] pt-1 flex-wrap">
                    <span>Target: {exp.target_customer || "Operators"}</span>
                    <span>Channel: {exp.channel || "Organic"}</span>
                    {exp.success_criteria && (
                      <span className="text-emerald-400">Target: {exp.success_criteria}</span>
                    )}
                    {exp.result && (
                      <span className="font-semibold text-white">Result: {exp.result}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/experiments/${exp.id}/preview`}
                    className="px-2.5 py-1.5 rounded-lg border border-[hsl(var(--border))] text-xs hover:bg-[hsl(var(--accent))] flex items-center gap-1 text-zinc-300"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </Link>
                  <Link
                    href={`/experiments/${exp.id}`}
                    className="px-3 py-1.5 rounded-lg bg-[hsl(var(--primary))] text-white text-xs font-medium hover:bg-[hsl(var(--primary)_/_0.9)] flex items-center gap-1"
                  >
                    Manage
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
