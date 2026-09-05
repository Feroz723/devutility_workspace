import { distributionRepo } from "@/database/repositories/distribution-repo";
import { analyzeCampaign } from "./analysis";
import type { ChannelType } from "@/types/distribution";
import type { CampaignAnalysisReport } from "./types";

export interface ChannelWeightAdjustment {
  channel_type: ChannelType;
  previous_weight: number;
  new_weight: number;
  reason: string;
}

export interface ProductIterationSignal {
  category: "HOOK_MISMATCH" | "LOW_TRUST" | "PRICING_CLARITY" | "FEATURE_GAP";
  channel_type: ChannelType;
  severity: "LOW" | "MEDIUM" | "HIGH";
  observation: string;
  recommended_product_action: string;
}

export interface OptimizationResult {
  campaign_id: string;
  adjustments: ChannelWeightAdjustment[];
  iteration_signals: ProductIterationSignal[];
  updated_channel_priorities: Array<{ channel_type: ChannelType; priority: number }>;
}

/**
 * Optimizes distribution strategy weights and detects product feedback signals
 * based on real campaign performance.
 */
export async function optimizeCampaignStrategy(
  campaignId: string,
  isDemo = false
): Promise<OptimizationResult> {
  const report: CampaignAnalysisReport = await analyzeCampaign(campaignId, isDemo);
  const adjustments: ChannelWeightAdjustment[] = [];
  const iteration_signals: ProductIterationSignal[] = [];

  for (const evalItem of report.channel_evaluations) {
    let weightDelta = 0;
    let reason = "Maintaining baseline weight";

    switch (evalItem.classification) {
      case "WINNING":
        weightDelta = +25;
        reason = "High conversion rate and active user acquisition";
        break;
      case "PROMISING":
        weightDelta = +10;
        reason = "Positive engagement and steady traffic";
        break;
      case "ITERATE":
        weightDelta = -5;
        reason = "Traffic received but conversions lagging";
        iteration_signals.push({
          category: "HOOK_MISMATCH",
          channel_type: evalItem.channel_type,
          severity: "MEDIUM",
          observation: `Channel ${evalItem.channel_type} had ${evalItem.total_visitors} visits but 0 signups/leads.`,
          recommended_product_action: "Clarify the immediate above-the-fold value proposition and reduce friction.",
        });
        break;
      case "WEAK":
        weightDelta = -10;
        reason = "Low reach or engagement in recent period";
        break;
      case "STOP":
        weightDelta = -30;
        reason = "Extremely low response or user rejection";
        iteration_signals.push({
          category: "LOW_TRUST",
          channel_type: evalItem.channel_type,
          severity: "LOW",
          observation: `Audience on ${evalItem.channel_type} did not engage with current messaging angles.`,
          recommended_product_action: "Deprioritize this channel and focus on channels with existing traction.",
        });
        break;
    }

    adjustments.push({
      channel_type: evalItem.channel_type,
      previous_weight: 50,
      new_weight: Math.max(5, Math.min(100, 50 + weightDelta)),
      reason,
    });
  }

  // Sort updated channel priorities
  const updated_channel_priorities = [...adjustments]
    .sort((a, b) => b.new_weight - a.new_weight)
    .map((adj, index) => ({
      channel_type: adj.channel_type,
      priority: index + 1,
    }));

  return {
    campaign_id: campaignId,
    adjustments,
    iteration_signals,
    updated_channel_priorities,
  };
}
