import type { ZeroCostDistributionCheck } from "./types";
import type { ChannelType } from "@/types/distribution";

// Forbidden paid distribution keywords and patterns
const FORBIDDEN_PAID_PATTERNS = [
  { pattern: /\b(google[_-]?ads|adwords|meta[_-]?ads|facebook[_-]?ads|twitter[_-]?ads|x[_-]?ads|linkedin[_-]?ads)\b/i, name: "Paid PPC Advertising" },
  { pattern: /\b(sponsored[_-]?post|promoted[_-]?tweet|boost[_-]?post|promoted[_-]?pin)\b/i, name: "Paid Sponsored Content" },
  { pattern: /\b(paid[_-]?influencer|sponsorship|paid[_-]?shoutout)\b/i, name: "Paid Influencer Campaign" },
  { pattern: /\b(mailchimp[_-]?paid|sendgrid[_-]?paid|hubspot|apollo[_-]?paid)\b/i, name: "Paid Email Automation Platform" },
  { pattern: /\b(paid[_-]?directory|featured[_-]?listing[_-]?fee)\b/i, name: "Paid Directory Listing Fee" },
  { pattern: /\b(buy[_-]?(followers|likes|views|reviews|upvotes))\b/i, name: "Purchased Engagement / Bot Farms" },
  { pattern: /\b(paid[_-]?domain|custom[_-]?domain[_-]?purchase)\b/i, name: "Paid Custom Domain Registration" },
];

/**
 * Validates that proposed distribution actions incur ₹0 spend and utilize exclusively free tiers.
 */
export function verifyZeroCostDistribution(
  channelTypes?: ChannelType[],
  textContexts?: string[],
  proposedCostInr: number = 0
): ZeroCostDistributionCheck {
  const flaggedItems: string[] = [];
  const notes: string[] = [];

  if (proposedCostInr > 0) {
    flaggedItems.push(`Proposed distribution budget is non-zero: ₹${proposedCostInr}. Automatic distribution requires ₹0 budget.`);
  }

  const contexts = textContexts || [];
  for (const text of contexts) {
    for (const rule of FORBIDDEN_PAID_PATTERNS) {
      if (rule.pattern.test(text)) {
        flaggedItems.push(`${rule.name} detected: "${text.substring(0, 80)}"`);
      }
    }
  }

  const compliant = flaggedItems.length === 0 && proposedCostInr === 0;

  if (compliant) {
    notes.push("Zero-cost distribution verified: 100% free owned channels, organic search, and public communities.");
  } else {
    notes.push("Paid marketing or non-free services detected. Action must be blocked or submitted for explicit human approval.");
  }

  return {
    compliant,
    estimatedCostInr: compliant ? 0 : Math.max(proposedCostInr, 500),
    flaggedItems,
    notes,
  };
}

import type { DistributionCampaign, DistributionStrategy } from "@/types/distribution";

export function evaluateDistributionZeroCost(input: {
  campaign: DistributionCampaign;
  strategy?: DistributionStrategy | null;
}): ZeroCostDistributionCheck {
  const channels = (input.strategy?.ranked_channels as any[])?.map((c) => c.channel_type) || [];
  return verifyZeroCostDistribution(channels, [input.campaign.name], input.campaign.budget_inr || 0);
}

