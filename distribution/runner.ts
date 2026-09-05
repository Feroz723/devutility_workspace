import { distributionRepo } from "@/database/repositories/distribution-repo";
import { productRepo } from "@/database/repositories/product-repo";
import { logAudit } from "@/database/repositories/audit-repo";
import { prepareCampaignAssets } from "./assets";
import { evaluateDistributionZeroCost } from "./guard";
import { checkAntiSpamRules } from "./safety";
import { getChannelAdapter } from "./adapters";
import { getChannelCapability } from "./capabilities";
import type {
  DistributionCampaign,
  DistributionQueueItem,
  DistributionAsset,
  ChannelType,
} from "@/types/distribution";
import type { RunnerOptions, RunnerResult } from "./types";

/**
 * Autonomous Distribution Runner
 * Safely prepares, validates, queues, and executes zero-cost customer acquisition actions.
 */
export async function runDistributionPipeline(
  options: RunnerOptions
): Promise<RunnerResult> {
  const { campaign_id } = options;

  // 1. Fetch Campaign
  const campaign = await distributionRepo.getCampaign(campaign_id);
  if (!campaign) {
    return {
      success: false,
      campaign_id,
      status: "DRAFT",
      assets_prepared: 0,
      actions_queued: 0,
      manual_actions_required: 0,
      auto_published: 0,
      message: `Distribution campaign not found: ${campaign_id}`,
      error: "CAMPAIGN_NOT_FOUND",
    };
  }

  // 2. Fetch Associated Product
  const product = await productRepo.findById(campaign.product_id);
  if (!product) {
    return {
      success: false,
      campaign_id,
      status: campaign.status,
      assets_prepared: 0,
      actions_queued: 0,
      manual_actions_required: 0,
      auto_published: 0,
      message: `Associated product not found: ${campaign.product_id}`,
      error: "PRODUCT_NOT_FOUND",
    };
  }

  // 3. Fetch Strategy if linked
  let strategy = null;
  if (campaign.strategy_id) {
    strategy = await distributionRepo.getStrategy(campaign.strategy_id);
  }

  // 4. Zero-Cost Pre-Flight Guard
  const zeroCostCheck = evaluateDistributionZeroCost({
    campaign,
    strategy,
  });

  if (!zeroCostCheck.compliant) {
    await distributionRepo.updateCampaign(campaign_id, {
      status: "PAUSED",
    });

    await logAudit({
      entity_type: "distribution_campaign",
      entity_id: campaign_id,
      action: "ZERO_COST_VIOLATION_BLOCKED",
      details: {
        flaggedItems: zeroCostCheck.flaggedItems,
        estimatedCost: zeroCostCheck.estimatedCostInr,
      },
    }).catch(() => null);

    return {
      success: false,
      campaign_id,
      status: "PAUSED",
      assets_prepared: 0,
      actions_queued: 0,
      manual_actions_required: 0,
      auto_published: 0,
      message: `Zero-cost distribution guard failed: ${zeroCostCheck.flaggedItems.join(", ")}`,
      error: "ZERO_COST_VIOLATION",
    };
  }

  // 5. Assets Preparation (if not already prepared)
  const existingAssets = await distributionRepo.listAssets({
    campaign_id,
    is_demo: campaign.is_demo ?? false,
  });

  let assetsPreparedCount = existingAssets.length;
  let actionsQueuedCount = 0;

  if (existingAssets.length === 0) {
    const prepResult = await prepareCampaignAssets({
      campaign,
      product,
      strategy,
    });
    assetsPreparedCount = prepResult.assets.length;
    actionsQueuedCount = prepResult.queueItems.length;

    await logAudit({
      entity_type: "distribution_campaign",
      entity_id: campaign_id,
      action: "DISTRIBUTION_ASSETS_GENERATED",
      details: {
        count: prepResult.assets.length,
      },
    }).catch(() => null);
  }

  // 6. Process Queue Items
  const { items: pendingItems } = await distributionRepo.listQueueItems({
    campaign_id,
    status: "APPROVED",
  });

  let manualActionsCount = 0;
  let autoPublishedCount = 0;

  for (const item of pendingItems) {
    const asset = item.asset_id
      ? await distributionRepo.getAsset(item.asset_id)
      : null;

    if (!asset) continue;

    const channel = await distributionRepo.getChannel(item.channel_id);
    const channelType: ChannelType = channel ? channel.channel_type : "OWNED_WEBSITE";

    const capability = getChannelCapability(channelType);
    const adapter = getChannelAdapter(channelType);

    // Anti-spam and frequency check
    const antiSpam = checkAntiSpamRules({
      channel_type: channelType,
      title: asset.title,
      body: asset.body,
      hourly_count: 0,
      daily_count: 0,
      hourly_limit: capability.hourly_action_limit,
      daily_limit: capability.daily_action_limit,
      recent_hashes: [],
    });

    if (!antiSpam.passed) {
      await distributionRepo.updateQueueItem(item.id, {
        status: "CANCELLED",
        error_message: `Anti-spam check failed: ${antiSpam.reasons.join("; ")}`,
      });
      continue;
    }

    // Check adapter connection status
    const conn = await adapter.testConnection();

    if (!conn.connected || capability.manual_setup_required || capability.automation_capability === "MANUAL") {
      // Mark as manual action required
      await distributionRepo.updateQueueItem(item.id, {
        status: "REQUIRES_MANUAL_ACTION",
        manual_action_required: conn.message,
      });
      manualActionsCount++;
      continue;
    }

    // If channel is fully automated and connected
    try {
      const pubResult = await adapter.publish(item, asset);

      if (pubResult.success) {
        // Record publication
        await distributionRepo.createPublication({
          campaign_id,
          queue_id: item.id,
          asset_id: asset.id,
          channel_id: item.channel_id,
          external_publication_id: pubResult.external_id ?? null,
          external_url: pubResult.external_url ?? null,
          status: "PUBLISHED",
          metadata: {
            title: asset.title,
            channel_type: channelType,
          },
          is_demo: campaign.is_demo ?? false,
        });

        // Mark queue item published
        await distributionRepo.updateQueueItem(item.id, {
          status: "PUBLISHED",
          published_at: new Date().toISOString(),
        });

        autoPublishedCount++;

        await logAudit({
          entity_type: "distribution_publication",
          entity_id: item.id,
          action: "DISTRIBUTION_ACTION_EXECUTED",
          details: {
            channel_type: channelType,
            url: pubResult.external_url,
          },
        }).catch(() => null);
      } else {
        await distributionRepo.updateQueueItem(item.id, {
          status: pubResult.requires_manual_action ? "REQUIRES_MANUAL_ACTION" : "FAILED",
          error_message: pubResult.error || "Publication failed",
        });

        if (pubResult.requires_manual_action) {
          manualActionsCount++;
        }
      }
    } catch (err) {
      await distributionRepo.updateQueueItem(item.id, {
        status: "FAILED",
        error_message: err instanceof Error ? err.message : "Unknown error during publication",
      });
    }
  }

  // 7. Update Campaign Status
  let newStatus = campaign.status;
  if (campaign.status === "DRAFT" || campaign.status === "APPROVED") {
    newStatus = "RUNNING";
  }

  await distributionRepo.updateCampaign(campaign_id, {
    status: newStatus,
  });

  return {
    success: true,
    campaign_id,
    status: newStatus,
    assets_prepared: assetsPreparedCount,
    actions_queued: actionsQueuedCount,
    manual_actions_required: manualActionsCount,
    auto_published: autoPublishedCount,
    message: `Distribution pipeline processed successfully. ${assetsPreparedCount} assets prepared, ${autoPublishedCount} auto-published, ${manualActionsCount} manual actions pending.`,
  };
}
