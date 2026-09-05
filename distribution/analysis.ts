import { distributionRepo } from "@/database/repositories/distribution-repo";
import { aggregateChannelMetrics } from "./metrics";
import type { ChannelType } from "@/types/distribution";
import type {
  ChannelPerformanceClassification,
  ChannelPerformanceEvaluation,
  CampaignAnalysisReport,
} from "./types";

/**
 * Evaluates performance for an individual distribution channel within a campaign.
 */
export async function evaluateChannelPerformance(
  campaignId: string,
  channelType: ChannelType,
  isDemo = false
): Promise<ChannelPerformanceEvaluation> {
  const aggregated = await aggregateChannelMetrics(campaignId, channelType, isDemo);

  const {
    impressions,
    clicks,
    visitors,
    signups,
    leads,
    cost_inr,
    ctr,
    signup_conversion_rate,
    lead_conversion_rate,
  } = aggregated;

  let classification: ChannelPerformanceClassification = "WEAK";
  let action_recommendation: ChannelPerformanceEvaluation["action_recommendation"] = "MAINTAIN";
  const learning_insights: string[] = [];

  const totalConversions = signups + leads;

  if (totalConversions >= 5 && (signup_conversion_rate >= 5 || lead_conversion_rate >= 5)) {
    classification = "WINNING";
    action_recommendation = "SCALE";
    learning_insights.push(`Strong conversion (${totalConversions} total). High audience-intent alignment.`);
  } else if (totalConversions >= 1) {
    classification = "PROMISING";
    action_recommendation = "MAINTAIN";
    learning_insights.push(`Encouraging engagement (${clicks} clicks, ${visitors} visitors, ${totalConversions} conversions). Maintain cadence.`);
  } else if (visitors >= 10 && totalConversions === 0) {
    classification = "ITERATE";
    action_recommendation = "ADJUST_COPY";
    learning_insights.push(`Decent traffic (${visitors} visitors) but zero conversions. Value proposition or landing page hook needs refinement.`);
  } else if (impressions >= 100 && clicks < 2) {
    classification = "STOP";
    action_recommendation = "STOP";
    learning_insights.push(`High exposure (${impressions} impressions) but near-zero clicks (${clicks} clicks). Low interest for this specific angle.`);
  } else {
    classification = "WEAK";
    action_recommendation = "MAINTAIN";
    learning_insights.push(`Limited sample size (${impressions} impressions, ${clicks} clicks). Continue gathering data before concluding.`);
  }

  return {
    channel_type: channelType,
    classification,
    total_impressions: impressions,
    total_clicks: clicks,
    total_visitors: visitors,
    total_signups: signups,
    total_leads: leads,
    click_through_rate: ctr,
    signup_conversion_rate,
    lead_conversion_rate,
    effort_rating: 2,
    cost_inr,
    learning_insights,
    action_recommendation,
  };
}

/**
 * Evaluates all active channels for a campaign, aggregates insights, and records summary.
 */
export async function analyzeCampaign(
  campaignId: string,
  isDemo = false
): Promise<CampaignAnalysisReport> {
  const campaign = await distributionRepo.getCampaign(campaignId);
  if (!campaign) {
    throw new Error(`Distribution campaign not found: ${campaignId}`);
  }

  let channelsToEvaluate: ChannelType[] = ["OWNED_WEBSITE", "GITHUB", "REDDIT"];
  if (campaign.strategy_id) {
    const strategy = await distributionRepo.getStrategy(campaign.strategy_id);
    if (strategy?.ranked_channels && Array.isArray(strategy.ranked_channels)) {
      channelsToEvaluate = (strategy.ranked_channels as any[]).map((c) => c.channel_type as ChannelType);
    }
  }

  const channelEvaluations: ChannelPerformanceEvaluation[] = [];

  for (const ch of channelsToEvaluate) {
    const evalResult = await evaluateChannelPerformance(campaignId, ch, isDemo);
    channelEvaluations.push(evalResult);
  }

  // Determine overall campaign classification
  let overallClassification: ChannelPerformanceClassification = "WEAK";
  if (channelEvaluations.some((e) => e.classification === "WINNING")) {
    overallClassification = "WINNING";
  } else if (channelEvaluations.some((e) => e.classification === "PROMISING")) {
    overallClassification = "PROMISING";
  } else if (channelEvaluations.some((e) => e.classification === "ITERATE")) {
    overallClassification = "ITERATE";
  } else if (channelEvaluations.every((e) => e.classification === "STOP")) {
    overallClassification = "STOP";
  }

  const recommendedNextActions: string[] = [];
  const winningChannels = channelEvaluations.filter((e) => e.classification === "WINNING").map((e) => e.channel_type);
  const iteratingChannels = channelEvaluations.filter((e) => e.classification === "ITERATE").map((e) => e.channel_type);
  const stopChannels = channelEvaluations.filter((e) => e.classification === "STOP").map((e) => e.channel_type);

  if (winningChannels.length > 0) {
    recommendedNextActions.push(`Scale content publication on winning channels: ${winningChannels.join(", ")}`);
  }
  if (iteratingChannels.length > 0) {
    recommendedNextActions.push(`Refine messaging copy and call-to-action on channels with traffic: ${iteratingChannels.join(", ")}`);
  }
  if (stopChannels.length > 0) {
    recommendedNextActions.push(`Pause publication on low-performing channels: ${stopChannels.join(", ")}`);
  }
  if (recommendedNextActions.length === 0) {
    recommendedNextActions.push("Continue controlled zero-cost publication schedule to collect baseline data.");
  }

  const summary = `Campaign ${campaign.name} evaluation: ${overallClassification}. Tested ${channelEvaluations.length} channels. Winning: ${winningChannels.length}, Promising: ${channelEvaluations.filter((e) => e.classification === "PROMISING").length}.`;

  const learnings = {
    evaluated_at: new Date().toISOString(),
    overall_classification: overallClassification,
    winning_channels: winningChannels,
    iterating_channels: iteratingChannels,
    stopped_channels: stopChannels,
  };

  // Persist analysis summary to campaign
  await distributionRepo.updateCampaign(campaignId, {
    learnings,
  });

  return {
    campaign_id: campaignId,
    overall_classification: overallClassification,
    channel_evaluations: channelEvaluations,
    summary,
    learnings,
    recommended_next_actions: recommendedNextActions,
  };
}
