import type { ChannelAdapter, ConnectionTestResult, PublishResult } from "./base";
import type { ChannelType, DistributionQueueItem, DistributionAsset } from "@/types/distribution";

export class RedditAdapter implements ChannelAdapter {
  channel_type: ChannelType = "REDDIT";

  async testConnection(): Promise<ConnectionTestResult> {
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;

    if (!clientId || !clientSecret || clientId.includes("placeholder")) {
      return {
        connected: false,
        status: "NOT_CONNECTED",
        message: "Reddit API client credentials (REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET) are not configured.",
        manual_action_required: true,
        manual_setup_instructions: [
          "Go to https://www.reddit.com/prefs/apps and create a 'script' type application.",
          "Add REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET to .env.local.",
          "Optionally add REDDIT_USERNAME and REDDIT_PASSWORD if using script authentication.",
          "Alternatively, publish manually using the pre-generated copy in the Manual Action Center.",
        ],
      };
    }

    return {
      connected: false,
      status: "NOT_CONNECTED",
      message: "Reddit credentials detected, but OAuth refresh token flow is pending.",
      details: { clientId },
      manual_action_required: true,
      manual_setup_instructions: [
        "Complete user OAuth consent flow to obtain a refresh token for Reddit API posting.",
      ],
    };
  }

  async publish(
    queueItem: DistributionQueueItem,
    asset: DistributionAsset
  ): Promise<PublishResult> {
    const test = await this.testConnection();
    return {
      success: false,
      requires_manual_action: true,
      manual_instructions: `Reddit requires manual community post submission. Copy the prepared title and body to your target subreddit (e.g., r/SideProject, r/webdev).`,
      error: test.message,
    };
  }
}
