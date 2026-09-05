"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Brain,
  Play,
  TrendingUp,
  AlertTriangle,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  Clock,
  DollarSign,
  Activity,
  CheckCircle,
} from "lucide-react";
import { IntelligenceNav } from "@/components/intelligence/intelligence-nav";

export default function BusinessBrainDashboard() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [economics, setEconomics] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [snapRes, metRes, econRes, portRes, decRes, riskRes] = await Promise.all([
        fetch("/api/intelligence/snapshot"),
        fetch("/api/intelligence/metrics"),
        fetch("/api/intelligence/unit-economics"),
        fetch("/api/intelligence/portfolio"),
        fetch("/api/intelligence/decisions?limit=5"),
        fetch("/api/intelligence/risks"),
      ]);

      const snapData = await snapRes.json();
      const metData = await metRes.json();
      const econData = await econRes.json();
      const portData = await portRes.json();
      const decData = await decRes.json();
      const riskData = await riskRes.json();

      setSnapshot(snapData.snapshot);
      setMetrics(metData);
      setEconomics(econData.current);
      setPortfolio(portData.portfolio || []);
      setDecisions(decData.decisions || []);
      setRisks(riskData.active_risks || []);
    } catch (err) {
      console.error("Failed to load intelligence data", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function triggerRun() {
    setRunning(true);
    setRunMessage(null);
    try {
      const res = await fetch("/api/intelligence/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_demo: false }),
      });
      const data = await res.json();
      if (data.success) {
        setRunMessage(
          `Cycle completed in ${data.result?.execution_duration_ms}ms. Evaluated ${data.result?.products_evaluated} products, ${data.result?.channels_evaluated} channels, proposed ${data.result?.decisions_proposed} decisions.`
        );
        loadData();
      } else {
        setRunMessage(`Cycle failed: ${data.result?.error || data.error}`);
      }
    } catch (err: any) {
      setRunMessage(`Error triggering intelligence cycle: ${err.message}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Autonomous Business Brain</h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Phase 10 — Portfolio Intelligence, Deterministic Decisions & Non-Monetary Resource Allocation
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={triggerRun}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50 shadow-sm"
          >
            <Play className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
            {running ? "Synthesizing Intelligence..." : "Run Autonomous Cycle"}
          </button>
        </div>
      </div>

      <IntelligenceNav />

      {runMessage && (
        <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/10 text-sm flex items-center gap-3 text-purple-200">
          <Zap className="h-4 w-4 shrink-0 text-purple-400" />
          <p>{runMessage}</p>
        </div>
      )}

      {/* Top Level KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Net Revenue</p>
          <p className="text-xl font-bold mt-1 text-emerald-400">
            ₹{Number(snapshot?.net_revenue_inr || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">Verified live collections</p>
        </div>

        <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Active Customers</p>
          <p className="text-xl font-bold mt-1 text-blue-400">
            {snapshot?.total_customers_count ?? 0}
          </p>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
            {snapshot?.activated_customers_count ?? 0} activated
          </p>
        </div>

        <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Retention Rate</p>
          <p className="text-xl font-bold mt-1 text-indigo-400">
            {snapshot?.active_retention_rate_percent ?? 0}%
          </p>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
            {snapshot?.confirmed_churn_count ?? 0} churned
          </p>
        </div>

        <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Spending Boundary</p>
          <p className="text-xl font-bold mt-1 text-emerald-400">₹0</p>
          <p className="text-[10px] text-emerald-500/80 mt-1">Zero-cost enforced</p>
        </div>

        <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Proposed Decisions</p>
          <p className="text-xl font-bold mt-1 text-amber-400">
            {decisions.length}
          </p>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">Pending review / action</p>
        </div>

        <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Active Risks</p>
          <p className="text-xl font-bold mt-1 text-rose-400">
            {risks.length}
          </p>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">Monitored boundaries</p>
        </div>
      </div>

      {/* Main Split: Funnel & Unit Economics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel Metrics */}
        <div className="p-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-400" />
              Funnel Conversion Geometry
            </h2>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${
                metrics?.funnel?.has_sufficient_data
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-300"
              }`}
            >
              {metrics?.funnel?.has_sufficient_data ? "SUFFICIENT DATA" : "INSUFFICIENT DATA"}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2 text-center py-4 bg-[hsl(var(--accent))]/30 rounded-xl">
            <div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Visitors</p>
              <p className="text-lg font-bold">{metrics?.funnel?.visitors ?? 0}</p>
            </div>
            <div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Leads</p>
              <p className="text-lg font-bold">{metrics?.funnel?.leads ?? 0}</p>
            </div>
            <div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Signups</p>
              <p className="text-lg font-bold">{metrics?.funnel?.signups ?? 0}</p>
            </div>
            <div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Checkouts</p>
              <p className="text-lg font-bold">{metrics?.funnel?.checkouts ?? 0}</p>
            </div>
            <div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Paid Orders</p>
              <p className="text-lg font-bold text-emerald-400">{metrics?.funnel?.paid_orders ?? 0}</p>
            </div>
          </div>

          <div className="space-y-2 pt-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[hsl(var(--border))]/50">
              <span className="text-[hsl(var(--muted-foreground))]">Lead Conversion Rate:</span>
              <span className="font-semibold">
                {metrics?.funnel?.lead_conversion_percent != null
                  ? `${metrics.funnel.lead_conversion_percent}%`
                  : "INSUFFICIENT_DATA"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[hsl(var(--border))]/50">
              <span className="text-[hsl(var(--muted-foreground))]">Checkout-to-Payment Rate:</span>
              <span className="font-semibold">
                {metrics?.funnel?.payment_conversion_percent != null
                  ? `${metrics.funnel.payment_conversion_percent}%`
                  : "INSUFFICIENT_DATA"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[hsl(var(--border))]/50">
              <span className="text-[hsl(var(--muted-foreground))]">Average Order Value:</span>
              <span className="font-semibold text-emerald-400">
                {metrics?.funnel?.average_order_value_inr != null
                  ? `₹${metrics.funnel.average_order_value_inr}`
                  : "INSUFFICIENT_DATA"}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[hsl(var(--muted-foreground))]">Refund Rate:</span>
              <span className="font-semibold text-rose-400">
                {metrics?.funnel?.refund_rate_percent != null
                  ? `${metrics.funnel.refund_rate_percent}%`
                  : "0.0%"}
              </span>
            </div>
          </div>
        </div>

        {/* Unit Economics */}
        <div className="p-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              Unit Economics & CAC / LTV
            </h2>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${
                economics?.cost_status === "RECORDED_ZERO_COST"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : economics?.cost_status === "UNKNOWN_COST"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-blue-500/10 border-blue-500/30 text-blue-300"
              }`}
            >
              {economics?.cost_status || "RECORDED_ZERO_COST"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 py-4 bg-[hsl(var(--accent))]/30 rounded-xl text-center">
            <div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Gross Margin</p>
              <p className="text-xl font-bold text-emerald-400">
                {economics?.gross_margin_percent != null ? `${economics.gross_margin_percent}%` : "100%"}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">CAC (Acquisition)</p>
              <p className="text-xl font-bold text-blue-400">
                {economics?.customer_acquisition_cost_inr != null ? `₹${economics.customer_acquisition_cost_inr}` : "₹0"}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">LTV (Lifetime Value)</p>
              <p className="text-xl font-bold text-purple-400">
                {economics?.customer_lifetime_value_inr != null ? `₹${economics.customer_lifetime_value_inr}` : "₹0"}
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[hsl(var(--border))]/50">
              <span className="text-[hsl(var(--muted-foreground))]">Payback Period:</span>
              <span className="font-semibold">
                {economics?.payback_period_days != null ? `${economics.payback_period_days} days` : "Instant (₹0 spend)"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[hsl(var(--border))]/50">
              <span className="text-[hsl(var(--muted-foreground))]">Revenue per User:</span>
              <span className="font-semibold">
                {economics?.revenue_per_user_inr != null ? `₹${economics.revenue_per_user_inr}` : "₹0"}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[hsl(var(--muted-foreground))]">Statistical Confidence:</span>
              <span className="font-semibold text-amber-300">
                {economics?.confidence || "INSUFFICIENT_DATA"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ranked Portfolio Snapshot */}
      <div className="p-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-400" />
              Ranked Portfolio Matrix
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Multi-dimensional evaluation across Opportunities, Experiments, Products, Campaigns, and Offers
            </p>
          </div>
          <Link
            href="/intelligence/portfolio"
            className="text-xs text-[hsl(var(--primary))] flex items-center gap-1 hover:underline"
          >
            View Full Matrix <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] uppercase text-[10px]">
              <tr>
                <th className="py-2.5">Asset / Subject</th>
                <th className="py-2.5">Domain</th>
                <th className="py-2.5">Priority Score</th>
                <th className="py-2.5">Evidence Confidence</th>
                <th className="py-2.5">Recommended Action</th>
                <th className="py-2.5">Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]/40">
              {portfolio.slice(0, 6).map((item) => (
                <tr key={item.id} className="hover:bg-[hsl(var(--accent))]/20 transition-colors">
                  <td className="py-2.5 font-medium">{item.name}</td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded bg-[hsl(var(--accent))] text-[10px]">
                      {item.type}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-12 bg-[hsl(var(--accent))] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-500 h-full rounded-full"
                          style={{ width: `${item.priority_score}%` }}
                        />
                      </div>
                      <span className="font-semibold">{item.priority_score}</span>
                    </div>
                  </td>
                  <td className="py-2.5 text-[hsl(var(--muted-foreground))]">
                    {item.evidence_strength}
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                        item.recommended_action === "SCALE"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : item.recommended_action === "STOP" || item.recommended_action === "PAUSE"
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-blue-500/20 text-blue-300"
                      }`}
                    >
                      {item.recommended_action}
                    </span>
                  </td>
                  <td className="py-2.5 text-[hsl(var(--muted-foreground))] truncate max-w-xs">
                    {item.rationale}
                  </td>
                </tr>
              ))}
              {portfolio.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[hsl(var(--muted-foreground))]">
                    No portfolio assets ranked yet. Click &quot;Run Autonomous Cycle&quot; to evaluate active products, campaigns, and offers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lower Split: Recent Decisions & Active Risks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Decisions */}
        <div className="p-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              Autonomous Decision Proposals
            </h2>
            <Link
              href="/intelligence/decisions"
              className="text-xs text-[hsl(var(--primary))] flex items-center gap-1 hover:underline"
            >
              All Decisions <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {decisions.map((dec) => (
              <div
                key={dec.id}
                className="p-3.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--accent))]/10 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{dec.subject_name}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        dec.decision === "STOP"
                          ? "bg-rose-500/20 text-rose-300"
                          : dec.decision === "SCALE"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-blue-500/20 text-blue-300"
                      }`}
                    >
                      {dec.decision}
                    </span>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                      {dec.status}
                    </span>
                  </div>
                </div>

                <p className="text-[hsl(var(--muted-foreground))]">{dec.recommended_next_action}</p>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-amber-300">
                    {dec.requires_approval ? "Requires Operator Approval" : "Auto-Actionable"}
                  </span>
                  <Link
                    href={`/intelligence/decisions/${dec.id}`}
                    className="text-[11px] text-[hsl(var(--primary))] hover:underline flex items-center gap-1"
                  >
                    Inspect Evidence <ArrowRight className="h-2.5 w-2.5" />
                  </Link>
                </div>
              </div>
            ))}
            {decisions.length === 0 && (
              <p className="text-xs text-[hsl(var(--muted-foreground))] text-center py-6">
                No decisions proposed yet. Run an intelligence cycle to generate evidence-backed decisions.
              </p>
            )}
          </div>
        </div>

        {/* Business Risks */}
        <div className="p-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              Business Risk Register
            </h2>
            <Link
              href="/intelligence/risks"
              className="text-xs text-[hsl(var(--primary))] flex items-center gap-1 hover:underline"
            >
              All Risks <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {risks.slice(0, 4).map((risk) => (
              <div
                key={risk.id}
                className="p-3.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--accent))]/10 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{risk.title}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      risk.severity === "CRITICAL"
                        ? "bg-rose-500/20 text-rose-300"
                        : risk.severity === "HIGH"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-blue-500/20 text-blue-300"
                    }`}
                  >
                    {risk.severity}
                  </span>
                </div>
                <p className="text-[hsl(var(--muted-foreground))] text-[11px]">{risk.description}</p>
                <p className="text-[10px] text-emerald-400/90 font-mono">Mitigation: {risk.mitigation}</p>
              </div>
            ))}
            {risks.length === 0 && (
              <p className="text-xs text-[hsl(var(--muted-foreground))] text-center py-6">
                No critical risks detected. Operational telemetry within healthy tolerances.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
