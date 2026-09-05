import { distributionRepo } from "@/database/repositories/distribution-repo";
import { generateContentAsset } from "./content-engine";
import { buildTrackedUrl } from "./attribution";
import { getChannelCapability } from "./capabilities";
import { createQueueItemFromAsset } from "./queue";
import type { Product } from "@/types/product";
import type { Experiment } from "@/types/experiment";
import type { Opportunity } from "@/types/opportunity";
import type {
  DistributionCampaign,
  DistributionStrategy,
  DistributionAsset,
  DistributionQueueItem,
  DistributionChannel,
  ChannelType,
} from "@/types/distribution";
import type { GeneratedContentAsset } from "./types";

export interface PrepareCampaignAssetsInput {
  campaign: DistributionCampaign;
  product: Product;
  strategy?: DistributionStrategy | null;
  experiment?: Experiment | null;
  opportunity?: Opportunity | null;
  baseUrl?: string;
}

export interface PreparedAssetsResult {
  assets: DistributionAsset[];
  queueItems: DistributionQueueItem[];
  warnings: string[];
}

/**
 * Prepares content assets and queue items for a distribution campaign
 * based on the chosen strategy channels and product specifications.
 */
export async function prepareCampaignAssets(
  input: PrepareCampaignAssetsInput
): Promise<PreparedAssetsResult> {
  const { campaign, product, strategy, experiment, opportunity, baseUrl } = input;
  const warnings: string[] = [];
  const createdAssets: DistributionAsset[] = [];
  const createdQueueItems: DistributionQueueItem[] = [];

  // Determine channels to generate assets for
  let channelsToTarget: ChannelType[] = [];
  if (strategy?.ranked_channels && Array.isArray(strategy.ranked_channels)) {
    channelsToTarget = (strategy.ranked_channels as any[]).map((c) => c.channel_type as ChannelType);
  }
  if (channelsToTarget.length === 0) {
    channelsToTarget = ["OWNED_WEBSITE", "GITHUB", "REDDIT"];
  }

  // Load existing channels from repository for reference
  const allChannels = await distributionRepo.listChannels();
  const channelMap = new Map<string, DistributionChannel>();
  for (const c of allChannels) {
    channelMap.set(c.channel_type, c);
  }

  for (const channelType of channelsToTarget) {
    const capability = getChannelCapability(channelType);
    const existingDbChannel = channelMap.get(channelType);
    const channelId = existingDbChannel ? existingDbChannel.id : null;

    // Pick recommended content types
    const contentTypes = capability.supported_content_types.slice(0, 2);

    for (const contentType of contentTypes) {
      // Build tracking URL for this channel
      const canonical = product.product_url || (baseUrl ? `${baseUrl}/p/${product.id}` : `https://example.com/p/${product.id}`);
      const trackingUrl = buildTrackedUrl({
        baseUrl: canonical,
        source: channelType.toLowerCase(),
        medium: capability.automation_capability === "FULL_AUTO" ? "automated" : "organic",
        campaign: campaign.id,
        content: contentType.toLowerCase(),
      });

      // Generate honest, fact-separated copy
      const targetAudience = strategy?.target_audience || "Engineers and makers";
      const generated: GeneratedContentAsset = generateContentAsset({
        product,
        channel_type: channelType,
        content_type: contentType,
        target_audience: targetAudience,
        tracking_url: trackingUrl,
        canonical_url: canonical,
        experiment,
        opportunity,
      });

      // Persist the asset in database
      const asset = await distributionRepo.createAsset({
        campaign_id: campaign.id,
        product_id: product.id,
        channel_type: channelType,
        content_type: contentType,
        title: generated.title,
        body: generated.body,
        metadata: {
          ...generated.metadata,
          channel_id: channelId,
        },
        fact_claims: generated.fact_claims,
        inference_notes: generated.inference_notes,
        marketing_copy: generated.marketing_copy,
        approval_status: (generated.approval_required || capability.approval_required)
          ? "PENDING_APPROVAL"
          : "APPROVED",
        is_demo: campaign.is_demo ?? false,
      });
      createdAssets.push(asset);

      // Create a queued item from this asset
      const queueItem = await createQueueItemFromAsset({
        campaignId: campaign.id,
        asset,
        channelType,
        channelId,
        capability,
        requiresApproval: asset.approval_status === "PENDING_APPROVAL",
      });
      createdQueueItems.push(queueItem);
    }
  }

  return {
    assets: createdAssets,
    queueItems: createdQueueItems,
    warnings,
  };
}
