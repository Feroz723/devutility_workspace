import { describe, it, expect } from "vitest";
import { hashContent, getCachedContent, setCachedContent } from "@/research/cache";

describe("Research Cache & Content Hashing", () => {
  it("computes deterministic SHA-256 content hashes", () => {
    const text = "Sample scraped content from a public web forum.";
    const hash1 = hashContent(text);
    const hash2 = hashContent(text);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // standard sha256 hex length
  });

  it("stores and retrieves cached content accurately", async () => {
    const testUrl = "https://example.com/cached-article";
    const testContent = "<html><body>Useful business pain evidence</body></html>";

    await setCachedContent(testUrl, testContent);
    const retrieved = await getCachedContent(testUrl);

    expect(retrieved).toBe(testContent);
  });

  it("respects cache expiry TTL", async () => {
    const testUrl = "https://example.com/expired-article";
    const testContent = "Expired content";

    await setCachedContent(testUrl, testContent);

    // Negative TTL ensures cache is considered expired
    const expired = await getCachedContent(testUrl, -1000);
    expect(expired).toBeNull();
  });
});
