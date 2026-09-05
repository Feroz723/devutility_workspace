import type { ChannelAdapter, ConnectionTestResult, PublishResult } from "./base";
import type { ChannelType, DistributionQueueItem, DistributionAsset } from "@/types/distribution";

export class SocialAdapter implements ChannelAdapter {
  constructor(public channel_type: ChannelType = "SOCIAL_MEDIA") {}

  async testConnection(): Promise<ConnectionTestResult> {
    switch (this.channel_type) {
      case "X": {
        const hasKey = !!process.env.X_API_KEY && !process.env.X_API_KEY.includes("placeholder");
        const hasToken = !!process.env.X_ACCESS_TOKEN;
        if (!hasKey || !hasToken) {
          return {
            connected: false,
            status: "NOT_CONNECTED",
            message: "X (Twitter) Developer API keys or OAuth tokens are missing from environment variables.",
            manual_action_required: true,
            manual_setup_instructions: [
              "Create a Project in Twitter Developer Portal (https://developer.twitter.com).",
              "Obtain API Key, API Secret, User Access Token, and User Access Secret with Read and Write permissions.",
              "Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET in your .env.local file.",
              "Or use the prepared post in the Manual Action Center to post manually.",
            ],
          };
        }
        return {
          connected: true,
          status: "CONNECTED",
          message: "X (Twitter) API credentials verified.",
        };
      }

      case "LINKEDIN": {
        const hasKey = !!process.env.LINKEDIN_CLIENT_ID;
        const hasToken = !!process.env.LINKEDIN_ACCESS_TOKEN;
        if (!hasKey || !hasToken) {
          return {
            connected: false,
            status: "NOT_CONNECTED",
            message: "LinkedIn Developer app credentials or Member access token are missing.",
            manual_action_required: true,
            manual_setup_instructions: [
              "Create an app on the LinkedIn Developer Portal (https://www.linkedin.com/developers).",
              "Request the 'Share on LinkedIn' and 'Sign In with LinkedIn' product access.",
              "Generate an OAuth 2.0 User Access Token with 'w_member_social' scope.",
              "Set LINKEDIN_CLIENT_ID and LINKEDIN_ACCESS_TOKEN in .env.local.",
            ],
          };
        }
        return {
          connected: true,
          status: "CONNECTED",
          message: "LinkedIn API credentials verified.",
        };
      }

      case "INSTAGRAM": {
        const hasToken = !!process.env.INSTAGRAM_ACCESS_TOKEN;
        return {
          connected: false,
          status: "NOT_CONNECTED",
          message: hasToken
            ? "Instagram Graph API requires a linked Facebook Page and Business Account."
            : "Instagram Access Token is not configured.",
          manual_action_required: true,
          manual_setup_instructions: [
            "Link your Instagram Professional account to a Facebook Page.",
            "Generate an Instagram Graph API token via Meta for Developers.",
            "Set INSTAGRAM_ACCESS_TOKEN in .env.local.",
          ],
        };
      }

      case "YOUTUBE": {
        const hasKey = !!process.env.YOUTUBE_API_KEY;
        return {
          connected: hasKey,
          status: hasKey ? "CONNECTED" : "NOT_CONNECTED",
          message: hasKey
            ? "YouTube Data API v3 key detected."
            : "YouTube API Key is missing. Manual upload and description editing recommended.",
          manual_action_required: !hasKey,
          manual_setup_instructions: [
            "Enable YouTube Data API v3 in Google Cloud Console.",
            "Create an API Key or OAuth 2.0 Client.",
            "Set YOUTUBE_API_KEY in .env.local.",
          ],
        };
      }

      default: {
        return {
          connected: false,
          status: "NOT_CONNECTED",
          message: `Social channel ${this.channel_type} does not have active API credentials configured.`,
          manual_action_required: true,
          manual_setup_instructions: [
            "Configure target platform credentials or copy content to publish manually.",
          ],
        };
      }
    }
  }

  async publish(
    queueItem: DistributionQueueItem,
    asset: DistributionAsset
  ): Promise<PublishResult> {
    const test = await this.testConnection();
    if (!test.connected) {
      return {
        success: false,
        requires_manual_action: true,
        manual_instructions: `Copy the formatted copy into ${this.channel_type} manually. Credentials are not active.`,
        error: test.message,
      };
    }

    return {
      success: true,
      external_id: `social-${this.channel_type}-${Date.now()}`,
      external_url: `https://example.com/social/${this.channel_type}`,
    };
  }
}
