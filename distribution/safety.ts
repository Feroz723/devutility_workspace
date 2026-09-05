import crypto from "crypto";
import type { AntiSpamCheckResult } from "./types";
import type { ChannelType } from "@/types/distribution";
import { getChannelCapability } from "./capabilities";
import { logAudit } from "@/database/repositories/audit-repo";

export interface AntiSpamCheckOptions {
  channel_type: ChannelType;
  content: string;
  previousContentHashes?: string[];
  currentDailyActionCount?: number;
  currentHourlyActionCount?: number;
  targetCommunityName?: string;
  auditEntityId?: string;
}

/**
 * Evaluates distribution content against spam, rate-limiting, and community manipulation rules.
 */
export async function evaluateDistributionSafety(
  options: AntiSpamCheckOptions
): Promise<AntiSpamCheckResult> {
  const {
    channel_type,
    content,
    previousContentHashes = [],
    currentDailyActionCount = 0,
    currentHourlyActionCount = 0,
    auditEntityId,
  } = options;

  const reasons: string[] = [];
  const blocked_actions: string[] = [];
  let riskScore = 0;

  // 1. Compute deterministic content hash
  const normalizedText = content.toLowerCase().replace(/\s+/g, " ").trim();
  const contentHash = crypto.createHash("sha256").update(normalizedText).digest("hex");

  // 2. Duplicate Content Detection
  if (previousContentHashes.includes(contentHash)) {
    riskScore += 80;
    reasons.push("Duplicate content detected: identical post already queued or published.");
    blocked_actions.push("DUPLICATE_CONTENT_BLOCKED");
  }

  // 3. Rate Limit Checks
  const cap = getChannelCapability(channel_type);
  if (currentDailyActionCount >= cap.daily_action_limit) {
    riskScore += 90;
    reasons.push(`Daily action limit (${cap.daily_action_limit}) reached for channel ${channel_type}.`);
    blocked_actions.push("DAILY_RATE_LIMIT_EXCEEDED");
  }

  if (currentHourlyActionCount >= cap.hourly_action_limit) {
    riskScore += 70;
    reasons.push(`Hourly action limit (${cap.hourly_action_limit}) reached for channel ${channel_type}.`);
    blocked_actions.push("HOURLY_RATE_LIMIT_EXCEEDED");
  }

  // 4. Low-effort link drops / spam patterns
  const urlMatches = content.match(/https?:\/\/[^\s]+/g) || [];
  if (urlMatches.length > 3) {
    riskScore += 40;
    reasons.push("Excessive external links detected in post body (> 3 links).");
  }

  if (content.length < 50 && urlMatches.length > 0) {
    riskScore += 50;
    reasons.push("Low-effort link drop detected (content under 50 characters with link).");
    blocked_actions.push("LOW_EFFORT_LINK_DROP");
  }

  // 5. Deceptive / Scam / Engagement Bait triggers
  const scamPatterns = [
    /\b(guaranteed\s+passive\s+income|100%\s+free\s+money|get\s+rich\s+quick)\b/i,
    /\b(buy\s+upvotes|upvote\s+for\s+upvote|follow\s+for\s+follow|sub4sub)\b/i,
    /\b(act\s+now\s+or\s+miss\s+out|limited\s+time\s+secret)\b/i,
  ];

  for (const pat of scamPatterns) {
    if (pat.test(content)) {
      riskScore += 95;
      reasons.push("Deceptive marketing or engagement bait pattern detected.");
      blocked_actions.push("DECEPTIVE_CLAIMS_BLOCKED");
      break;
    }
  }

  const passed = riskScore < 50 && blocked_actions.length === 0;

  // Log audit if blocked
  if (!passed && auditEntityId) {
    await logAudit({
      entity_type: "distribution_queue",
      entity_id: auditEntityId,
      action: "DISTRIBUTION_ACTION_BLOCKED",
      details: {
        channel_type,
        risk_score: riskScore,
        reasons,
        blocked_actions,
      },
    }).catch(() => null);
  }

  return {
    passed,
    risk_score: Math.min(100, riskScore),
    reasons,
    blocked_actions,
    content_hash: contentHash,
  };
}

export function checkAntiSpamRules(options: {
  channel_type: ChannelType;
  title?: string | null;
  body?: string;
  hourly_count?: number;
  daily_count?: number;
  hourly_limit?: number;
  daily_limit?: number;
  recent_hashes?: string[];
}): AntiSpamCheckResult {
  const content = `${options.title || ""} ${options.body || ""}`;
  const normalizedText = content.toLowerCase().replace(/\s+/g, " ").trim();
  const contentHash = crypto.createHash("sha256").update(normalizedText).digest("hex");
  const reasons: string[] = [];
  const blocked_actions: string[] = [];
  let riskScore = 0;

  if (options.recent_hashes && options.recent_hashes.includes(contentHash)) {
    riskScore += 80;
    reasons.push("Duplicate content detected: identical post was recently published.");
    blocked_actions.push("DUPLICATE_CONTENT");
  }

  const cap = getChannelCapability(options.channel_type);
  const dailyLimit = options.daily_limit ?? cap.daily_action_limit;
  const hourlyLimit = options.hourly_limit ?? cap.hourly_action_limit;

  if ((options.daily_count ?? 0) >= dailyLimit) {
    riskScore += 90;
    reasons.push(`Daily action limit reached (${dailyLimit}).`);
    blocked_actions.push("DAILY_LIMIT_EXCEEDED");
  }

  if ((options.hourly_count ?? 0) >= hourlyLimit) {
    riskScore += 70;
    reasons.push(`Hourly action limit reached (${hourlyLimit}).`);
    blocked_actions.push("HOURLY_LIMIT_EXCEEDED");
  }

  return {
    passed: riskScore < 50,
    risk_score: Math.min(100, riskScore),
    reasons,
    blocked_actions,
    content_hash: contentHash,
  };
}

