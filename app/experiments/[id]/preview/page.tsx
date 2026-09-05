"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShieldCheck, Zap, Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Experiment } from "@/types/experiment";
import { generateLandingPageData } from "@/experiments/landing-generator";
import type { LandingPageData } from "@/experiments/types";

export default function ExperimentPreviewPage() {
  const params = useParams();
  const id = params.id as string;

  const [exp, setExp] = useState<Experiment | null>(null);
  const [landing, setLanding] = useState<LandingPageData | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExperiment() {
      try {
        const res = await fetch(`/api/experiments/${id}`);
        if (res.ok) {
          const data = await res.json();
          setExp(data);
          setLanding(generateLandingPageData(data));

          // Track 1 page view metric on local preview
          await fetch(`/api/experiments/${id}/metrics`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              metric_name: "views",
              metric_value: 1,
              source: "WEBSITE",
            }),
          });
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchExperiment();
  }, [id]);

  async function handleWaitlistSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/experiments/${id}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "landing_page_preview" }),
      });
      const data = await res.json();
      setSubmitted(true);
      setMessage(data.message || "Thank you for joining the early access waitlist!");
    } catch {
      setMessage("Network error submitting waitlist request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCtaClick() {
    try {
      await fetch(`/api/experiments/${id}/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metric_name: "clicks",
          metric_value: 1,
          source: "WEBSITE",
        }),
      });
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[hsl(var(--muted-foreground))]">
        Loading preview...
      </div>
    );
  }
  if (!exp || !landing) {
    return (
      <div className="py-20 text-center text-[hsl(var(--muted-foreground))]">
        Experiment not found.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      {/* Top Banner indicating local test environment */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
        <Link
          href={`/experiments/${id}`}
          className="text-[hsl(var(--primary))] hover:underline flex items-center gap-1 font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Experiment Control
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded bg-emerald-500/10 text-emerald-400 px-2 py-0.5 font-mono text-[10px] border border-emerald-500/20">
            Preview Mode (₹0 Spend Verified)
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-gradient-to-b from-[hsl(var(--card))] to-[hsl(var(--background))] p-8 sm:p-12 text-center space-y-6 shadow-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
          <Sparkles className="h-3.5 w-3.5" />
          {landing.tool_type.replace(/_/g, " ")}
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          {landing.headline}
        </h1>

        <p className="text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed">
          {landing.subheadline}
        </p>

        {/* Problem Callout Box */}
        <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-left max-w-xl mx-auto space-y-1 text-xs">
          <span className="font-semibold text-amber-400 uppercase tracking-wider text-[10px]">
            The Problem:
          </span>
          <p className="text-zinc-300 leading-relaxed">{landing.problem_callout}</p>
        </div>

        {/* Value Prop Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto text-left pt-2 text-xs">
          {landing.solution_highlights.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2 text-zinc-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* Waitlist / CTA Conversion Box */}
        <div className="pt-6 max-w-md mx-auto">
          {submitted ? (
            <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-semibold text-white">{message}</p>
              <p className="text-xs text-zinc-400">
                A signup metric has been recorded in the experiment dashboard.
              </p>
            </div>
          ) : (
            <form onSubmit={handleWaitlistSubmit} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  required
                  placeholder="Enter your email for early access..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 rounded-lg border border-[hsl(var(--border))] bg-zinc-900 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                />
                <Button
                  type="submit"
                  disabled={submitting}
                  onClick={handleCtaClick}
                  className="bg-[hsl(var(--primary))] text-white text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? "Joining..." : landing.cta_text}
                </Button>
              </div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                {landing.delivery_note}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
