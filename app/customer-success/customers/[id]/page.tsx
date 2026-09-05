"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, HeartHandshake, Activity, Target, ShieldCheck,
  LifeBuoy, Mail, Sparkles, Clock, AlertTriangle, CheckCircle2
} from "lucide-react";

export default function CustomerDetail360Page({
  params,
}: {
  params: { id: string };
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "activation" | "events" | "support" | "interventions">("overview");

  async function loadDetail() {
    setLoading(true);
    try {
      const res = await fetch(`/api/customer-success/customers/${params.id}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetail();
  }, [params.id]);

  if (loading) {
    return <div className="p-8 max-w-7xl mx-auto text-sm text-[hsl(var(--muted-foreground))]">Loading customer profile...</div>;
  }

  if (!data || !data.customer_id) {
    return <div className="p-8 max-w-7xl mx-auto text-sm text-rose-400">Customer not found.</div>;
  }

  const { customer, profile, health, events = [], activations = [], goals = [], support = [], interventions = [] } = data;
  const custEmail = customer?.email || profile?.metadata?.email || "customer@example.com";
  const custName = customer?.name || profile?.metadata?.name || "Customer";

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/customer-success/customers" className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3 h-3" /> Back to Customers
        </Link>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight">{custEmail}</h1>
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-[hsl(var(--accent))] border border-[hsl(var(--border))]">
                {profile?.journey_stage || "CUSTOMER"}
              </span>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              ID: <span className="font-mono">{data.customer_id}</span> • Customer Name: {custName}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">Health Score</span>
              <p className="text-xl font-bold">{health?.health_score ?? 50}/100</p>
            </div>
            <div className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
              health?.status === "HEALTHY" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
              health?.status === "AT_RISK" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
              health?.status === "DORMANT" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
              "bg-rose-500/10 text-rose-400 border-rose-500/20"
            }`}>
              {health?.status || "UNKNOWN"}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[hsl(var(--border))] gap-6 text-sm">
        {[
          { id: "overview", label: "Overview & Health", icon: Activity },
          { id: "activation", label: `Activation & Goals (${goals.length})`, icon: Target },
          { id: "events", label: `Telemetry Events (${events.length})`, icon: Clock },
          { id: "support", label: `Support Tickets (${support.length})`, icon: LifeBuoy },
          { id: "interventions", label: `Interventions (${interventions.length})`, icon: HeartHandshake },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 pb-3 font-medium transition-colors border-b-2 -mb-px ${
              activeTab === id
                ? "border-[hsl(var(--primary))] text-[hsl(var(--foreground))]"
                : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
            <h2 className="text-base font-semibold">Health Score Breakdown</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-[hsl(var(--border))]">
                <span className="text-[hsl(var(--muted-foreground))]">Recency Score</span>
                <span className="font-medium">{health?.recency_score ?? 50}/100</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[hsl(var(--border))]">
                <span className="text-[hsl(var(--muted-foreground))]">Frequency Score</span>
                <span className="font-medium">{health?.frequency_score ?? 50}/100</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[hsl(var(--border))]">
                <span className="text-[hsl(var(--muted-foreground))]">Activation Score</span>
                <span className="font-medium">{health?.activation_score ?? 50}/100</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[hsl(var(--border))]">
                <span className="text-[hsl(var(--muted-foreground))]">Support Score</span>
                <span className="font-medium">{health?.support_score ?? 100}/100</span>
              </div>
            </div>

            <div className="pt-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">Health Signals</h3>
              <div className="space-y-1.5">
                {(health?.signals || []).map((s: string, idx: number) => (
                  <div key={idx} className="p-2 rounded bg-[hsl(var(--accent))] text-xs">
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
            <h2 className="text-base font-semibold">Communication & Safety Settings</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-[hsl(var(--border))]">
                <span className="text-[hsl(var(--muted-foreground))]">Communication Status</span>
                <span className={profile?.unsubscribed ? "text-rose-400 font-medium" : "text-emerald-400 font-medium"}>
                  {profile?.unsubscribed ? "Unsubscribed" : "Opted In"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[hsl(var(--border))]">
                <span className="text-[hsl(var(--muted-foreground))]">Daily Message Cap</span>
                <span className="font-medium">{profile?.daily_message_limit ?? 2} messages / day</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[hsl(var(--border))]">
                <span className="text-[hsl(var(--muted-foreground))]">Weekly Message Cap</span>
                <span className="font-medium">{profile?.weekly_message_limit ?? 5} messages / week</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[hsl(var(--border))]">
                <span className="text-[hsl(var(--muted-foreground))]">Preferred Channel</span>
                <span className="font-medium">{profile?.preferred_channel ?? "EMAIL"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[hsl(var(--border))]">
                <span className="text-[hsl(var(--muted-foreground))]">Created At</span>
                <span className="font-medium text-xs">{profile?.created_at ? new Date(profile.created_at).toLocaleString() : "N/A"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Activation & Goals */}
      {activeTab === "activation" && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
            <h2 className="text-base font-semibold">Product Activations</h2>
            {activations.length === 0 ? (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">No product activation records tracked yet.</p>
            ) : (
              <div className="space-y-3">
                {activations.map((a: any) => (
                  <div key={a.id} className="p-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">Product: {a.product_id}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {a.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-[hsl(var(--muted-foreground))] pt-2">
                      <div>First Action: <span className="font-medium text-[hsl(var(--foreground))]">{a.first_action_name || "None"}</span></div>
                      <div>First Value: <span className="font-medium text-[hsl(var(--foreground))]">{a.first_value_name || "None"}</span></div>
                      <div>Time to Value: <span className="font-medium text-[hsl(var(--foreground))]">{a.time_to_value_seconds ? `${a.time_to_value_seconds}s` : "Pending"}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
            <h2 className="text-base font-semibold">Customer Problem-Solving Goals</h2>
            {goals.length === 0 ? (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">No specific customer goals initialized yet.</p>
            ) : (
              <div className="space-y-4">
                {goals.map((g: any) => (
                  <div key={g.id} className="p-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{g.title}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{g.description || g.expected_outcome}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        g.completion_status === "ACHIEVED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-blue-500/10 text-blue-400"
                      }`}>
                        {g.completion_status} ({g.progress_percent}%)
                      </span>
                    </div>

                    <div className="w-full bg-[hsl(var(--accent))] rounded-full h-2">
                      <div
                        className="bg-[hsl(var(--primary))] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${g.progress_percent}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Events */}
      {activeTab === "events" && (
        <div className="p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
          <h2 className="text-base font-semibold">Immutable Behavioral Telemetry</h2>
          {events.length === 0 ? (
            <p className="text-xs text-[hsl(var(--muted-foreground))]">No events recorded for this customer.</p>
          ) : (
            <div className="divide-y divide-[hsl(var(--border))]">
              {events.map((e: any) => (
                <div key={e.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-[hsl(var(--foreground))]">{e.event_type}</span>
                    <span className="ml-2 text-[hsl(var(--muted-foreground))] font-mono">{e.event_name}</span>
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--accent))]">{e.source}</span>
                  </div>
                  <div className="text-[hsl(var(--muted-foreground))] font-mono">
                    {new Date(e.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Support */}
      {activeTab === "support" && (
        <div className="p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
          <h2 className="text-base font-semibold">Support Ticket History</h2>
          {support.length === 0 ? (
            <p className="text-xs text-[hsl(var(--muted-foreground))]">No support tickets logged.</p>
          ) : (
            <div className="space-y-3">
              {support.map((t: any) => (
                <div key={t.id} className="p-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{t.ticket_number}: {t.subject}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      t.status === "RESOLVED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {t.status} • {t.severity}
                    </span>
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{t.description}</p>
                  {t.resolution && (
                    <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-300 mt-2">
                      Resolution: {t.resolution}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Interventions */}
      {activeTab === "interventions" && (
        <div className="p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
          <h2 className="text-base font-semibold">Interventions & Communications</h2>
          {interventions.length === 0 ? (
            <p className="text-xs text-[hsl(var(--muted-foreground))]">No interventions proposed or executed yet.</p>
          ) : (
            <div className="space-y-3">
              {interventions.map((item: any) => (
                <div key={item.id} className="p-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs text-[hsl(var(--primary))]">{item.intervention_type} ({item.channel})</span>
                    <span className="px-2 py-0.5 rounded text-xs font-mono bg-[hsl(var(--accent))] border border-[hsl(var(--border))]">
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs font-medium">{item.reason}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{item.recommended_action}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
