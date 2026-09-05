"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, ArrowLeft, RefreshCw, Mail, Phone, Globe } from "lucide-react";
import type { Customer } from "@/types/sales";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);
    try {
      const res = await fetch("/api/sales/customers?limit=100");
      const data = await res.json();
      if (data.customers) setCustomers(data.customers);
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
            <Users className="h-5 w-5 text-[hsl(var(--primary))]" />
            Customer Directory ({customers.length})
          </h1>
        </div>

        <button
          onClick={loadCustomers}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-xs font-medium hover:bg-[hsl(var(--accent))] flex items-center gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
        {customers.length === 0 ? (
          <div className="text-center py-10 text-xs text-muted-foreground">
            No customer profiles registered yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] text-muted-foreground">
                  <th className="pb-2.5 font-medium">Customer Email</th>
                  <th className="pb-2.5 font-medium">Name</th>
                  <th className="pb-2.5 font-medium">Total Spent</th>
                  <th className="pb-2.5 font-medium">Orders</th>
                  <th className="pb-2.5 font-medium">Acquisition Source</th>
                  <th className="pb-2.5 font-medium">First Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-[hsl(var(--accent))]/50 transition-colors">
                    <td className="py-3 pr-2 font-medium text-[hsl(var(--foreground))] flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      {c.email}
                    </td>
                    <td className="py-3 pr-2 text-muted-foreground">{c.name || "—"}</td>
                    <td className="py-3 pr-2 font-bold text-emerald-400">
                      ₹{((c.total_spent_cents || 0) / 100).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 pr-2">{c.orders_count || 0}</td>
                    <td className="py-3 pr-2 text-muted-foreground text-[11px]">{c.first_touch_source || "direct"}</td>
                    <td className="py-3 pr-2 text-muted-foreground text-[11px]">{new Date(c.created_at).toLocaleDateString()}</td>
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
