import type { Product } from "@/types/product";
import type { Experiment } from "@/types/experiment";
import type { Opportunity } from "@/types/opportunity";
import type { ChannelType } from "@/types/distribution";
import type {
  RankedChannelEvaluation,
  DistributionStrategyPlan,
} from "./types";
import { CHANNEL_CAPABILITIES } from "./capabilities";
import { verifyZeroCostDistribution } from "./guard";

const CANDIDATE_CHANNELS: ChannelType[] = [
  "OWNED_WEBSITE",
  "SEO",
  "GITHUB",
  "GITHUB_DISCUSSIONS",
  "REDDIT",
  "HACKER_NEWS",
  "PRODUCT_DIRECTORY",
  "COMMUNITY",
  "BLOG",
  "LINKEDIN",
  "X",
  "MANUAL_OUTREACH",
];

/**
 * Generates a deterministic, ranked distribution strategy for a ready product.
 */
export function generateDistributionStrategy(
  product: Product,
  experiment?: Experiment | null,
  opportunity?: Opportunity | null,
  channelPerformanceHistory?: Record<string, { conversions: number; effort: number }>
): DistributionStrategyPlan {
  const targetAudience =
    (opportunity as any)?.target_customer ||
    (opportunity as any)?.target_audience ||
    experiment?.target_customer ||
    "Developers, creators, and professionals seeking efficient daily tools";

  const coreProblem =
    product.problem ||
    (opportunity as any)?.problem_statement ||
    experiment?.problem ||
    "Lack of automated, zero-cost lightweight utilities";

  const valueHook =
    product.value_proposition ||
    product.description ||
    "Instant, free, browser-based solution with zero setup friction.";

  const textContext = `${product.name} ${product.product_type} ${targetAudience} ${coreProblem}`.toLowerCase();
  const isDeveloperFocused =
    textContext.includes("developer") ||
    textContext.includes("code") ||
    textContext.includes("git") ||
    textContext.includes("cli") ||
    textContext.includes("api") ||
    product.product_type === "DEVELOPER_TOOL";

  const isSEOFocused =
    product.product_type === "FREE_TOOL" ||
    textContext.includes("calculator") ||
    textContext.includes("converter") ||
    textContext.includes("generator");

  const ranked: RankedChannelEvaluation[] = [];

  for (const chType of CANDIDATE_CHANNELS) {
    const cap = CHANNEL_CAPABILITIES[chType];
    if (!cap) continue;

    let audienceFit = 50;
    let problemIntent = 50;
    let reachPotential = 60;
    let competition = 60;
    let effort = 50;
    let learningValue = 70;
    let reason = "Solid general distribution channel.";

    switch (chType) {
      case "OWNED_WEBSITE":
        audienceFit = 95;
        problemIntent = 95;
        reachPotential = 50;
        competition = 10;
        effort = 10;
        learningValue = 95;
        reason = "Owned foundation: direct conversions, telemetry, and zero third-party platform dependency.";
        break;

      case "SEO":
        audienceFit = isSEOFocused ? 95 : 70;
        problemIntent = 95;
        reachPotential = 90;
        competition = 70;
        effort = 25;
        learningValue = 85;
        reason = "High intent search traffic seeking solutions to the exact validated problem.";
        break;

      case "GITHUB":
        audienceFit = isDeveloperFocused ? 95 : 40;
        problemIntent = isDeveloperFocused ? 85 : 30;
        reachPotential = 75;
        competition = 50;
        effort = 35;
        learningValue = 80;
        reason = isDeveloperFocused
          ? "Primary habitat for developer tools with stars, releases, and organic discovery."
          : "Secondary channel for open technical documentation.";
        break;

      case "GITHUB_DISCUSSIONS":
        audienceFit = isDeveloperFocused ? 85 : 35;
        problemIntent = 60;
        reachPotential = 50;
        competition = 30;
        effort = 30;
        learningValue = 75;
        reason = "High engagement community discussions for technical feedback.";
        break;

      case "HACKER_NEWS":
        audienceFit = isDeveloperFocused ? 90 : 60;
        problemIntent = 70;
        reachPotential = 95;
        competition = 85;
        effort = 40;
        learningValue = 90;
        reason = "Show HN provides immense initial burst of high-quality early tech adopters.";
        break;

      case "REDDIT":
        audienceFit = 80;
        problemIntent = 75;
        reachPotential = 85;
        competition = 70;
        effort = 60;
        learningValue = 85;
        reason = "Niche subreddits actively discussing the validated problem.";
        break;

      case "PRODUCT_DIRECTORY":
        audienceFit = 75;
        problemIntent = 80;
        reachPotential = 65;
        competition = 50;
        effort = 30;
        learningValue = 65;
        reason = "Free software directories providing continuous baseline referral traffic.";
        break;

      case "COMMUNITY":
        audienceFit = isDeveloperFocused ? 80 : 50;
        problemIntent = 65;
        reachPotential = 60;
        competition = 40;
        effort = 45;
        learningValue = 70;
        reason = "Technical publication forums (Dev.to, Hashnode) with canonical backlinking.";
        break;

      case "BLOG":
        audienceFit = 70;
        problemIntent = 80;
        reachPotential = 55;
        competition = 30;
        effort = 30;
        learningValue = 75;
        reason = "Educational long-form breakdown establishing topic authority.";
        break;

      case "LINKEDIN":
        audienceFit = isDeveloperFocused ? 60 : 80;
        problemIntent = 50;
        reachPotential = 70;
        competition = 60;
        effort = 50;
        learningValue = 65;
        reason = "Professional distribution targeting SMB operators and workflow leads.";
        break;

      case "X":
        audienceFit = isDeveloperFocused ? 85 : 65;
        problemIntent = 55;
        reachPotential = 80;
        competition = 75;
        effort = 40;
        learningValue = 75;
        reason = "Rapid distribution of visual demos, code snippets, and release announcements.";
        break;

      case "MANUAL_OUTREACH":
        audienceFit = 85;
        problemIntent = 85;
        reachPotential = 30;
        competition = 20;
        effort = 70;
        learningValue = 95;
        reason = "1-to-1 conversations yielding qualitative user signals and testimonials.";
        break;
    }

    // Factor in historical conversion data if available
    if (channelPerformanceHistory && channelPerformanceHistory[chType]) {
      const hist = channelPerformanceHistory[chType];
      if (hist.conversions > 5) audienceFit = Math.min(100, audienceFit + 10);
      if (hist.conversions === 0) audienceFit = Math.max(20, audienceFit - 15);
    }

    // Weighted formula:
    // Total = audience_fit * 0.25 + problem_intent * 0.20 + reach * 0.15 + (100 - comp) * 0.10 + (100 - effort) * 0.10 + learning * 0.20
    const totalScore = Math.round(
      audienceFit * 0.25 +
        problemIntent * 0.2 +
        reachPotential * 0.15 +
        (100 - competition) * 0.1 +
        (100 - effort) * 0.1 +
        learningValue * 0.2
    );

    ranked.push({
      channel_type: chType,
      platform: cap.platform,
      name: cap.name,
      total_score: totalScore,
      priority: 0, // Assigned after sorting
      audience_fit: audienceFit,
      problem_intent: problemIntent,
      reach_potential: reachPotential,
      competition,
      effort,
      cost_inr: 0,
      automation_level: cap.automation_capability,
      approval_required: cap.approval_required,
      learning_value: learningValue,
      recommended_content_types: cap.supported_content_types.slice(0, 3),
      frequency_limit: `${cap.daily_action_limit}/day, max ${cap.hourly_action_limit}/hr`,
      selection_reason: reason,
    });
  }

  // Sort descending by total score
  ranked.sort((a, b) => b.total_score - a.total_score);

  // Assign priority ranks (1, 2, 3...)
  ranked.forEach((item, index) => {
    item.priority = index + 1;
  });

  const zeroCostCheck = verifyZeroCostDistribution(
    ranked.map((r) => r.channel_type),
    [coreProblem, valueHook],
    0
  );

  return {
    product_id: product.id,
    target_audience: targetAudience,
    core_problem: coreProblem,
    value_hook: valueHook,
    ranked_channels: ranked,
    estimated_total_cost_inr: 0,
    approval_boundary_notes: [
      "Owned Website and SEO are 100% automated and safe to publish immediately.",
      "Third-party community posts (Reddit, HN, GitHub Discussions) require explicit human approval.",
      "Direct outreach is strictly 1-to-1 with zero bulk automation.",
    ],
    zero_cost_verified: zeroCostCheck.compliant,
  };
}
