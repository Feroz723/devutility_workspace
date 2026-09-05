"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  HeartHandshake, Users, Activity, LifeBuoy, AlertTriangle, Play,
  CheckCircle2, Clock, Sparkles, MessageSquare, ShieldAlert, ArrowUpRight
} from "lucide-react";

export default function CustomerSuccessDashboard() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [activation, setActivation] = useState<any>(null);
  const [interventions, setInterventions] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [feedbackSummary, setFeedbackSummary] = useState<any>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [custRes, actRes, intRes, tickRes, feedRes] = await Promise.all([
        fetch("/api/customer-success/customers?limit=20"),
        fetch("/api/customer-success/activation"),
        fetch("/api/customer-success/interventions?limit=10"),
        fetch("/api/customer-success/support?status=OPEN&limit=10"),
        fetch("/api/customer-success/feedback"),
      ]);

      const custData = await custRes.json();
      const actData = await actRes.json();
      const intData = await intRes.json();
      const tickData = await tickRes.json();
      const feedData = await feedRes.json();

      setCustomers(Array.isArray(custData) ? custData : []);
      setActivation(actData);
      setInterventions(Array.isArray(intData) ? intData : []);
      setTickets(Array.isArray(tickData) ? tickData : []);
      setFeedbackSummary(feedData?.summary || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function triggerRunner() {
    setRunning(true);
    setRunMessage(null);
    try {
      const res = await fetch("/api/customer-success/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_demo: false }),
      });
      const data = await res.json();
      if (res.ok) {
        setRunMessage(`Evaluated ${data.customers_evaluated} customers: ${data.churn_alerts} churn risks detected, ${data.interventions_proposed} interventions proposed.`);
        await loadData();
      } else {
        setRunMessage(`Runner failed: ${data.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setRunMessage(`Error: ${err?.message || "Failed to run pipeline"}`);
    } finally {
      setRunning(false);
    }
  }

  const healthyCount = customers.filter((c) => c.health_status === "HEALTHY").length;
  const atRiskCount = customers.filter((c) => c.health_status === "AT_RISK").length;
  const dormantCount = customers.filter((c) => c.health_status === "DORMANT").length;
  const churnedCount = customers.filter((c) => c.health_status === "CHURNED" || c.journey_stage === "CHURNED").length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-500 border border-pink-500/20">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Customer Success & Retention Engine</h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Activation milestones, real health telemetry, churn protection, and value verification
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/customer-success/manual"
            className="px-4 py-2 text-sm font-medium border border-[hsl(var(--border))] rounded-lg hover:bg-[hsl(var(--accent))] transition-colors"
          >
            Manual Action Center
          </Link>
          <button
            onClick={triggerRunner}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            {running ? "Running Evaluation..." : "Run CS Evaluation"}
          </button>
        </div>
      </div>

      {runMessage && (
        <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400 text-sm flex items-center justify-between">
          <span>{runMessage}</span>
          <button onClick={() => setRunMessage(null)} className="text-xs underline">Dismiss</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Active Customers</span>
            <Users className="w-4 h-4 text-[hsl(var(--primary))]" />
          </div>
          <p className="mt-3 text-2xl font-bold">{customers.length}</p>
          <div className="mt-2 text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            {healthyCount} healthy, {atRiskCount} at risk
          </div>
        </div>

        <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Activation Rate</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="mt-3 text-2xl font-bold">
            {activation?.activation_rate_percent !== undefined ? `${activation.activation_rate_percent}%` : "0%"}
          </p>
          <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
            {activation?.has_sufficient_data ? `${activation.total_activated} of ${activation.total_tracked} activated` : "Insufficient data (<3 customers)"}
          </p>
        </div>

        <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Open Support Tickets</span>
            <LifeBuoy className="w-4 h-4 text-amber-400" />
          </div>
          <p className="mt-3 text-2xl font-bold">{tickets.length}</p>
          <div className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
            <Link href="/customer-success/support" className="text-amber-400 hover:underline inline-flex items-center gap-1">
              View queue <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Customer Sentiment</span>
            <MessageSquare className="w-4 h-4 text-purple-400" />
          </div>
          <p className="mt-3 text-2xl font-bold">
            {feedbackSummary?.nps_score !== null && feedbackSummary?.nps_score !== undefined
              ? `NPS ${feedbackSummary.nps_score}`
              : feedbackSummary?.average_csat !== null && feedbackSummary?.average_csat !== undefined
              ? `CSAT ${feedbackSummary.average_csat}/5`
              : "No reviews"}
          </p>
          <div className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
            <Link href="/customer-success/feedback" className="text-purple-400 hover:underline inline-flex items-center gap-1">
              Feedback & Features <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Health Distribution & Quick Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Health Matrix */}
        <div className="lg:col-span-2 p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Customer Health Distribution</h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Real-time classification based on recency, frequency, and friction</p>
            </div>
            <Link href="/customer-success/customers" className="text-xs text-[hsl(var(--primary))] hover:underline flex items-center gap-1">
              All Customers <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
              <span className="text-xs text-emerald-400 font-medium">HEALTHY</span>
              <p className="text-2xl font-bold mt-1 text-emerald-300">{healthyCount}</p>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1">Regular value realized</p>
            </div>

            <div className="p-3.5 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <span className="text-xs text-amber-400 font-medium">AT RISK</span>
              <p className="text-2xl font-bold mt-1 text-amber-300">{atRiskCount}</p>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1">Usage drop-off or friction</p>
            </div>

            <div className="p-3.5 rounded-lg border border-blue-500/20 bg-blue-500/5">
              <span className="text-xs text-blue-400 font-medium">DORMANT</span>
              <p className="text-2xl font-bold mt-1 text-blue-300">{dormantCount}</p>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1">&gt;14 days inactive</p>
            </div>

            <div className="p-3.5 rounded-lg border border-rose-500/20 bg-rose-500/5">
              <span className="text-xs text-rose-400 font-medium">CHURNED</span>
              <p className="text-2xl font-bold mt-1 text-rose-300">{churnedCount}</p>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1">Confirmed cancellations</p>
            </div>
          </div>

          {/* Quick customer table */}
          <div className="pt-4 border-t border-[hsl(var(--border))]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-3">Recent Customer Activity</h3>
            {customers.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))] py-4 text-center">No active customers recorded yet.</p>
            ) : (
              <div className="divide-y divide-[hsl(var(--border))]">
                {customers.slice(0, 5).map((c) => (
                  <div key={c.id} className="py-2.5 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{c.email}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{c.name} • Stage: {c.journey_stage}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        c.health_status === "HEALTHY" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        c.health_status === "AT_RISK" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        c.health_status === "DORMANT" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                        "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                        Score: {c.health_score}
                      </span>
                      <Link href={`/customer-success/customers/${c.customer_id}`} className="text-xs text-[hsl(var(--primary))] hover:underline">
                        Details →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Nav & Governed Interventions */}
        <div className="p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Governed Interventions</h2>
            <Link href="/customer-success/manual" className="text-xs text-[hsl(var(--primary))] hover:underline flex items-center gap-1">
              Approvals <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Automated recommendations requiring safety limits and human confirmation before dispatch.
          </p>

          <div className="space-y-3 pt-2">
            {interventions.length === 0 ? (
              <div className="p-4 rounded-lg bg-[hsl(var(--accent))] text-center text-xs text-[hsl(var(--muted-foreground))]">
                No pending interventions. Run CS Evaluation to generate targeted interventions.
              </div>
            ) : (
              interventions.slice(0, 4).map((item) => (
                <div key={item.id} className="p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[hsl(var(--primary))]">{item.intervention_type}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      item.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400" :
                      item.status === "SENT" ? "bg-blue-500/10 text-blue-400" :
                      item.status === "PROPOSED" ? "bg-amber-500/10 text-amber-400" :
                      "bg-zinc-500/10 text-zinc-400"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2">{item.reason}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
