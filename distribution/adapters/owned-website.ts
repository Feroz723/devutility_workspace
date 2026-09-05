import type { ChannelAdapter, ConnectionTestResult, PublishResult } from "./base";
import type { ChannelType, DistributionQueueItem, DistributionAsset } from "@/types/distribution";

export class OwnedWebsiteAdapter implements ChannelAdapter {
  channel_type: ChannelType = "OWNED_WEBSITE";

  async testConnection(): Promise<ConnectionTestResult> {
    return {
      connected: true,
      status: "CONNECTED",
      message: "Internal website host is operational and available for instant zero-cost publishing.",
      details: {
        host: "localhost",
        mode: "self_hosted",
        cost: 0,
      },
    };
  }

  async publish(
    queueItem: DistributionQueueItem,
    asset: DistributionAsset
  ): Promise<PublishResult> {
    const titleText = asset.title || "product";
    const slug = titleText.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const url = `/p/${asset.product_id}/${slug}`;

    return {
      success: true,
      external_id: `internal-page-${asset.id}`,
      external_url: url,
    };
  }
}
