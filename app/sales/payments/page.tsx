"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import type { Payment } from "@/types/sales";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    setLoading(true);
    try {
      const res = await fetch("/api/sales/payments?limit=100");
      const data = await res.json();
      if (data.payments) setPayments(data.payments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
            <CreditCard className="h-5 w-5 text-[hsl(var(--primary))]" />
            Payment Ledger ({payments.length})
          </h1>
        </div>

        <button
          onClick={loadPayments}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-xs font-medium hover:bg-[hsl(var(--accent))] flex items-center gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
        {payments.length === 0 ? (
          <div className="text-center py-10 text-xs text-muted-foreground">
            No payment records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] text-muted-foreground">
                  <th className="pb-2.5 font-medium">Payment ID</th>
                  <th className="pb-2.5 font-medium">Provider</th>
                  <th className="pb-2.5 font-medium">Provider Ref ID</th>
                  <th className="pb-2.5 font-medium">Amount</th>
                  <th className="pb-2.5 font-medium">Status</th>
                  <th className="pb-2.5 font-medium">Captured At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[hsl(var(--accent))]/50 transition-colors">
                    <td className="py-3 pr-2 font-mono text-[hsl(var(--foreground))]">{p.id.substring(0, 8)}...</td>
                    <td className="py-3 pr-2 font-semibold text-[11px]">{p.provider}</td>
                    <td className="py-3 pr-2 font-mono text-muted-foreground text-[11px]">
                      {p.provider_payment_id || p.provider_order_id || "—"}
                    </td>
                    <td className="py-3 pr-2 font-bold text-emerald-400">
                      {p.is_free ? "Free (₹0)" : `₹${(p.amount_cents / 100).toLocaleString("en-IN")}`}
                    </td>
                    <td className="py-3 pr-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        p.status === "CAPTURED" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 pr-2 text-muted-foreground text-[11px]">
                      {p.captured_at ? new Date(p.captured_at).toLocaleString() : "—"}
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
