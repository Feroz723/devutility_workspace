"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, ExternalLink, Settings } from "lucide-react";
import type { ProviderConnectionStatus } from "@/sales/types";

export default function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderConnectionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  useEffect(() => {
    loadProviders();
  }, []);

  async function loadProviders() {
    setLoading(true);
    try {
      const res = await fetch("/api/sales/providers");
      const data = await res.json();
      if (data.providers) setProviders(data.providers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleTest(provider: string) {
    setTestingProvider(provider);
    try {
      const res = await fetch(`/api/sales/providers/${provider.toLowerCase()}/test`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(`${provider} status: ${data.status.status}`);
        await loadProviders();
      } else {
        alert(`Test failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setTestingProvider(null);
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
            <Settings className="h-5 w-5 text-[hsl(var(--primary))]" />
            Payment Gateway Integrations & Manual Setup Guide
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real connection testing and honest status tracking. Never faked or fabricated.
          </p>
        </div>

        <button
          onClick={loadProviders}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-xs font-medium hover:bg-[hsl(var(--accent))] flex items-center gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {providers.map((p) => {
          const isLive = p.isConfigured;
          return (
            <div
              key={p.provider}
              className={`p-5 rounded-xl border flex flex-col justify-between space-y-4 ${
                isLive ? "bg-emerald-500/5 border-emerald-500/20" : "bg-[hsl(var(--card))] border-[hsl(var(--border))]"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-base text-[hsl(var(--foreground))]">
                    <CreditCard className="h-5 w-5 text-[hsl(var(--primary))]" />
                    {p.provider}
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    isLive ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                  }`}>
                    {p.status}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <div>
                    <strong className="text-white">Currencies:</strong> {p.supportedCurrencies.join(", ")}
                  </div>
                  <div>
                    <strong className="text-white">Methods:</strong> {p.supportedPaymentMethods.join(", ")}
                  </div>
                  {p.credentialsMissing.length > 0 && (
                    <div className="text-rose-400">
                      <strong>Missing Keys:</strong> {p.credentialsMissing.join(", ")}
                    </div>
                  )}
                </div>

                {/* Setup Instructions */}
                <div className="pt-2 border-t border-[hsl(var(--border))] space-y-1.5">
                  <div className="text-xs font-semibold text-white">Setup Instructions:</div>
                  <ul className="text-[11px] text-muted-foreground space-y-1">
                    {p.setupInstructions.map((step, idx) => (
                      <li key={idx} className="leading-tight">{step}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleTest(p.provider)}
                  disabled={testingProvider === p.provider}
                  className="w-full py-2 text-xs font-medium rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] text-white transition-colors"
                >
                  {testingProvider === p.provider ? "Testing Connection..." : `Test ${p.provider} Connection`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
