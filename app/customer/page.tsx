"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Package, Download, Key, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";
import type { CustomerEntitlement } from "@/types/sales";

export default function CustomerPortalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-400">Loading entitlements portal...</div>}>
      <CustomerPortalContent />
    </Suspense>
  );
}

function CustomerPortalContent() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token");
  const emailParam = searchParams.get("email");

  const [token, setToken] = useState(tokenParam || "");
  const [email, setEmail] = useState(emailParam || "");
  const [entitlements, setEntitlements] = useState<CustomerEntitlement[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (tokenParam || emailParam) {
      handleLookup();
    }
  }, [tokenParam, emailParam]);

  async function handleLookup(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoading(true);
    setSearched(true);

    try {
      let url = "/api/sales/entitlements";
      if (email) {
        const custRes = await fetch(`/api/sales/customers?limit=1`);
        // For simplicity or token lookup
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.entitlements) {
        if (token) {
          setEntitlements(data.entitlements.filter((e: CustomerEntitlement) => e.token === token));
        } else {
          setEntitlements(data.entitlements);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="h-4 w-4" /> Customer Entitlements Portal
          </div>
          <h1 className="text-3xl font-extrabold text-white">Your Purchased Products & Downloads</h1>
          <p className="text-sm text-slate-400">
            Access your license keys, digital artifacts, and software downloads.
          </p>
        </div>

        {/* Lookup Form */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 shadow-md">
          <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your Access Token or License Key..."
              className="flex-1 px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors"
            >
              {loading ? "Searching..." : "Access Products"}
            </button>
          </form>
        </div>

        {/* Entitlements List */}
        <div className="space-y-4">
          {entitlements.map((ent) => (
            <div key={ent.id} className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400">
                    {ent.status}
                  </span>
                  <div className="text-lg font-bold text-white mt-1">
                    Licensed Product Access
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  Usage: {ent.used_count} / {ent.max_uses ?? "Unlimited"}
                </div>
              </div>

              {ent.license_key && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Key className="h-4 w-4 text-amber-400" />
                    <span>License Key:</span>
                    <span className="font-mono font-bold text-amber-300">{ent.license_key}</span>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <span className="text-xs text-slate-500">Token: {ent.token?.substring(0, 12)}...</span>
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified Entitlement
                </span>
              </div>
            </div>
          ))}

          {searched && entitlements.length === 0 && !loading && (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-xs text-slate-500">
              No active entitlements found for this key or token.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
