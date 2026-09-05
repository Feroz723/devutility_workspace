"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, Compass, Plus, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Opportunity {
  id: string;
  title: string;
  overall_score: number | null;
  research_confidence: number | null;
  decision: string | null;
  status: string;
  target_customer: string | null;
  evidence_count: number | null;
  source_count: number | null;
  risk_level: string | null;
  is_demo: boolean;
  created_at: string;
  estimated_revenue: string | null;
}

export default function HunterPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [runningResearch, setRunningResearch] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualTarget, setManualTarget] = useState("");
  const [researchNotice, setResearchNotice] = useState<string | null>(null);
  const limit = 20;

  const loadData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    params.set("sort_by", "created_at");
    params.set("sort_order", "desc");

    try {
      const res = await fetch(`/api/opportunities?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOpportunities(data.opportunities ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRunResearch = async () => {
    setRunningResearch(true);
    setResearchNotice("Starting public research cycle...");
    try {
      const res = await fetch("/api/research/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setResearchNotice(
          `Research run completed! Found ${data.rawItemsFound || 0} items. Created ${data.opportunitiesCreated || 0} opportunities, updated ${data.opportunitiesUpdated || 0}.`
        );
        loadData();
      } else {
        setResearchNotice(`Research run failed: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      setResearchNotice(`Network error: ${err instanceof Error ? err.message : String(err)}`);
    }
    setRunningResearch(false);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTarget.trim()) return;
    setRunningResearch(true);
    setResearchNotice("Analyzing submitted URL / topic...");
    try {
      const res = await fetch("/api/research/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: manualTarget.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setResearchNotice(
          `Targeted research completed! Created ${data.opportunitiesCreated || 0} opportunities, collected ${data.evidenceCollected || 0} evidence items.`
        );
        setManualTarget("");
        setManualOpen(false);
        loadData();
      } else {
        setResearchNotice(`Manual research error: ${data.error || "Failed"}`);
      }
    } catch (err) {
      setResearchNotice(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
    setRunningResearch(false);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const decisionColor = (d: string | null) => {
    if (d === "TEST") return "text-emerald-400 bg-emerald-400/10";
    if (d === "RESEARCH_MORE") return "text-amber-400 bg-amber-400/10";
    if (d === "REJECT") return "text-red-400 bg-red-400/10";
    return "text-zinc-400 bg-zinc-400/10";
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      new: "text-blue-400 bg-blue-400/10",
      researching: "text-violet-400 bg-violet-400/10",
      scored: "text-amber-400 bg-amber-400/10",
      testing: "text-cyan-400 bg-cyan-400/10",
      validated: "text-emerald-400 bg-emerald-400/10",
      rejected: "text-red-400 bg-red-400/10",
      archived: "text-zinc-400 bg-zinc-400/10",
    };
    return map[s] ?? "text-zinc-400 bg-zinc-400/10";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Opportunity Hunter</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            Legitimate business opportunities discovered from real public internet evidence.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setManualOpen(!manualOpen)}
            variant="outline"
            className="border-[hsl(var(--border))] text-sm gap-2"
          >
            <Plus className="h-4 w-4" />
            Manual Research
          </Button>
          <Button
            onClick={handleRunResearch}
            disabled={runningResearch}
            className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white gap-2 text-sm"
          >
            {runningResearch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Compass className="h-4 w-4" />}
            {runningResearch ? "Researching..." : "Run Research"}
          </Button>
        </div>
      </div>

      {researchNotice && (
        <div className="p-3 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-sm flex items-center justify-between">
          <span className="text-zinc-200">{researchNotice}</span>
          <button onClick={() => setResearchNotice(null)} className="text-xs text-[hsl(var(--muted-foreground))] hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Manual Research Dialog */}
      {manualOpen && (
        <form onSubmit={handleManualSubmit} className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-3">
          <h3 className="text-sm font-semibold text-white">Targeted Research on URL or Topic</h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Enter a public URL (e.g., GitHub issue, HN thread, blog) or a specific problem statement to analyze with SSRF protection.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="https://news.ycombinator.com/item?id=... or Freelance invoice tracking"
              value={manualTarget}
              onChange={(e) => setManualTarget(e.target.value)}
              className="flex-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
            />
            <Button type="submit" disabled={runningResearch} size="sm" className="bg-[hsl(var(--primary))] text-white">
              Analyze
            </Button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="Search opportunities..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-2 pl-10 pr-4 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
        >
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="researching">Researching</option>
          <option value="scored">Scored</option>
          <option value="testing">Testing</option>
          <option value="validated">Validated</option>
          <option value="rejected">Rejected</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Opportunity</th>
              <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Score</th>
              <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Confidence</th>
              <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Decision</th>
              <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Status</th>
              <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Evidence</th>
              <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Target</th>
              <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border))]">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">Loading...</td></tr>
            ) : opportunities.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">No opportunities found. Run a research cycle to discover candidates.</td></tr>
            ) : (
              opportunities.map((opp) => (
                <tr key={opp.id} className="bg-[hsl(var(--card))] hover:bg-[hsl(var(--accent))] transition-colors">
                  <td className="px-4 py-3 max-w-[280px]">
                    <Link href={`/hunter/${opp.id}`} className="font-medium text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] block truncate">
                      {opp.title}
                    </Link>
                    {opp.is_demo && (
                      <span className="inline-block rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 uppercase mt-0.5">Demo</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold">{opp.overall_score ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-xs font-semibold ${
                      (opp.research_confidence ?? 0) >= 60 ? "text-emerald-400" : "text-amber-400"
                    }`}>
                      {opp.research_confidence ? `${opp.research_confidence}%` : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {opp.decision ? (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${decisionColor(opp.decision)}`}>
                        {opp.decision}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(opp.status)}`}>
                      {opp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]">
                    {opp.evidence_count ?? 0} item(s) ({opp.source_count ?? 0} source)
                  </td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] max-w-[180px] truncate">{opp.target_customer ?? "—"}</td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] text-xs">
                    {new Date(opp.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-[hsl(var(--muted-foreground))]">
        <span>Showing {opportunities.length} of {total} opportunities</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-[hsl(var(--border))] p-1.5 hover:bg-[hsl(var(--accent))] disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-[hsl(var(--border))] p-1.5 hover:bg-[hsl(var(--accent))] disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
