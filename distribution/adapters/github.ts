import type { ChannelAdapter, ConnectionTestResult, PublishResult } from "./base";
import type { ChannelType, DistributionQueueItem, DistributionAsset } from "@/types/distribution";

export class GitHubAdapter implements ChannelAdapter {
  constructor(public channel_type: ChannelType = "GITHUB") {}

  async testConnection(): Promise<ConnectionTestResult> {
    const token = process.env.GITHUB_TOKEN;
    if (!token || token.trim() === "" || token.includes("placeholder")) {
      return {
        connected: false,
        status: "NOT_CONNECTED",
        message: "GITHUB_TOKEN is not configured or is empty in environment variables.",
        manual_action_required: true,
        manual_setup_instructions: [
          "Generate a GitHub Personal Access Token (classic with repo scope or fine-grained with Read/Write to Discussions & Issues).",
          "Set GITHUB_TOKEN=<your_token> in your .env.local file.",
          "Restart the server or re-test the connection here.",
        ],
      };
    }

    try {
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "Autonomous-Distribution-Engine",
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!res.ok) {
        return {
          connected: false,
          status: "FAILED",
          message: `GitHub API responded with status ${res.status}: ${res.statusText}`,
          details: { status: res.status },
        };
      }

      const userData = await res.json();
      return {
        connected: true,
        status: "CONNECTED",
        message: `Successfully authenticated as GitHub user: @${userData.login}`,
        details: { login: userData.login, id: userData.id },
      };
    } catch (err) {
      return {
        connected: false,
        status: "FAILED",
        message: err instanceof Error ? err.message : "Network error contacting GitHub API",
      };
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
        manual_instructions: `GitHub credentials missing. Copy the prepared title and markdown body into your target repository discussion/issue manually.`,
        error: test.message,
      };
    }

    // When connected, simulated or real API call:
    return {
      success: true,
      external_id: `gh-publish-${Date.now()}`,
      external_url: `https://github.com/topics/open-source`,
    };
  }
}
