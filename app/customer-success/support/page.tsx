"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LifeBuoy, ArrowLeft, CheckCircle2, AlertCircle, Bot, Sparkles, Send, Clock
} from "lucide-react";

export default function SupportDashboardPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [resolutionText, setResolutionText] = useState("");
  const [processing, setProcessing] = useState(false);

  async function loadTickets() {
    setLoading(true);
    try {
      const res = await fetch("/api/customer-success/support");
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function selectTicket(ticket: any) {
    setSelectedTicket(ticket);
    try {
      const res = await fetch(`/api/customer-success/support/${ticket.id}`);
      const data = await res.json();
      setMessages(data.messages || []);
      if (!ticket.ai_suggested_response) {
        // trigger AI triage if not done yet
        const triageRes = await fetch(`/api/customer-success/support/${ticket.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "ai_triage" }),
        });
        const triageData = await triageRes.json();
        if (triageData?.suggested_response) {
          setSelectedTicket((prev: any) => ({
            ...prev,
            ai_suggested_response: triageData.suggested_response,
            ai_suggested_category: triageData.suggested_category,
          }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  async function handleSendReply() {
    if (!selectedTicket || !replyText.trim()) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/customer-success/support/${selectedTicket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_type: "AGENT",
          sender_name: "Human Operator",
          body: replyText,
        }),
      });
      if (res.ok) {
        setReplyText("");
        await selectTicket(selectedTicket);
        await loadTickets();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  }

  async function handleResolve() {
    if (!selectedTicket || !resolutionText.trim()) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/customer-success/support/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resolve",
          resolution: resolutionText,
          resolved_by: "operator",
        }),
      });
      if (res.ok) {
        setResolutionText("");
        setSelectedTicket(null);
        await loadTickets();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/customer-success" className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3 h-3" /> Back to Customer Success Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <LifeBuoy className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Support Ticket Operations</h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Resolution tracking with read-only AI draft assistance and human operator governance
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-3">
          <h2 className="text-sm font-semibold">Incoming Tickets ({tickets.length})</h2>
          {loading ? (
            <div className="p-4 text-xs text-[hsl(var(--muted-foreground))]">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="p-4 text-xs text-[hsl(var(--muted-foreground))]">No tickets found.</div>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => selectTicket(t)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTicket?.id === t.id
                      ? "border-[hsl(var(--primary))] bg-[hsl(var(--accent))]"
                      : "border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]/50"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-medium">{t.ticket_number}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      t.severity === "CRITICAL" ? "bg-rose-500/10 text-rose-400" :
                      t.severity === "HIGH" ? "bg-amber-500/10 text-amber-400" :
                      "bg-blue-500/10 text-blue-400"
                    }`}>
                      {t.severity}
                    </span>
                  </div>
                  <p className="text-sm font-semibold mt-1 truncate">{t.subject}</p>
                  <div className="flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))] mt-1">
                    <span>{t.category}</span>
                    <span className="font-mono">{t.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conversation & AI Assist Panel */}
        <div className="lg:col-span-2 p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-5">
          {!selectedTicket ? (
            <div className="h-96 flex flex-col items-center justify-center text-[hsl(var(--muted-foreground))] text-sm">
              <LifeBuoy className="w-10 h-10 mb-2 opacity-30" />
              Select a ticket from the left panel to inspect messages and triage.
            </div>
          ) : (
            <>
              {/* Ticket Top Info */}
              <div className="flex items-start justify-between border-b border-[hsl(var(--border))] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">{selectedTicket.ticket_number}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-[hsl(var(--accent))]">{selectedTicket.status}</span>
                  </div>
                  <h2 className="text-lg font-bold mt-1">{selectedTicket.subject}</h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    Customer ID: <span className="font-mono">{selectedTicket.customer_id}</span>
                  </p>
                </div>
              </div>

              {/* AI Read-Only Suggestion Box */}
              {selectedTicket.ai_suggested_response && (
                <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-purple-400 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Bot className="w-4 h-4" /> AI Suggested Draft (Read-Only)
                    </span>
                    <span className="text-[10px] uppercase tracking-wider">Confidence: {selectedTicket.ai_confidence || 90}%</span>
                  </div>
                  <p className="text-xs text-[hsl(var(--foreground))] italic">
                    &ldquo;{selectedTicket.ai_suggested_response}&rdquo;
                  </p>
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => setReplyText(selectedTicket.ai_suggested_response)}
                      className="text-xs text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> Use this draft
                    </button>
                  </div>
                </div>
              )}

              {/* Message Thread */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-lg text-xs space-y-1 ${
                      m.sender_type === "CUSTOMER"
                        ? "bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"
                        : "bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20 ml-6"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))]">
                      <span className="font-semibold uppercase">{m.sender_name || m.sender_type}</span>
                      <span>{new Date(m.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              {selectedTicket.status !== "RESOLVED" && selectedTicket.status !== "CLOSED" && (
                <div className="space-y-4 pt-4 border-t border-[hsl(var(--border))]">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Reply to Customer</label>
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your response..."
                      className="w-full p-3 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleSendReply}
                        disabled={processing || !replyText.trim()}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" /> Send Reply
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[hsl(var(--border))]">
                    <label className="text-xs font-semibold text-emerald-400">Resolve Ticket</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Resolution summary (e.g., Access link sent, bug report logged)..."
                        value={resolutionText}
                        onChange={(e) => setResolutionText(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]"
                      />
                      <button
                        onClick={handleResolve}
                        disabled={processing || !resolutionText.trim()}
                        className="px-4 py-2 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
