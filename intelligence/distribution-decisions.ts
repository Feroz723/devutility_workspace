import { queryMany } from "@/database/client";
import { channelPerformanceEvaluator } from "./channel-performance";
import { stopRulesEvaluator } from "./stop-rules";
import type { PortfolioDecisionType, IntelligenceConfidence } from "./types";

export interface ChannelDecisionResult {
  channel_type: string;
  campaign_id?: string;
  decision: PortfolioDecisionType;
  confidence: IntelligenceConfidence;
  rationale: string;
  metrics: {
    traffic: number;
    leads: number;
    customers: number;
    revenue_inr: number;
    cost_inr: number;
  };
  recommended_next_step: string;
  requires_approval: boolean;
}

export class DistributionDecisionEngine {
  /**
   * Evaluate all distribution channels and generate actionable decisions
   */
  async evaluateChannels(isDemo: boolean = false): Promise<ChannelDecisionResult[]> {
    const campaigns = await queryMany<any>(
      `SELECT id, channel, campaign_name, status, clicks_count, conversions_count, spend_inr
       FROM campaigns
       WHERE is_demo = $1`,
      [isDemo]
    );

    const results: ChannelDecisionResult[] = [];

    // Also get distinct channels if any exist
    const distinctChannels = Array.from(new Set(campaigns.map((c) => c.channel || "DIRECT")));
    if (distinctChannels.length === 0) {
      distinctChannels.push("REDDIT", "DEVTO", "HACKERNEWS", "TWITTER", "DIRECT");
    }

    for (const channel of distinctChannels) {
      const perf = await channelPerformanceEvaluator.evaluateChannel(channel, undefined, isDemo);
      const stopEval = stopRulesEvaluator.evaluateChannelStopRules(perf);

      let decision: PortfolioDecisionType = "MAINTAIN";
      let rationale = "";
      let nextStep = "";
      let confidence: IntelligenceConfidence = "LOW";

      if (perf.performance_tier === "INSUFFICIENT_DATA") {
        decision = "RESEARCH_MORE";
        confidence = "INSUFFICIENT_DATA";
        rationale = "Insufficient traffic to establish baseline conversion efficacy.";
        nextStep = "Publish 1-2 additional high-value informational content pieces to gather baseline metrics.";
      } else if (stopEval.isStopCandidate) {
        decision = "STOP";
        confidence = "HIGH";
        rationale = stopEval.rationale;
        nextStep = "Cease distribution posts to this channel and reallocate attention to top performing channels.";
      } else if (perf.performance_tier === "SCALE") {
        decision = "SCALE";
        confidence = "HIGH";
        rationale = `High conversion efficiency: ${perf.qualified_leads_count} qualified leads and ₹${perf.revenue_inr} revenue generated.`;
        nextStep = "Increase distribution frequency and test new content formats on this channel.";
      } else if (perf.performance_tier === "ITERATE") {
        decision = "ITERATE";
        confidence = "MEDIUM";
        rationale = "Visitors are landing, but lead conversion requires value proposition tightening.";
        nextStep = "Update post call-to-action copy and landing page headline alignment.";
      } else if (perf.performance_tier === "PAUSE") {
        decision = "PAUSE";
        confidence = "MEDIUM";
        rationale = stopEval.rationale;
        nextStep = "Pause outbound campaigns for 14 days before attempting re-engagement.";
      } else {
        decision = "MAINTAIN";
        confidence = "MEDIUM";
        rationale = "Channel performing within acceptable baseline parameters.";
        nextStep = "Continue scheduled recurring cadence.";
      }

      results.push({
        channel_type: channel,
        decision,
        confidence,
        rationale,
        metrics: {
          traffic: perf.traffic_count,
          leads: perf.qualified_leads_count,
          customers: perf.customers_count,
          revenue_inr: perf.revenue_inr,
          cost_inr: perf.cost_inr,
        },
        recommended_next_step: nextStep,
        requires_approval: decision === "STOP",
      });
    }

    return results;
  }
}

export const distributionDecisionEngine = new DistributionDecisionEngine();
