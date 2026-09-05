"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sliders,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Key,
  ShieldCheck,
  Radio,
  ExternalLink,
} from "lucide-react";

interface IntegrationItem {
  id: string;
  name: string;
  channel_type: string;
  platform: string;
  status: string;
  connection_status: string;
  connected: boolean;
  automation_capability: string;
  credentials_required: boolean;
  manual_setup_required: boolean;
  approval_required: boolean;
  daily_action_limit: number;
  hourly_action_limit: number;
  cost_inr: number;
  message: string;
  manual_setup_instructions: string[];
  policy_notes: string[];
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  async function loadIntegrations() {
    setLoading(true);
    try {
      const res = await fetch("/api/distribution/integrations");
      const data = await res.json();
      setIntegrations(data.integrations || []);
    } catch (err) {
      console.error("Error loading integrations:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleTestConnection(channelType: string) {
    setTestingChannel(channelType);
    try {
      const res = await fetch(`/api/distribution/integrations/${channelType.toLowerCase()}/test`, {
        method: "POST",
      });
      const data = await res.json();
      // Reload integrations list
      await loadIntegrations();
      alert(`Connection test for ${channelType}: ${data.status} — ${data.message}`);
    } catch {
      alert(`Failed to test connection for ${channelType}`);
    } finally {
      setTestingChannel(null);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/distribution"
            className="p-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Distribution Integrations & Channels</h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Zero-cost external platforms, API credentials, rate limits, and live connection status.
            </p>
          </div>
        </div>

        <button
          onClick={loadIntegrations}
          className="p-2 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
          Testing live platform connectivity...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((item) => {
            const isExpanded = expandedChannel === item.channel_type;
            const isTesting = testingChannel === item.channel_type;

            return (
              <div
                key={item.channel_type}
                className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-3 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{item.name}</span>
                      </div>
                      <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">
                        {item.channel_type}
                      </span>
                    </div>

                    <span
                      className={`text-xs px-2 py-0.5 rounded font-mono font-semibold flex items-center gap-1 ${
                        item.connection_status === "CONNECTED"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : item.connection_status === "FAILED"
                          ? "bg-red-500/10 text-red-600"
                          : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {item.connection_status === "CONNECTED" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {item.connection_status}
                    </span>
                  </div>

                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">{item.message}</p>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[hsl(var(--border))] text-[11px]">
                    <div>
                      <span className="text-[hsl(var(--muted-foreground))] block">Automation</span>
                      <span className="font-semibold font-mono">{item.automation_capability}</span>
                    </div>
                    <div>
                      <span className="text-[hsl(var(--muted-foreground))] block">Daily Limit</span>
                      <span className="font-semibold font-mono">{item.daily_action_limit} actions</span>
                    </div>
                    <div>
                      <span className="text-[hsl(var(--muted-foreground))] block">Cost</span>
                      <span className="font-semibold font-mono text-emerald-600">₹{item.cost_inr}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-[hsl(var(--border))] text-xs space-y-2">
                      <span className="font-semibold">Setup Instructions:</span>
                      <ul className="list-decimal list-inside text-[hsl(var(--muted-foreground))] space-y-1">
                        {item.manual_setup_instructions.map((ins, i) => (
                          <li key={i}>{ins}</li>
                        ))}
                      </ul>

                      {item.policy_notes.length > 0 && (
                        <div className="pt-2">
                          <span className="font-semibold">Policy Notes:</span>
                          <ul className="list-disc list-inside text-[hsl(var(--muted-foreground))] space-y-0.5">
                            {item.policy_notes.map((pol, i) => (
                              <li key={i}>{pol}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[hsl(var(--border))] flex items-center justify-between">
                  <button
                    onClick={() => setExpandedChannel(isExpanded ? null : item.channel_type)}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    {isExpanded ? "Hide Details" : "View Instructions"}
                  </button>

                  <button
                    onClick={() => handleTestConnection(item.channel_type)}
                    disabled={isTesting}
                    className="px-3 py-1 text-xs rounded border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] flex items-center gap-1 font-medium"
                  >
                    <RefreshCw className={`h-3 w-3 ${isTesting ? "animate-spin" : ""}`} />
                    Test Connection
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
