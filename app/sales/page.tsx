"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Package,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Play,
  Pause,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Truck,
  RotateCcw,
  Users,
  Settings,
  Sparkles,
} from "lucide-react";
import type { Offer, Order } from "@/types/sales";
import type { ProviderConnectionStatus, SalesAnalysisSummary, OfferOptimizationRecommendation } from "@/sales/types";

export default function SalesControlCenter() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SalesAnalysisSummary | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [providers, setProviders] = useState<ProviderConnectionStatus[]>([]);
  const [recommendations, setRecommendations] = useState<OfferOptimizationRecommendation[]>([]);
  const [runningCycle, setRunningCycle] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [metricsRes, offersRes, ordersRes, providersRes] = await Promise.all([
        fetch("/api/sales/metrics"),
        fetch("/api/sales/offers?limit=10"),
        fetch("/api/sales/orders?limit=10"),
        fetch("/api/sales/providers"),
      ]);

      const metricsData = await metricsRes.json();
      const offersData = await offersRes.json();
      const ordersData = await ordersRes.json();
      const providersData = await providersRes.json();

      if (metricsData.summary) setSummary(metricsData.summary);
      if (metricsData.recommendations) setRecommendations(metricsData.recommendations);
      if (offersData.offers) setOffers(offersData.offers);
      if (ordersData.orders) setOrders(ordersData.orders);
      if (providersData.providers) setProviders(providersData.providers);
    } catch (err: any) {
      console.error("Failed to load sales dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunCycle() {
    setRunningCycle(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/sales/run", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Cycle completed: ${data.result.offersPublished} new offers published, ${data.result.successfulDeliveries} deliveries completed.`);
        await loadDashboardData();
      } else {
        setActionMessage(`Cycle error: ${data.error}`);
      }
    } catch (err: any) {
      setActionMessage(`Execution failed: ${err.message}`);
    } finally {
      setRunningCycle(false);
    }
  }

  async function toggleOfferStatus(offerId: string, currentStatus: string) {
    try {
      const endpoint = currentStatus === "ACTIVE"
        ? `/api/sales/offers/${offerId}/pause`
        : `/api/sales/offers/${offerId}/publish`;
      const res = await fetch(endpoint, { method: "POST" });
      if (res.ok) {
        await loadDashboardData();
      } else {
        const err = await res.json();
        alert(`Action failed: ${err.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[hsl(var(--border))] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-[hsl(var(--primary))]" />
            Sales & Orders Control Center
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Autonomous checkout, verified payments, instant product delivery, and real customer entitlements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={handleRunCycle}
            disabled={runningCycle}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg bg-[hsl(var(--primary))] text-white hover:opacity-90 shadow-sm transition-opacity"
          >
            <Sparkles className={`h-3.5 w-3.5 ${runningCycle ? "animate-spin" : ""}`} />
            {runningCycle ? "Running Cycle..." : "Run Sales Engine"}
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-muted-foreground hover:text-white">&times;</button>
        </div>
      )}

      {/* Sub-navigation Links */}
      <div className="flex flex-wrap gap-2 text-xs border-b border-[hsl(var(--border))] pb-3">
        <Link href="/sales" className="px-3 py-1.5 rounded-lg bg-[hsl(var(--accent))] font-semibold text-white">
          Overview
        </Link>
        <Link href="/sales/offers" className="px-3 py-1.5 rounded-lg hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))]">
          Offers & Pricing
        </Link>
        <Link href="/sales/orders" className="px-3 py-1.5 rounded-lg hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))]">
          Orders & Transactions
        </Link>
        <Link href="/sales/customers" className="px-3 py-1.5 rounded-lg hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))]">
          Customers & Entitlements
        </Link>
        <Link href="/sales/payments" className="px-3 py-1.5 rounded-lg hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))]">
          Payment Ledger
        </Link>
        <Link href="/sales/deliveries" className="px-3 py-1.5 rounded-lg hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))]">
          Fulfillments & Downloads
        </Link>
        <Link href="/sales/providers" className="px-3 py-1.5 rounded-lg hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))]">
          Gateways & Setup
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Gross Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
            ₹{((summary?.grossRevenueCents ?? 0) / 100).toLocaleString("en-IN")}
          </p>
          <div className="text-[11px] text-muted-foreground mt-1">
            Net: ₹{((summary?.netRevenueCents ?? 0) / 100).toLocaleString("en-IN")} (excl. refunds)
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Total Orders</span>
            <Package className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
            {summary?.totalOrders ?? 0}
          </p>
          <div className="text-[11px] text-muted-foreground mt-1">
            {summary?.paidOrders ?? 0} Paid • {summary?.freeOrders ?? 0} Free Access
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Average Order Value</span>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
            ₹{((summary?.averageOrderValueCents ?? 0) / 100).toLocaleString("en-IN")}
          </p>
          <div className="text-[11px] text-muted-foreground mt-1">
            Conversion Rate: {summary?.conversionRatePercent ?? 0}%
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Refunds Processed</span>
            <RotateCcw className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
            ₹{((summary?.totalRefundsCents ?? 0) / 100).toLocaleString("en-IN")}
          </p>
          <div className="text-[11px] text-muted-foreground mt-1">
            100% Entitlement Revocation Enforced
          </div>
        </div>
      </div>

      {/* Provider Statuses Grid */}
      <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[hsl(var(--primary))]" />
            Payment Gateway Integrations
          </h2>
          <Link href="/sales/providers" className="text-xs text-[hsl(var(--primary))] hover:underline flex items-center gap-1">
            Configuration Guide <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {providers.map((p) => {
            const isConfigured = p.isConfigured;
            return (
              <div
                key={p.provider}
                className={`p-3 rounded-lg border text-xs ${
                  isConfigured
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-amber-500/5 border-amber-500/20"
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>{p.provider}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                    isConfigured ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                  }`}>
                    {p.status}
                  </span>
                </div>
                <div className="text-muted-foreground text-[11px] mt-1.5 truncate">
                  {p.supportedPaymentMethods.join(", ")}
                </div>
                {p.credentialsMissing.length > 0 && (
                  <div className="text-rose-400 text-[10px] mt-1 truncate">
                    Needs: {p.credentialsMissing.join(", ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Commercial & Free Offers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-[hsl(var(--primary))]" />
              Commercial & Free Offers ({offers.length})
            </h2>
            <Link href="/sales/offers" className="text-xs text-[hsl(var(--primary))] hover:underline">
              View All Offers
            </Link>
          </div>

          {offers.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-lg">
              No offers generated yet. Run the Sales Engine to package validated products into offers.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))] text-muted-foreground">
                    <th className="pb-2 font-medium">Title</th>
                    <th className="pb-2 font-medium">Model</th>
                    <th className="pb-2 font-medium">Price</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {offers.map((offer) => (
                    <tr key={offer.id} className="hover:bg-[hsl(var(--accent))]/50 transition-colors">
                      <td className="py-2.5 pr-2">
                        <div className="font-semibold text-[hsl(var(--foreground))]">{offer.title}</div>
                        <div className="text-[11px] text-muted-foreground">slug: /{offer.slug}</div>
                      </td>
                      <td className="py-2.5 pr-2">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px]">
                          {offer.pricing_model}
                        </span>
                      </td>
                      <td className="py-2.5 pr-2 font-medium">
                        {offer.is_free ? (
                          <span className="text-emerald-400 font-semibold">₹0 (Free)</span>
                        ) : (
                          `₹${(offer.primary_price_cents / 100).toLocaleString("en-IN")}`
                        )}
                      </td>
                      <td className="py-2.5 pr-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                          offer.status === "ACTIVE"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-slate-500/20 text-slate-400"
                        }`}>
                          {offer.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right space-x-2">
                        <Link
                          href={`/checkout/${offer.id}`}
                          target="_blank"
                          className="px-2 py-1 rounded bg-[hsl(var(--accent))] hover:bg-slate-700 text-[11px] inline-flex items-center gap-1"
                        >
                          Checkout <ExternalLink className="h-3 w-3" />
                        </Link>
                        <button
                          onClick={() => toggleOfferStatus(offer.id, offer.status)}
                          className="px-2 py-1 rounded bg-[hsl(var(--accent))] hover:bg-slate-700 text-[11px]"
                        >
                          {offer.status === "ACTIVE" ? "Pause" : "Publish"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Autonomous Optimizations Panel */}
        <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-amber-400">
            <Sparkles className="h-4 w-4" />
            Autonomous Optimizations
          </h2>

          {recommendations.length === 0 ? (
            <div className="p-4 rounded-lg bg-slate-800/30 text-xs text-muted-foreground text-center">
              All active offers operating at optimal conversion parameters.
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.slice(0, 3).map((rec, i) => (
                <div key={i} className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-medium text-amber-300">
                    <span>{rec.type.replace(/_/g, " ")}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20">{rec.priority}</span>
                  </div>
                  <p className="text-[11px] text-[hsl(var(--foreground))]">{rec.recommendation}</p>
                  <p className="text-[10px] text-muted-foreground italic">{rec.rationale}</p>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 rounded-lg border border-[hsl(var(--border))] bg-slate-900/40 text-xs space-y-1">
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Zero-Spend Guarantee
            </div>
            <p className="text-[11px] text-muted-foreground">
              Sales operations require zero paid software. Digital products are delivered autonomously via direct secure download tokens.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Orders Ledger */}
      <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Truck className="h-4 w-4 text-[hsl(var(--primary))]" />
            Recent Orders & Deliveries
          </h2>
          <Link href="/sales/orders" className="text-xs text-[hsl(var(--primary))] hover:underline">
            View All Orders
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">
            No customer orders recorded yet. As traffic arrives through Phase 7 campaigns, orders will appear here in real-time.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] text-muted-foreground">
                  <th className="pb-2 font-medium">Order #</th>
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Channel / UTM</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[hsl(var(--accent))]/50 transition-colors">
                    <td className="py-2.5 pr-2 font-mono font-medium">{ord.order_number}</td>
                    <td className="py-2.5 pr-2 text-muted-foreground">{ord.customer_id.substring(0, 8)}...</td>
                    <td className="py-2.5 pr-2 font-medium">
                      {ord.is_free ? "Free (₹0)" : `₹${(ord.total_amount_cents / 100).toLocaleString("en-IN")}`}
                    </td>
                    <td className="py-2.5 pr-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        ord.status === "PAID"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : ord.status === "REFUNDED"
                          ? "bg-rose-500/20 text-rose-400"
                          : "bg-slate-500/20 text-slate-400"
                      }`}>
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-2 text-muted-foreground text-[11px]">
                      {ord.utm_source || "direct"} / {ord.utm_medium || "organic"}
                    </td>
                    <td className="py-2.5 text-muted-foreground text-[11px]">
                      {new Date(ord.created_at).toLocaleDateString()}
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
