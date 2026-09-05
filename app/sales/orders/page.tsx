"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Truck,
  ArrowLeft,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import type { Order } from "@/types/sales";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    try {
      const res = await fetch("/api/sales/orders?limit=100");
      const data = await res.json();
      if (data.orders) setOrders(data.orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefund(orderId: string) {
    if (!confirm("Are you sure you want to process a refund? This will immediately revoke active product entitlement for the customer.")) return;
    setRefundingId(orderId);
    try {
      const res = await fetch("/api/sales/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, reason: "Customer request via dashboard" }),
      });
      if (res.ok) {
        alert("Refund processed successfully and entitlement revoked.");
        await loadOrders();
      } else {
        const err = await res.json();
        alert(`Refund failed: ${err.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setRefundingId(null);
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
            Orders & Transactions ({orders.length})
          </h1>
        </div>

        <button
          onClick={loadOrders}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-xs font-medium hover:bg-[hsl(var(--accent))] flex items-center gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
        {orders.length === 0 ? (
          <div className="text-center py-10 text-xs text-muted-foreground">
            No customer orders recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] text-muted-foreground">
                  <th className="pb-2.5 font-medium">Order Number</th>
                  <th className="pb-2.5 font-medium">Customer ID</th>
                  <th className="pb-2.5 font-medium">Amount</th>
                  <th className="pb-2.5 font-medium">Status</th>
                  <th className="pb-2.5 font-medium">Source / Campaign</th>
                  <th className="pb-2.5 font-medium">Created</th>
                  <th className="pb-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-[hsl(var(--accent))]/50 transition-colors">
                    <td className="py-3 pr-2 font-mono font-bold text-[hsl(var(--foreground))]">
                      {order.order_number}
                    </td>
                    <td className="py-3 pr-2 font-mono text-muted-foreground">
                      {order.customer_id.substring(0, 8)}...
                    </td>
                    <td className="py-3 pr-2 font-medium">
                      {order.is_free ? (
                        <span className="text-emerald-400 font-semibold">Free (₹0)</span>
                      ) : (
                        `₹${(order.total_amount_cents / 100).toLocaleString("en-IN")}`
                      )}
                    </td>
                    <td className="py-3 pr-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        order.status === "PAID"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : order.status === "REFUNDED"
                          ? "bg-rose-500/20 text-rose-400"
                          : "bg-slate-500/20 text-slate-400"
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 pr-2 text-muted-foreground text-[11px]">
                      {order.utm_source || "direct"} / {order.utm_medium || "none"}
                    </td>
                    <td className="py-3 pr-2 text-muted-foreground text-[11px]">
                      {new Date(order.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      {order.status === "PAID" && !order.is_free && (
                        <button
                          onClick={() => handleRefund(order.id)}
                          disabled={refundingId === order.id}
                          className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[11px] font-medium"
                        >
                          {refundingId === order.id ? "Refunding..." : "Refund"}
                        </button>
                      )}
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
