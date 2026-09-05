import type { ChannelAdapter, ConnectionTestResult, PublishResult } from "./base";
import type { ChannelType, DistributionQueueItem, DistributionAsset } from "@/types/distribution";

export class DirectoryAdapter implements ChannelAdapter {
  constructor(public channel_type: ChannelType = "PRODUCT_DIRECTORY") {}

  async testConnection(): Promise<ConnectionTestResult> {
    const devtoKey = process.env.DEVTO_API_KEY;

    if (this.channel_type === "COMMUNITY" && devtoKey) {
      return {
        connected: true,
        status: "CONNECTED",
        message: "Dev.to API key detected for developer community publishing.",
      };
    }

    return {
      connected: false,
      status: "NOT_CONNECTED",
      message: "Product directories (Product Hunt, BetaList, AlternativeTo) require account login and manual listing submission.",
      manual_action_required: true,
      manual_setup_instructions: [
        "Go to the directory website (e.g. https://www.producthunt.com/posts/new or https://betalist.com/submit).",
        "Paste the prepared tagline, problem-solution description, and website URL.",
        "Add screenshots from the generated product artifacts.",
        "Submit for review during peak engagement hours.",
      ],
    };
  }

  async publish(
    queueItem: DistributionQueueItem,
    asset: DistributionAsset
  ): Promise<PublishResult> {
    return {
      success: false,
      requires_manual_action: true,
      manual_instructions: `Copy the prepared product directory listing (title, short tagline, long description, link) into the submission portal.`,
      error: "Directory submissions require manual account verification and form entry.",
    };
  }
}
