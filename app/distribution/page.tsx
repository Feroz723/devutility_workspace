"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Megaphone,
  Plus,
  Play,
  Pause,
  StopCircle,
  ExternalLink,
  ShieldCheck,
  Users,
  Compass,
  FileText,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Send,
  Sliders,
} from "lucide-react";
import type { DistributionCampaign } from "@/types/distribution";
import type { Product } from "@/types/product";

interface CampaignItem extends DistributionCampaign {
  product_name?: string;
}

export default function DistributionPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDemo, setShowDemo] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [showDemo]);

  async function loadData() {
    setLoading(true);
    try {
      const [campRes, prodRes] = await Promise.all([
        fetch(`/api/distribution/campaigns?is_demo=${showDemo}`),
        fetch(`/api/products?is_demo=${showDemo}`),
      ]);

      const campData = await campRes.json();
      const prodData = await prodRes.json();

      setCampaigns(campData.campaigns || []);
      setProducts(prodData.products || []);
    } catch (err) {
      console.error("Error loading distribution data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProductId) return;

    setCreating(true);
    setMessage(null);
    try {
      // 1. Generate plan & strategy for product
      const planRes = await fetch("/api/distribution/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: selectedProductId }),
      });
      const planData = await planRes.json();
      if (!planRes.ok) throw new Error(planData.error || "Failed to generate strategy");

      // 2. Create campaign linked to strategy
      const chosenProduct = products.find((p) => p.id === selectedProductId);
      const campRes = await fetch("/api/distribution/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: selectedProductId,
          strategy_id: planData.strategy.id,
          name: campaignName || `${chosenProduct?.name || "Product"} Organic Acquisition`,
          budget_inr: 0,
          is_demo: showDemo,
        }),
      });
      const campData = await campRes.json();
      if (!campRes.ok) throw new Error(campData.error || "Failed to create campaign");

      // 3. Prepare initial assets
      await fetch(`/api/distribution/campaigns/${campData.id}/prepare`, { method: "POST" });

      setShowCreateModal(false);
      setCampaignName("");
      setSelectedProductId("");
      setMessage("Campaign created and initial zero-cost assets prepared!");
      loadData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error creating campaign");
    } finally {
      setCreating(false);
    }
  }

  async function handleRunCampaign(id: string) {
    try {
      const res = await fetch(`/api/distribution/campaigns/${id}/run`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) alert(data.error || "Run failed");
      else {
        alert(data.message);
        loadData();
      }
    } catch (err) {
      alert("Error triggering campaign run");
    }
  }

  const activeCount = campaigns.filter((c) => c.status === "RUNNING").length;
  const readyCount = campaigns.filter((c) => c.status === "APPROVED" || c.status === "READY").length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[hsl(var(--border))] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
              <Megaphone className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Autonomous Distribution</h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Zero-cost organic customer acquisition across owned and public channels (₹0 Spend Limit)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/distribution/manual"
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] transition-colors"
          >
            <Compass className="h-4 w-4 text-amber-500" />
            Manual Action Center
          </Link>
          <Link
            href="/distribution/integrations"
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] transition-colors"
          >
            <Sliders className="h-4 w-4 text-blue-500" />
            Integrations
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[hsl(var(--primary))] rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </button>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-lg bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20 text-sm flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Active Campaigns</span>
            <Play className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{activeCount}</p>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">{readyCount} ready to dispatch</span>
        </div>

        <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Zero-Spend Guard</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-emerald-500">₹0 Budget</p>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">100% free organic channels only</span>
        </div>

        <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Total Campaigns</span>
            <Megaphone className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{campaigns.length}</p>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Managed across 17 channels</span>
        </div>

        <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Mode</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-mono">
              {showDemo ? "DEMO" : "LIVE"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-medium">Show Demo Data</span>
            <input
              type="checkbox"
              checked={showDemo}
              onChange={(e) => setShowDemo(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
        <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <h2 className="font-semibold text-base">Campaigns</h2>
          <button
            onClick={loadData}
            className="p-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            Loading distribution campaigns...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Megaphone className="h-10 w-10 text-[hsl(var(--muted-foreground))] mx-auto opacity-40" />
            <p className="text-sm font-medium">No distribution campaigns yet</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-md mx-auto">
              Select a built product and start an autonomous zero-cost acquisition campaign to reach users.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-xs font-medium text-white bg-[hsl(var(--primary))] rounded-lg hover:opacity-90"
            >
              Create First Campaign
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[hsl(var(--muted))]/50 text-xs text-[hsl(var(--muted-foreground))] uppercase">
                <tr>
                  <th className="py-3 px-4">Campaign</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Budget</th>
                  <th className="py-3 px-4">Spend</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y border-[hsl(var(--border))] divide-[hsl(var(--border))]">
                {campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-[hsl(var(--muted))]/30 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        href={`/distribution/${camp.id}`}
                        className="font-medium hover:underline flex items-center gap-1.5"
                      >
                        {camp.name}
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </Link>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">ID: {camp.id.substring(0, 8)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${
                          camp.status === "RUNNING"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : camp.status === "PAUSED"
                            ? "bg-amber-500/10 text-amber-600"
                            : camp.status === "STOPPED"
                            ? "bg-red-500/10 text-red-600"
                            : "bg-blue-500/10 text-blue-600"
                        }`}
                      >
                        {camp.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-600 font-semibold">₹{camp.budget_inr}</td>
                    <td className="py-3 px-4 font-mono">₹{camp.actual_spend_inr}</td>
                    <td className="py-3 px-4 text-xs text-[hsl(var(--muted-foreground))]">
                      {new Date(camp.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/distribution/${camp.id}`}
                          className="px-2.5 py-1 text-xs rounded border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]"
                        >
                          View
                        </Link>
                        {camp.status !== "RUNNING" && camp.status !== "STOPPED" && (
                          <button
                            onClick={() => handleRunCampaign(camp.id)}
                            className="px-2.5 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            Run
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

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold">New Customer Acquisition Campaign</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              The engine will analyze the product, rank the top zero-cost channels, generate factual copy, and queue actions.
            </p>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Select Product</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  required
                  className="w-full text-sm p-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]"
                >
                  <option value="">-- Choose a built product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Campaign Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Developer Tool Launch v1"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full text-sm p-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]"
                />
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 space-y-1">
                <p className="font-semibold">Zero-Cost Policy Enforcement:</p>
                <p>Budget will automatically be set to ₹0. Paid acquisition or ads will be blocked.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !selectedProductId}
                  className="px-4 py-2 text-xs font-medium text-white bg-[hsl(var(--primary))] rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {creating ? "Generating Strategy..." : "Create Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
