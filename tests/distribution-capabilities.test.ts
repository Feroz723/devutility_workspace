import { describe, it, expect } from "vitest";
import { CHANNEL_CAPABILITIES, getChannelCapability } from "@/distribution/capabilities";
import type { ChannelType } from "@/types/distribution";

describe("Distribution Channel Capabilities", () => {
  const supportedChannels: ChannelType[] = [
    "OWNED_WEBSITE",
    "SEO",
    "GITHUB",
    "GITHUB_DISCUSSIONS",
    "GITHUB_ISSUES",
    "REDDIT",
    "HACKER_NEWS",
    "PRODUCT_DIRECTORY",
    "COMMUNITY",
    "BLOG",
    "EMAIL",
    "SOCIAL_MEDIA",
    "LINKEDIN",
    "X",
    "INSTAGRAM",
    "YOUTUBE",
    "MANUAL_OUTREACH",
  ];

  it("defines comprehensive capability metadata for all 17 supported channels", () => {
    for (const channelType of supportedChannels) {
      const cap = getChannelCapability(channelType);
      expect(cap).toBeDefined();
      expect(cap.channel_type).toBe(channelType);
      expect(cap.platform).toBeDefined();
      expect(cap.name).toBeDefined();
      expect(cap.daily_action_limit).toBeGreaterThan(0);
      expect(cap.hourly_action_limit).toBeGreaterThan(0);
      expect(cap.supported_content_types.length).toBeGreaterThan(0);
      expect(cap.manual_setup_instructions.length).toBeGreaterThan(0);
    }
  });

  it("marks owned website and SEO as FULL_AUTO without credentials requirement", () => {
    const owned = getChannelCapability("OWNED_WEBSITE");
    expect(owned.automation_capability).toBe("FULL_AUTO");
    expect(owned.credentials_required).toBe(false);
    expect(owned.manual_setup_required).toBe(false);

    const seo = getChannelCapability("SEO");
    expect(seo.automation_capability).toBe("FULL_AUTO");
    expect(seo.credentials_required).toBe(false);
  });

  it("marks Reddit, Hacker News, and Manual Outreach as requiring approval or manual action", () => {
    const reddit = getChannelCapability("REDDIT");
    expect(reddit.approval_required).toBe(true);

    const hn = getChannelCapability("HACKER_NEWS");
    expect(hn.manual_setup_required).toBe(true);

    const outreach = getChannelCapability("MANUAL_OUTREACH");
    expect(outreach.automation_capability).toBe("MANUAL");
  });
});
