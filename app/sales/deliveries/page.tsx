"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Truck, ArrowLeft, RefreshCw, Mail, ExternalLink, RotateCw } from "lucide-react";
import type { Delivery } from "@/types/sales";

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    loadDeliveries();
  }, []);

  async function loadDeliveries() {
    setLoading(true);
    try {
      const res = await fetch("/api/sales/deliveries?limit=100");
      const data = await res.json();
      if (data.deliveries) setDeliveries(data.deliveries);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRetry(deliveryId: string) {
    setRetryingId(deliveryId);
    try {
      const res = await fetch(`/api/sales/deliveries/${deliveryId}/retry`, { method: "POST" });
      if (res.ok) {
        alert("Fulfillment retried successfully.");
        await loadDeliveries();
      } else {
        const err = await res.json();
        alert(`Retry failed: ${err.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-4">
        <div>
          <Link href="/sales" className="text-xs text-muted-foreground hover:text-white flex items-center gap-1 mb-1">
            <ArrowLeft className="h-3 w-3" /> Back to Sales Dashboard
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Truck className="h-5 w-5 text-[hsl(var(--primary))]" />
            Digital Deliveries & Fulfillments ({deliveries.length})
          </h1>
        </div>

        <button
          onClick={loadDeliveries}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-xs font-medium hover:bg-[hsl(var(--accent))] flex items-center gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
        {deliveries.length === 0 ? (
          <div className="text-center py-10 text-xs text-muted-foreground">
            No delivery fulfillments recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] text-muted-foreground">
                  <th className="pb-2.5 font-medium">Delivery ID</th>
                  <th className="pb-2.5 font-medium">Order ID</th>
                  <th className="pb-2.5 font-medium">Channel</th>
                  <th className="pb-2.5 font-medium">Status</th>
                  <th className="pb-2.5 font-medium">Email Sent</th>
                  <th className="pb-2.5 font-medium">Downloads</th>
                  <th className="pb-2.5 font-medium">Delivered At</th>
                  <th className="pb-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {deliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-[hsl(var(--accent))]/50 transition-colors">
                    <td className="py-3 pr-2 font-mono text-[hsl(var(--foreground))]">{d.id.substring(0, 8)}...</td>
                    <td className="py-3 pr-2 font-mono text-muted-foreground">{d.order_id.substring(0, 8)}...</td>
                    <td className="py-3 pr-2 font-semibold text-[11px]">{d.delivery_channel}</td>
                    <td className="py-3 pr-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        d.status === "DELIVERED" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="py-3 pr-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${d.email_sent ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"}`}>
                        {d.email_sent ? "Yes" : "No / Page Only"}
                      </span>
                    </td>
                    <td className="py-3 pr-2 font-bold">{d.download_count || 0}</td>
                    <td className="py-3 pr-2 text-muted-foreground text-[11px]">
                      {d.delivered_at ? new Date(d.delivered_at).toLocaleDateString() : "Pending"}
                    </td>
                    <td className="py-3 text-right space-x-2">
                      {d.access_link && (
                        <Link
                          href={d.access_link}
                          target="_blank"
                          className="px-2 py-1 rounded bg-[hsl(var(--accent))] hover:bg-slate-700 text-[11px] inline-flex items-center gap-1"
                        >
                          Access <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                      <button
                        onClick={() => handleRetry(d.id)}
                        disabled={retryingId === d.id}
                        className="px-2 py-1 rounded border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] text-[11px]"
                      >
                        {retryingId === d.id ? "Retrying..." : "Retry"}
                      </button>
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
