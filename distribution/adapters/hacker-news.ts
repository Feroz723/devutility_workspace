import type { ChannelAdapter, ConnectionTestResult, PublishResult } from "./base";
import type { ChannelType, DistributionQueueItem, DistributionAsset } from "@/types/distribution";

export class HackerNewsAdapter implements ChannelAdapter {
  channel_type: ChannelType = "HACKER_NEWS";

  async testConnection(): Promise<ConnectionTestResult> {
    return {
      connected: false,
      status: "NOT_CONNECTED",
      message: "Hacker News does not offer an official submission API. Submissions must be posted manually via news.ycombinator.com/submit.",
      manual_action_required: true,
      manual_setup_instructions: [
        "Login to your Hacker News account at https://news.ycombinator.com/login.",
        "Navigate to https://news.ycombinator.com/submit.",
        "Use 'Show HN: <Title>' format and paste the prepared factual markdown/text body.",
        "Keep the submission authentic, answer community questions immediately in the comments, and do not vote manipulate.",
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
      manual_instructions: `Hacker News requires manual submission. Copy the prepared title (${asset.title}) and body into https://news.ycombinator.com/submit.`,
      error: "Hacker News does not support autonomous programmatic posting.",
    };
  }
}
