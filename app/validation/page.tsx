"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Filter,
  Search,
  ArrowUpDown,
  FlaskConical,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface OpportunitySummary {
  id: string;
  title: string;
  target_customer: string | null;
  overall_score: number | null;
  validation_score: number | null;
  priority_score: number | null;
  validation_status: string | null;
  decision: string | null;
  evidence_count: number | null;
  source_count: number | null;
  research_confidence: number | null;
  is_demo: boolean;
  created_at: string;
}

export default function ValidationDashboardPage() {
  const [opportunities, setOpportunities] = useState<OpportunitySummary[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function fetchOpportunities() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("sort_by", "priority_score");
      params.set("sort_order", "desc");
      params.set("limit", "50");
      if (statusFilter) params.set("validation_status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/opportunities?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOpportunities(data.opportunities || []);
        setTotal(data.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOpportunities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const candidatesCount = opportunities.filter(
    (o) => o.decision === "TEST_CANDIDATE" || o.decision === "TEST"
  ).length;
  const researchingCount = opportunities.filter(
    (o) => o.decision === "RESEARCH_MORE"
  ).length;
  const avgPriority =
    opportunities.length > 0
      ? Math.round(
          opportunities.reduce((sum, o) => sum + (o.priority_score ?? 0), 0) /
            opportunities.length
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            Validation & Decision Intelligence
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Ranked opportunities evaluated against 8 validation categories and ₹0 spend constraints.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Total Evaluated
          </p>
          <p className="mt-2 text-2xl font-bold font-mono">{total}</p>
        </div>
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Test Candidates
          </p>
          <p className="mt-2 text-2xl font-bold font-mono text-emerald-400">{candidatesCount}</p>
        </div>
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Needs More Research
          </p>
          <p className="mt-2 text-2xl font-bold font-mono text-amber-400">{researchingCount}</p>
        </div>
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            Avg Priority Score
          </p>
          <p className="mt-2 text-2xl font-bold font-mono text-blue-400">{avgPriority}/100</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              placeholder="Search candidate opportunities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchOpportunities()}
              className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
            />
          </div>
          <Button onClick={fetchOpportunities} variant="outline" className="text-xs h-8">
            Filter
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[hsl(var(--muted-foreground))]">Status:</span>
          {["", "TEST_CANDIDATE", "RESEARCHING", "VALIDATED", "REJECTED"].map((st) => (
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

      {/* Opportunity Table */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-sm text-[hsl(var(--muted-foreground))]">
            Loading validation pipeline...
          </div>
        ) : opportunities.length === 0 ? (
          <div className="py-20 text-center text-sm text-[hsl(var(--muted-foreground))]">
            No opportunities match your filter. Run the Hunter or validation engine to populate.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Opportunity</th>
                  <th className="px-4 py-3 font-semibold">Validation</th>
                  <th className="px-4 py-3 font-semibold">Evidence / Sources</th>
                  <th className="px-4 py-3 font-semibold">Decision</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {opportunities.map((opp) => (
                  <tr
                    key={opp.id}
                    className="hover:bg-[hsl(var(--accent))] transition-colors"
                  >
                    {/* Priority */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-sm text-blue-400">
                          {opp.priority_score ?? "—"}
                        </span>
                      </div>
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3.5 max-w-xs">
                      <Link
                        href={`/hunter/${opp.id}`}
                        className="font-medium text-white hover:underline flex items-center gap-1.5"
                      >
                        {opp.title}
                        {opp.is_demo && (
                          <span className="rounded bg-amber-400/10 px-1.5 py-0.2 text-[9px] font-semibold text-amber-400">
                            DEMO
                          </span>
                        )}
                      </Link>
                      <p className="text-[11px] text-[hsl(var(--muted-foreground))] truncate mt-0.5">
                        {opp.target_customer || "General Audience"}
                      </p>
                    </td>

                    {/* Validation Score */}
                    <td className="px-4 py-3.5">
                      <span className="font-mono font-bold text-emerald-400">
                        {opp.validation_score ?? "—"}%
                      </span>
                    </td>

                    {/* Evidence & Sources */}
                    <td className="px-4 py-3.5">
                      <span className="text-zinc-300">
                        {opp.evidence_count ?? 0} quotes ({opp.source_count ?? 1} src)
                      </span>
                    </td>

                    {/* Decision */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          opp.decision === "TEST_CANDIDATE" || opp.decision === "TEST"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : opp.decision === "RESEARCH_MORE"
                            ? "bg-amber-500/15 text-amber-400"
                            : opp.decision === "REQUIRES_APPROVAL"
                            ? "bg-purple-500/15 text-purple-400"
                            : "bg-red-500/15 text-red-400"
                        }`}
                      >
                        {opp.decision || "UNEVALUATED"}
                      </span>
                    </td>

                    {/* Validation Status */}
                    <td className="px-4 py-3.5 font-mono text-[11px] text-zinc-400">
                      {opp.validation_status || "UNVALIDATED"}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/hunter/${opp.id}`}
                        className="inline-flex items-center gap-1 text-[hsl(var(--primary))] hover:underline text-xs"
                      >
                        Inspect
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
