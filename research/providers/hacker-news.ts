import { safeFetch } from "@/lib/ssrf";
import type { ResearchProvider, ProviderStatus, ProviderInfo, RawResearchItem } from "../types";

export class HackerNewsProvider implements ResearchProvider {
  readonly id = "hacker_news";
  readonly name = "Hacker News (Algolia Search)";
  readonly isFree = true;

  private lastRun?: string;
  private lastSuccess?: string;
  private lastError?: string;
  private status: ProviderStatus = "READY";

  async getStatus(): Promise<ProviderStatus> {
    return this.status;
  }

  async getInfo(): Promise<ProviderInfo> {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      isFree: this.isFree,
      rateLimit: "10,000 requests/hour (public)",
      lastRun: this.lastRun,
      lastSuccess: this.lastSuccess,
      lastError: this.lastError,
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const start = Date.now();
    try {
      const res = await safeFetch("https://hn.algolia.com/api/v1/search?query=test&hitsPerPage=1", {
        timeoutMs: 5000,
      });

      const latencyMs = Date.now() - start;
      if (res.ok) {
        this.status = "CONNECTED";
        this.lastSuccess = new Date().toISOString();
        return { success: true, message: "Hacker News Algolia API is accessible", latencyMs };
      } else {
        this.status = "FAILED";
        this.lastError = res.error;
        return { success: false, message: res.error || "Connection failed", latencyMs };
      }
    } catch (err) {
      this.status = "FAILED";
      const message = err instanceof Error ? err.message : String(err);
      this.lastError = message;
      return { success: false, message, latencyMs: Date.now() - start };
    }
  }

  async search(query: string, options?: { limit?: number }): Promise<RawResearchItem[]> {
    this.lastRun = new Date().toISOString();
    const limit = options?.limit ?? 10;
    const searchUrl = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=(story,comment)&hitsPerPage=${limit}`;

    const res = await safeFetch(searchUrl, { timeoutMs: 8000 });
    if (!res.ok) {
      this.status = res.status === 429 ? "RATE_LIMITED" : "FAILED";
      this.lastError = res.error;
      return [];
    }

    try {
      const data = JSON.parse(res.text);
      this.status = "CONNECTED";
      this.lastSuccess = new Date().toISOString();
      return this.normalize(data.hits || []);
    } catch (err) {
      this.status = "FAILED";
      this.lastError = err instanceof Error ? err.message : "JSON parse error";
      return [];
    }
  }

  async fetch(url: string): Promise<string | null> {
    const res = await safeFetch(url, { timeoutMs: 8000 });
    return res.ok ? res.text : null;
  }

  normalize(rawHits: unknown): RawResearchItem[] {
    if (!Array.isArray(rawHits)) return [];

    return rawHits
      .filter((hit) => hit && (hit.title || hit.story_title || hit.comment_text))
      .map((hit) => {
        const title = hit.title || hit.story_title || (hit.comment_text ? hit.comment_text.slice(0, 80) + "..." : "HN Discussion");
        const content = [
          hit.story_text,
          hit.comment_text,
          hit.url ? `Target URL: ${hit.url}` : null,
        ].filter(Boolean).join("\n\n") || title;

        const storyUrl = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;

        return {
          id: `hn-${hit.objectID}`,
          sourceType: "hacker_news",
          sourceName: "Hacker News",
          sourceUrl: storyUrl,
          title,
          content,
          author: hit.author,
          publishedAt: hit.created_at,
          score: hit.points || 0,
          commentsCount: hit.num_comments || 0,
          rawMetadata: {
            objectID: hit.objectID,
            points: hit.points,
            num_comments: hit.num_comments,
          },
        };
      });
  }
}
