"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Compass,
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import type { ManualActionItem } from "@/distribution/types";

export default function ManualActionCenterPage() {
  const [items, setItems] = useState<ManualActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    try {
      const res = await fetch("/api/distribution/manual");
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      console.error("Error loading manual action items:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleApprove(queueId: string) {
    try {
      const res = await fetch(`/api/distribution/queue/${queueId}/approve`, { method: "POST" });
      if (res.ok) {
        loadItems();
      } else {
        alert("Failed to approve item");
      }
    } catch {
      alert("Error approving item");
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/distribution"
            className="p-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Manual Action Center</h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Clear, transparent instructions for items requiring human setup, credentials, or review.
            </p>
          </div>
        </div>

        <button
          onClick={loadItems}
          className="p-2 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
          Loading manual action checklist...
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center space-y-3 border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))]">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
          <p className="text-sm font-semibold">No Pending Manual Actions</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            All connected channels are operating autonomously within established rate limits.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-4 shadow-sm"
            >
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${
                        item.category === "CREDENTIAL_SETUP"
                          ? "bg-purple-500/10 text-purple-600"
                          : item.category === "CONTENT_APPROVAL"
                          ? "bg-blue-500/10 text-blue-600"
                          : "bg-amber-500/10 text-amber-600"
                      }`}
                    >
                      {item.category}
                    </span>
                    <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                      {item.channel}
                    </span>
                  </div>
                  <h3 className="font-bold text-base mt-1">{item.title}</h3>
                </div>

                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                  {item.current_status}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-[hsl(var(--foreground))]">Why needed:</span>
                  <p className="text-[hsl(var(--muted-foreground))] mt-0.5">{item.why_needed}</p>
                </div>

                <div>
                  <span className="font-semibold text-[hsl(var(--foreground))]">Exact Instructions:</span>
                  <ul className="list-decimal list-inside text-[hsl(var(--muted-foreground))] space-y-1 mt-1">
                    {item.exact_requirements.map((req, idx) => (
                      <li key={idx}>{req}</li>
                    ))}
                  </ul>
                </div>

                {item.draft_content && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[hsl(var(--foreground))]">Prepared Copy:</span>
                      <button
                        onClick={() => handleCopy(item.id, item.draft_content!)}
                        className="text-[11px] text-blue-500 hover:underline flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        {copiedId === item.id ? "Copied!" : "Copy to Clipboard"}
                      </button>
                    </div>
                    <pre className="p-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] font-mono text-[11px] whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {item.draft_content}
                    </pre>
                  </div>
                )}

                <div className="pt-2 border-t border-[hsl(var(--border))] flex items-center justify-between flex-wrap gap-2 text-[11px]">
                  <span className="text-[hsl(var(--muted-foreground))]">
                    <strong className="text-[hsl(var(--foreground))]">Next step:</strong> {item.next_software_step}
                  </span>

                  <div className="flex items-center gap-2">
                    {item.queue_item_id && item.category === "CONTENT_APPROVAL" && (
                      <button
                        onClick={() => handleApprove(item.queue_item_id!)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
                      >
                        Approve Post
                      </button>
                    )}
                    {item.action_url && (
                      <a
                        href={item.action_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 border border-[hsl(var(--border))] rounded hover:bg-[hsl(var(--accent))] flex items-center gap-1"
                      >
                        Target Link <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
