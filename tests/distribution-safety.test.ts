import { describe, it, expect } from "vitest";
import { checkAntiSpamRules } from "@/distribution/safety";

describe("Distribution Anti-Spam & Safety Rules", () => {
  it("passes authentic new content within normal limits", () => {
    const result = checkAntiSpamRules({
      channel_type: "REDDIT",
      title: "Show r/SideProject: Built a client-side JSON Formatter",
      body: "Solves instant formatting without sending sensitive data to external servers.",
      hourly_count: 0,
      daily_count: 0,
    });

    expect(result.passed).toBe(true);
    expect(result.risk_score).toBeLessThan(50);
    expect(result.content_hash).toBeDefined();
  });

  it("detects and blocks duplicate content collisions", () => {
    const title = "Duplicate Post Title";
    const body = "Identical message payload";
    // First pass to get hash
    const first = checkAntiSpamRules({
      channel_type: "GITHUB_DISCUSSIONS",
      title,
      body,
    });

    // Second pass with that hash in recent_hashes
    const second = checkAntiSpamRules({
      channel_type: "GITHUB_DISCUSSIONS",
      title,
      body,
      recent_hashes: [first.content_hash],
    });

    expect(second.passed).toBe(false);
    expect(second.risk_score).toBeGreaterThanOrEqual(80);
    expect(second.blocked_actions).toContain("DUPLICATE_CONTENT");
  });

  it("flags rate limit exhaustion", () => {
    const result = checkAntiSpamRules({
      channel_type: "HACKER_NEWS",
      title: "Show HN Post",
      body: "Sample text",
      hourly_count: 5,
      hourly_limit: 1,
    });

    expect(result.passed).toBe(false);
    expect(result.blocked_actions).toContain("HOURLY_LIMIT_EXCEEDED");
  });
});
