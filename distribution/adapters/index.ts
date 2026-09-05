import type { ChannelType } from "@/types/distribution";
import type { ChannelAdapter, ConnectionTestResult, PublishResult } from "./base";
import { OwnedWebsiteAdapter } from "./owned-website";
import { GitHubAdapter } from "./github";
import { RedditAdapter } from "./reddit";
import { HackerNewsAdapter } from "./hacker-news";
import { SocialAdapter } from "./social";
import { EmailOutreachAdapter } from "./email-outreach";
import { DirectoryAdapter } from "./directory";

export * from "./base";
export * from "./owned-website";
export * from "./github";
export * from "./reddit";
export * from "./hacker-news";
export * from "./social";
export * from "./email-outreach";
export * from "./directory";

/**
 * Returns the appropriate ChannelAdapter instance for the given channel type.
 */
export function getChannelAdapter(channelType: ChannelType): ChannelAdapter {
  switch (channelType) {
    case "OWNED_WEBSITE":
    case "BLOG":
    case "SEO":
      return new OwnedWebsiteAdapter();

    case "GITHUB":
    case "GITHUB_DISCUSSIONS":
    case "GITHUB_ISSUES":
      return new GitHubAdapter(channelType);

    case "REDDIT":
      return new RedditAdapter();

    case "HACKER_NEWS":
      return new HackerNewsAdapter();

    case "SOCIAL_MEDIA":
    case "LINKEDIN":
    case "X":
    case "INSTAGRAM":
    case "YOUTUBE":
      return new SocialAdapter(channelType);

    case "EMAIL":
    case "MANUAL_OUTREACH":
      return new EmailOutreachAdapter(channelType);

    case "PRODUCT_DIRECTORY":
    case "COMMUNITY":
    default:
      return new DirectoryAdapter(channelType);
  }
}

/**
 * Tests connection across all known channel types or a selected list.
 */
export async function testAllConnections(
  channelTypes?: ChannelType[]
): Promise<Array<{ channel_type: ChannelType; result: ConnectionTestResult }>> {
  const types: ChannelType[] = channelTypes || [
    "OWNED_WEBSITE",
    "GITHUB",
    "REDDIT",
    "HACKER_NEWS",
    "PRODUCT_DIRECTORY",
    "COMMUNITY",
    "MANUAL_OUTREACH",
    "X",
    "LINKEDIN",
  ];

  const results = await Promise.all(
    types.map(async (ct) => {
      const adapter = getChannelAdapter(ct);
      const res = await adapter.testConnection();
      return { channel_type: ct, result: res };
    })
  );

  return results;
}
