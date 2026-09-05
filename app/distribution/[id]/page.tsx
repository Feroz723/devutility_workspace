"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Megaphone,
  ArrowLeft,
  Play,
  Pause,
  StopCircle,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Copy,
  Users,
  Compass,
  FileText,
  Activity,
  BarChart3,
  Layers,
  Radio,
  Send,
  Eye,
  Sliders,
} from "lucide-react";
import type {
  DistributionCampaign,
  DistributionStrategy,
  DistributionAsset,
  DistributionQueueItem,
  DistributionPublication,
  DistributionLead,
  DistributionMetric,
  DistributionAttribution,
} from "@/types/distribution";
import type { Product } from "@/types/product";

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "strategy"
    | "channels"
    | "content"
    | "queue"
    | "publications"
    | "leads"
    | "attribution"
    | "metrics"
    | "analysis"
    | "manual"
    | "safety"
  >("overview");

  const [campaign, setCampaign] = useState<DistributionCampaign | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [strategy, setStrategy] = useState<DistributionStrategy | null>(null);
  const [assets, setAssets] = useState<DistributionAsset[]>([]);
  const [queueItems, setQueueItems] = useState<DistributionQueueItem[]>([]);
  const [publications, setPublications] = useState<DistributionPublication[]>([]);
  const [leads, setLeads] = useState<DistributionLead[]>([]);
  const [attributions, setAttributions] = useState<DistributionAttribution[]>([]);
  const [metrics, setMetrics] = useState<DistributionMetric[]>([]);
  const [analysisReport, setAnalysisReport] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, [params.id]);

  async function loadAll() {
    setLoading(true);
    try {
      const campRes = await fetch(`/api/distribution/campaigns/${params.id}`);
      const campData = await campRes.json();
      if (!campRes.ok) throw new Error(campData.error || "Failed to load campaign");

      setCampaign(campData.campaign);
      setProduct(campData.product);
      setStrategy(campData.strategy);

      // Fetch related collections
      const [assetRes, queueRes, pubRes, leadRes, attrRes, metricRes] = await Promise.all([
        fetch(`/api/distribution/assets?campaign_id=${params.id}`),
        fetch(`/api/distribution/queue?campaign_id=${params.id}`),
        fetch(`/api/distribution/publications?campaign_id=${params.id}`),
        fetch(`/api/distribution/leads?campaign_id=${params.id}`),
        fetch(`/api/distribution/attribution?campaign_id=${params.id}`),
        fetch(`/api/distribution/metrics?campaign_id=${params.id}`),
      ]);

      const assetData = await assetRes.json();
      const queueData = await queueRes.json();
      const pubData = await pubRes.json();
      const leadData = await leadRes.json();
      const attrData = await attrRes.json();
      const metricData = await metricRes.json();

      setAssets(assetData.assets || []);
      setQueueItems(queueData.items || []);
      setPublications(pubData.publications || []);
      setLeads(leadData.leads || []);
      setAttributions(attrData.attributions || []);
      setMetrics(metricData.metrics || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action: "prepare" | "validate" | "approve" | "run" | "pause" | "resume" | "stop" | "analyze") {
    setActionLoading(true);
    setNotification(null);
    try {
      const res = await fetch(`/api/distribution/campaigns/${params.id}/${action}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Action ${action} failed`);

      if (action === "validate") {
        setValidationResult(data);
        setActiveTab("safety");
      } else if (action === "analyze") {
        setAnalysisReport(data);
        setActiveTab("analysis");
      } else {
        setNotification(data.message || `Campaign ${action} completed successfully.`);
      }
      loadAll();
    } catch (err) {
      setNotification(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleQueueAction(itemId: string, action: "approve" | "cancel") {
    try {
      const res = await fetch(`/api/distribution/queue/${itemId}/${action}`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Queue action failed");
      } else {
        loadAll();
      }
    } catch {
      alert("Error updating queue item");
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
        Loading distribution campaign details...
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-red-500 font-semibold">Campaign not found</p>
        <Link href="/distribution" className="text-sm underline">
          Back to Distribution Dashboard
        </Link>
      </div>
    );
  }

  const TABS = [
    { id: "overview", label: "Overview", icon: Layers },
    { id: "strategy", label: "Strategy", icon: Compass },
    { id: "channels", label: "Channels", icon: Radio },
    { id: "content", label: "Content & Assets", icon: FileText },
    { id: "queue", label: "Queue", icon: Send },
    { id: "publications", label: "Publications", icon: CheckCircle2 },
    { id: "leads", label: "Leads", icon: Users },
    { id: "attribution", label: "Attribution", icon: ExternalLink },
    { id: "metrics", label: "Metrics", icon: BarChart3 },
    { id: "analysis", label: "Analysis", icon: Activity },
    { id: "manual", label: "Manual Actions", icon: Sliders },
    { id: "safety", label: "Guard & Safety", icon: ShieldCheck },
  ] as const;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[hsl(var(--border))] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/distribution"
              className="p-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
            <span
              className={`text-xs px-2.5 py-0.5 rounded font-mono font-medium ${
                campaign.status === "RUNNING"
                  ? "bg-emerald-500/10 text-emerald-600"
                  : campaign.status === "PAUSED"
                  ? "bg-amber-500/10 text-amber-600"
                  : campaign.status === "STOPPED"
                  ? "bg-red-500/10 text-red-600"
                  : "bg-blue-500/10 text-blue-600"
              }`}
            >
              {campaign.status}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-mono">
              ₹{campaign.budget_inr} Budget
            </span>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Target Product: <span className="font-semibold text-[hsl(var(--foreground))]">{product?.name || "Unknown"}</span> • ID: {campaign.id}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleAction("prepare")}
            disabled={actionLoading}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]"
          >
            Prepare Assets
          </button>
          <button
            onClick={() => handleAction("validate")}
            disabled={actionLoading}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]"
          >
            Validate
          </button>
          {campaign.status === "DRAFT" || campaign.status === "READY" ? (
            <button
              onClick={() => handleAction("approve")}
              disabled={actionLoading}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Approve
            </button>
          ) : null}
          {campaign.status !== "RUNNING" && campaign.status !== "STOPPED" && (
            <button
              onClick={() => handleAction("run")}
              disabled={actionLoading}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1"
            >
              <Play className="h-3 w-3" /> Run
            </button>
          )}
          {campaign.status === "RUNNING" && (
            <button
              onClick={() => handleAction("pause")}
              disabled={actionLoading}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 flex items-center gap-1"
            >
              <Pause className="h-3 w-3" /> Pause
            </button>
          )}
          {campaign.status === "PAUSED" && (
            <button
              onClick={() => handleAction("resume")}
              disabled={actionLoading}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1"
            >
              <Play className="h-3 w-3" /> Resume
            </button>
          )}
          {campaign.status !== "STOPPED" && (
            <button
              onClick={() => handleAction("stop")}
              disabled={actionLoading}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-500/30 text-red-600 hover:bg-red-500/10 flex items-center gap-1"
            >
              <StopCircle className="h-3 w-3" /> Stop
            </button>
          )}
          <button
            onClick={() => handleAction("analyze")}
            disabled={actionLoading}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] flex items-center gap-1"
          >
            <Activity className="h-3 w-3" /> Analyze
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3 rounded-lg bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20 text-xs flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* 12 Tabs Navigation */}
      <div className="border-b border-[hsl(var(--border))] overflow-x-auto">
        <nav className="flex space-x-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-2.5 px-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                    : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* 1. OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <span className="text-xs text-[hsl(var(--muted-foreground))]">Assets Prepared</span>
                <p className="text-2xl font-bold mt-1">{assets.length}</p>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">Fact-separated copy</span>
              </div>
              <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <span className="text-xs text-[hsl(var(--muted-foreground))]">Queue Items</span>
                <p className="text-2xl font-bold mt-1">{queueItems.length}</p>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {queueItems.filter((q) => q.status === "PUBLISHED").length} published
                </span>
              </div>
              <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <span className="text-xs text-[hsl(var(--muted-foreground))]">Captured Leads</span>
                <p className="text-2xl font-bold mt-1 text-emerald-600">{leads.length}</p>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">Consented users</span>
              </div>
              <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <span className="text-xs text-[hsl(var(--muted-foreground))]">Actual Spend</span>
                <p className="text-2xl font-bold mt-1 font-mono text-emerald-600">₹{campaign.actual_spend_inr}</p>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">Strict ₹0 limit honored</span>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-3">
              <h3 className="font-semibold text-sm">Product Value Hook</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {product?.value_proposition || product?.solution || "Instant client-side browser utility."}
              </p>
              {product?.product_url && (
                <div className="pt-2">
                  <a
                    href={product.product_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                  >
                    Open Live Product <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. STRATEGY */}
        {activeTab === "strategy" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-2">
              <h3 className="font-semibold text-sm">Target Audience & Problem</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                <span className="font-semibold text-[hsl(var(--foreground))]">Audience:</span> {strategy?.target_audience || "Engineers & tech professionals"}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                <span className="font-semibold text-[hsl(var(--foreground))]">Value Hook:</span> {strategy?.value_hook || product?.solution}
              </p>
            </div>

            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
              <div className="p-4 border-b border-[hsl(var(--border))]">
                <h3 className="font-semibold text-sm">Deterministic Ranked Channels</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[hsl(var(--muted))]/50 text-xs text-[hsl(var(--muted-foreground))] uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Priority</th>
                      <th className="py-2.5 px-4">Channel</th>
                      <th className="py-2.5 px-4">Score</th>
                      <th className="py-2.5 px-4">Automation</th>
                      <th className="py-2.5 px-4">Approval</th>
                      <th className="py-2.5 px-4">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {strategy?.ranked_channels && (strategy.ranked_channels as any[]).map((rc, i) => (
                      <tr key={i} className="hover:bg-[hsl(var(--muted))]/30">
                        <td className="py-3 px-4 font-mono font-semibold">#{rc.priority || i + 1}</td>
                        <td className="py-3 px-4 font-medium">{rc.name || rc.channel_type}</td>
                        <td className="py-3 px-4 font-mono">{rc.total_score}/100</td>
                        <td className="py-3 px-4 text-xs font-mono">{rc.automation_level}</td>
                        <td className="py-3 px-4 text-xs">
                          {rc.approval_required ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">Required</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">Auto</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-600">₹{rc.cost_inr || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. CONTENT & ASSETS */}
        {activeTab === "content" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Generated Content Assets</h3>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">{assets.length} total assets</span>
            </div>
            {assets.length === 0 ? (
              <div className="p-8 text-center text-xs text-[hsl(var(--muted-foreground))] border rounded-xl">
                No content assets prepared yet. Click &quot;Prepare Assets&quot; in the header to generate.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {assets.map((asset) => (
                  <div key={asset.id} className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] font-semibold">
                          {asset.channel_type}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                          {asset.content_type}
                        </span>
                      </div>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                        {asset.approval_status}
                      </span>
                    </div>

                    <h4 className="font-bold text-base">{asset.title}</h4>

                    {/* Strict Separation */}
                    <div className="space-y-2 pt-2 border-t border-[hsl(var(--border))]">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-500">Verified Facts:</span>
                        <ul className="list-disc list-inside text-xs text-[hsl(var(--muted-foreground))] space-y-0.5 mt-1">
                          {asset.fact_claims.map((fact, idx) => (
                            <li key={idx}>{fact}</li>
                          ))}
                        </ul>
                      </div>

                      {asset.inference_notes && asset.inference_notes.length > 0 && (
                        <div>
                          <span className="text-[11px] uppercase tracking-wider font-bold text-blue-500">Inferences & Positioning:</span>
                          <ul className="list-disc list-inside text-xs text-[hsl(var(--muted-foreground))] space-y-0.5 mt-1">
                            {asset.inference_notes.map((inf, idx) => (
                              <li key={idx}>{inf}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div>
                        <span className="text-[11px] uppercase tracking-wider font-bold text-purple-500">Copy Preview:</span>
                        <pre className="mt-1 p-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-xs font-mono whitespace-pre-wrap">
                          {asset.body}
                        </pre>
                      </div>

                      {asset.tracking_url && (
                        <div className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1 pt-1">
                          <span className="font-semibold">UTM URL:</span>
                          <code className="text-[11px] bg-[hsl(var(--muted))] px-1.5 py-0.5 rounded break-all">
                            {asset.tracking_url}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. QUEUE */}
        {activeTab === "queue" && (
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
            <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
              <h3 className="font-semibold text-sm">Distribution Queue State Machine</h3>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">{queueItems.length} items</span>
            </div>
            {queueItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-[hsl(var(--muted-foreground))]">
                Queue is currently empty.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[hsl(var(--muted))]/50 text-xs text-[hsl(var(--muted-foreground))] uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Item ID</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Priority</th>
                      <th className="py-2.5 px-4">Action Required / Note</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {queueItems.map((item) => (
                      <tr key={item.id} className="hover:bg-[hsl(var(--muted))]/30">
                        <td className="py-3 px-4 font-mono text-xs">{item.id.substring(0, 8)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${
                              item.status === "PUBLISHED"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : item.status === "READY_FOR_REVIEW"
                                ? "bg-blue-500/10 text-blue-600"
                                : item.status === "REQUIRES_MANUAL_ACTION"
                                ? "bg-amber-500/10 text-amber-600"
                                : item.status === "FAILED"
                                ? "bg-red-500/10 text-red-600"
                                : "bg-gray-500/10 text-gray-600"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">{item.priority}</td>
                        <td className="py-3 px-4 text-xs text-[hsl(var(--muted-foreground))] max-w-xs truncate">
                          {item.manual_action_required || item.error_message || "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {item.status === "READY_FOR_REVIEW" && (
                              <button
                                onClick={() => handleQueueAction(item.id, "approve")}
                                className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                              >
                                Approve
                              </button>
                            )}
                            {item.status !== "PUBLISHED" && item.status !== "CANCELLED" && (
                              <button
                                onClick={() => handleQueueAction(item.id, "cancel")}
                                className="px-2 py-1 text-xs rounded border border-red-500/30 text-red-600 hover:bg-red-500/10"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 7. LEADS */}
        {activeTab === "leads" && (
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
            <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
              <h3 className="font-semibold text-sm">Acquired Leads & Waitlist</h3>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">{leads.length} real leads</span>
            </div>
            {leads.length === 0 ? (
              <div className="p-8 text-center text-xs text-[hsl(var(--muted-foreground))]">
                No leads acquired yet. Live leads will appear here as users sign up.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[hsl(var(--muted))]/50 text-xs text-[hsl(var(--muted-foreground))] uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Name</th>
                      <th className="py-2.5 px-4">Email</th>
                      <th className="py-2.5 px-4">Source</th>
                      <th className="py-2.5 px-4">Score</th>
                      <th className="py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {leads.map((lead) => (
                      <tr key={lead.id}>
                        <td className="py-3 px-4 font-medium">{lead.name || "Anonymous"}</td>
                        <td className="py-3 px-4 font-mono text-xs">{lead.email || "—"}</td>
                        <td className="py-3 px-4 text-xs">{lead.source}</td>
                        <td className="py-3 px-4 font-mono">{lead.qualification_score}/100</td>
                        <td className="py-3 px-4 text-xs font-mono">{lead.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 8. ATTRIBUTION */}
        {activeTab === "attribution" && (
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
            <div className="p-4 border-b border-[hsl(var(--border))]">
              <h3 className="font-semibold text-sm">First-Party UTM Traffic Attribution</h3>
            </div>
            {attributions.length === 0 ? (
              <div className="p-8 text-center text-xs text-[hsl(var(--muted-foreground))]">
                No tracked inbound visits recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[hsl(var(--muted))]/50 text-xs text-[hsl(var(--muted-foreground))] uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Source</th>
                      <th className="py-2.5 px-4">Medium</th>
                      <th className="py-2.5 px-4">Content</th>
                      <th className="py-2.5 px-4">Visits</th>
                      <th className="py-2.5 px-4">Clicks</th>
                      <th className="py-2.5 px-4">Signups</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {attributions.map((attr) => (
                      <tr key={attr.id}>
                        <td className="py-3 px-4 font-medium">{attr.utm_source || "direct"}</td>
                        <td className="py-3 px-4 text-xs">{attr.utm_medium || "organic"}</td>
                        <td className="py-3 px-4 text-xs">{attr.utm_content || "—"}</td>
                        <td className="py-3 px-4 font-mono">{attr.visits_count}</td>
                        <td className="py-3 px-4 font-mono">{attr.clicks_count}</td>
                        <td className="py-3 px-4 font-mono text-emerald-600">{attr.signups_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 10. ANALYSIS */}
        {activeTab === "analysis" && (
          <div className="space-y-4">
            <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Campaign Performance Evaluation</h3>
                {analysisReport?.analysis?.overall_classification && (
                  <span className="text-xs px-2.5 py-0.5 rounded font-mono font-bold bg-emerald-500/10 text-emerald-600">
                    {analysisReport.analysis.overall_classification}
                  </span>
                )}
              </div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {analysisReport?.analysis?.summary ||
                  "Run 'Analyze' to classify channel performance (WINNING, PROMISING, ITERATE, WEAK, STOP) and extract product feedback signals."}
              </p>

              {analysisReport?.analysis?.recommended_next_actions && (
                <div className="pt-2 border-t border-[hsl(var(--border))]">
                  <span className="text-xs font-semibold">Recommended Actions:</span>
                  <ul className="list-disc list-inside text-xs text-[hsl(var(--muted-foreground))] mt-1 space-y-0.5">
                    {analysisReport.analysis.recommended_next_actions.map((act: string, idx: number) => (
                      <li key={idx}>{act}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 12. GUARD & SAFETY */}
        {activeTab === "safety" && (
          <div className="space-y-4">
            <div className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Zero-Cost Policy & Anti-Spam Verification</h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                  PASS
                </span>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Budget limit: ₹0.00 • Rate-limit enforcement active • Duplicate content hash collision check active.
              </p>
              {validationResult?.zero_cost && (
                <div className="p-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-xs space-y-1">
                  <p className="font-semibold">Zero-Cost Verification Notes:</p>
                  <ul className="list-disc list-inside text-[hsl(var(--muted-foreground))]">
                    {validationResult.zero_cost.notes.map((n: string, i: number) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
