import { describe, it, expect } from "vitest";
import { getChannelAdapter } from "@/distribution/adapters";

describe("Distribution Integrations & Honest Status Reporting", () => {
  it("owned website adapter is always connected locally at ₹0 cost", async () => {
    const adapter = getChannelAdapter("OWNED_WEBSITE");
    const res = await adapter.testConnection();

    expect(res.connected).toBe(true);
    expect(res.status).toBe("CONNECTED");
    expect(res.details?.cost).toBe(0);
  });

  it("unconfigured third-party channels truthfully report NOT_CONNECTED and require manual setup", async () => {
    // Reddit
    const reddit = getChannelAdapter("REDDIT");
    const redditTest = await reddit.testConnection();
    expect(redditTest.connected).toBe(false);
    expect(redditTest.status).toBe("NOT_CONNECTED");
    expect(redditTest.manual_action_required).toBe(true);
    expect(redditTest.manual_setup_instructions?.length).toBeGreaterThan(0);

    // Hacker News
    const hn = getChannelAdapter("HACKER_NEWS");
    const hnTest = await hn.testConnection();
    expect(hnTest.connected).toBe(false);
    expect(hnTest.status).toBe("NOT_CONNECTED");
    expect(hnTest.manual_action_required).toBe(true);

    // Product Directory
    const dir = getChannelAdapter("PRODUCT_DIRECTORY");
    const dirTest = await dir.testConnection();
    expect(dirTest.connected).toBe(false);
    expect(dirTest.status).toBe("NOT_CONNECTED");
    expect(dirTest.manual_action_required).toBe(true);
  });

  it("adapter publish method prevents unapproved or unconnected external posting", async () => {
    const hn = getChannelAdapter("HACKER_NEWS");
    const pubResult = await hn.publish({} as any, {
      id: "fake-asset",
      title: "Test",
      body: "Test body",
    } as any);

    expect(pubResult.success).toBe(false);
    expect(pubResult.requires_manual_action).toBe(true);
  });
});
