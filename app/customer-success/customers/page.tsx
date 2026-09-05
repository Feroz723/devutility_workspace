"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Search, Filter, ArrowLeft, ArrowUpRight, ShieldCheck, Mail } from "lucide-react";

export default function CustomerDirectoryPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  async function loadCustomers() {
    setLoading(true);
    try {
      const url = stageFilter
        ? `/api/customer-success/customers?stage=${stageFilter}`
        : "/api/customer-success/customers";
      const res = await fetch(url);
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, [stageFilter]);

  const filtered = customers.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.customer_id && c.customer_id.toLowerCase().includes(term))
    );
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/customer-success" className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3 h-3" /> Back to Customer Success Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Customer Journey Directory</h1>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Unified directory with behavioral health status, communication limits, and journey progression
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="Search by customer email, name, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]"
          />
        </div>

        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]"
        >
          <option value="">All Journey Stages</option>
          <option value="CUSTOMER">Customer</option>
          <option value="ACTIVATING">Activating</option>
          <option value="ACTIVE">Active</option>
          <option value="SUCCESSFUL">Successful</option>
          <option value="AT_RISK">At Risk</option>
          <option value="DORMANT">Dormant</option>
          <option value="CHURNED">Churned</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Loading customers...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            No customers found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--accent))] text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-medium">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Journey Stage</th>
                  <th className="px-4 py-3">Health Status</th>
                  <th className="px-4 py-3">Rate Limit</th>
                  <th className="px-4 py-3">Opt-in</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-[hsl(var(--accent))]/50 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <div>{c.email}</div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))] font-normal">{c.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-mono font-medium bg-[hsl(var(--accent))] border border-[hsl(var(--border))]">
                        {c.journey_stage}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                        c.health_status === "HEALTHY" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        c.health_status === "AT_RISK" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        c.health_status === "DORMANT" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                        "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                        {c.health_status} ({c.health_score})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]">
                      Max {c.daily_message_limit}/day, {c.weekly_message_limit}/wk
                    </td>
                    <td className="px-4 py-3">
                      {c.unsubscribed ? (
                        <span className="text-xs text-rose-400 font-medium">Unsubscribed</span>
                      ) : (
                        <span className="text-xs text-emerald-400 font-medium">Opted In</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/customer-success/customers/${c.customer_id}`}
                        className="text-xs font-medium text-[hsl(var(--primary))] hover:underline inline-flex items-center gap-1"
                      >
                        360° Profile <ArrowUpRight className="w-3 h-3" />
                      </Link>
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
