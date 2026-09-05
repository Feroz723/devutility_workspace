import crypto from "crypto";
import type { QueueStatus } from "@/types/distribution";

export interface QueueTransitionResult {
  valid: boolean;
  from: QueueStatus;
  to: QueueStatus;
  error?: string;
}

const QUEUE_TRANSITIONS: Record<QueueStatus, QueueStatus[]> = {
  DRAFT: ["READY_FOR_REVIEW", "CANCELLED", "BLOCKED"],
  READY_FOR_REVIEW: ["APPROVED", "CANCELLED", "BLOCKED", "REQUIRES_MANUAL_ACTION"],
  APPROVED: ["SCHEDULED", "PUBLISHING", "CANCELLED", "REQUIRES_MANUAL_ACTION"],
  SCHEDULED: ["PUBLISHING", "CANCELLED", "REQUIRES_MANUAL_ACTION"],
  PUBLISHING: ["PUBLISHED", "FAILED", "REQUIRES_MANUAL_ACTION"],
  PUBLISHED: [], // Terminal
  FAILED: ["READY_FOR_REVIEW", "CANCELLED"], // Allows retry
  CANCELLED: [], // Terminal
  BLOCKED: ["DRAFT", "CANCELLED"],
  REQUIRES_MANUAL_ACTION: ["PUBLISHED", "CANCELLED", "FAILED"],
};

/**
 * Validates whether a state transition in the distribution queue is permitted.
 */
export function validateQueueTransition(from: QueueStatus, to: QueueStatus): QueueTransitionResult {
  if (from === to) return { valid: true, from, to };

  const allowed = QUEUE_TRANSITIONS[from] || [];
  if (allowed.includes(to)) {
    return { valid: true, from, to };
  }

  return {
    valid: false,
    from,
    to,
    error: `Invalid queue transition from '${from}' to '${to}'. Allowed: ${allowed.join(", ") || "none"}.`,
  };
}

/**
 * Generates a deterministic idempotency key for distribution actions.
 */
export function generateQueueIdempotencyKey(
  campaignId: string,
  channelId: string,
  assetId: string,
  scheduledTime?: string | null
): string {
  const raw = `${campaignId}_${channelId}_${assetId}_${scheduledTime || "now"}`;
  return "idemp_" + crypto.createHash("sha256").update(raw).digest("hex").substring(0, 24);
}

import { distributionRepo } from "@/database/repositories/distribution-repo";
import type { DistributionAsset, DistributionQueueItem, ChannelType } from "@/types/distribution";
import type { ChannelCapabilityInfo } from "./types";

export async function createQueueItemFromAsset(options: {
  campaignId: string;
  asset: DistributionAsset;
  channelType: ChannelType;
  channelId?: string | null;
  capability: ChannelCapabilityInfo;
  requiresApproval?: boolean;
}): Promise<DistributionQueueItem> {
  const { campaignId, asset, channelType, channelId, capability, requiresApproval } = options;
  const idempotencyKey = generateQueueIdempotencyKey(campaignId, channelId || channelType, asset.id);

  let initialStatus: QueueStatus = "READY_FOR_REVIEW";
  let manualAction: string | null = null;

  if (requiresApproval || capability.approval_required) {
    initialStatus = "READY_FOR_REVIEW";
  } else if (capability.automation_capability === "MANUAL" || capability.manual_setup_required) {
    initialStatus = "REQUIRES_MANUAL_ACTION";
    manualAction = `Manual setup or review required for ${channelType}`;
  } else {
    initialStatus = "APPROVED";
  }

  let targetChannelId = channelId;
  if (!targetChannelId) {
    const ch = await distributionRepo.getChannelByType(channelType);
    if (ch) {
      targetChannelId = ch.id;
    } else {
      const created = await distributionRepo.createChannel({
        name: capability.name,
        channel_type: channelType,
        platform: capability.platform,
        status: "active",
        automation_capability: capability.automation_capability,
      });
      targetChannelId = created.id;
    }
  }

  return await distributionRepo.createQueueItem({
    campaign_id: campaignId,
    channel_id: targetChannelId,
    asset_id: asset.id,
    status: initialStatus,
    idempotency_key: idempotencyKey,
    manual_action_required: manualAction,
    is_demo: asset.is_demo,
  });
}

