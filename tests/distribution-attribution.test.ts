import { describe, it, expect } from "vitest";
import {
  buildTrackingUrl,
  buildTrackedUrl,
  parseAttributionParams,
  parseUtmParams,
  generateTrackingToken,
} from "@/distribution/attribution";

describe("First-Party Attribution & UTM Tracking", () => {
  it("builds correct standard UTM parameters with collision-resistant token", () => {
    const { url, token } = buildTrackingUrl({
      baseUrl: "https://example.com/product",
      channel: "REDDIT",
      campaignSlug: "launch-2026",
      contentType: "COMMUNITY_POST",
    });

    expect(url).toContain("utm_source=reddit");
    expect(url).toContain("utm_medium=organic");
    expect(url).toContain("utm_campaign=launch-2026");
    expect(url).toContain("utm_content=community_post");
    expect(url).toContain(`abos_token=${token}`);
    expect(token.startsWith("trk_")).toBe(true);
  });

  it("parses tracking params from incoming URLs", () => {
    const testUrl = "https://example.com/product?utm_source=github&utm_medium=organic&utm_campaign=v1&utm_content=readme&abos_token=trk_12345";
    const params = parseAttributionParams(new URL(testUrl).searchParams);

    expect(params.utm_source).toBe("github");
    expect(params.utm_medium).toBe("organic");
    expect(params.utm_campaign).toBe("v1");
    expect(params.utm_content).toBe("readme");
    expect(params.token).toBe("trk_12345");
  });

  it("parseUtmParams handles relative and absolute URLs safely", () => {
    const parsed = parseUtmParams("/p/123?utm_source=hackernews&utm_campaign=beta");
    expect(parsed.source).toBe("hackernews");
    expect(parsed.campaign).toBe("beta");
  });
});
