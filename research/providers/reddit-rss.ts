import { safeFetch } from "@/lib/ssrf";
import type { ResearchProvider, ProviderStatus, ProviderInfo, RawResearchItem } from "../types";

export class RedditPublicProvider implements ResearchProvider {
  readonly id = "reddit";
  readonly name = "Reddit Public Discussions";
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
      rateLimit: "30 requests/minute (public JSON)",
      lastRun: this.lastRun,
      lastSuccess: this.lastSuccess,
      lastError: this.lastError,
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const start = Date.now();
    try {
      const res = await safeFetch("https://www.reddit.com/r/smallbusiness/hot.json?limit=1", {
        headers: { "User-Agent": "AutonomousBusinessOS-ResearchEngine/1.0 (Public Research)" },
        timeoutMs: 6000,
      });

      const latencyMs = Date.now() - start;
      if (res.ok) {
        this.status = "CONNECTED";
        this.lastSuccess = new Date().toISOString();
        return { success: true, message: "Reddit public API reachable", latencyMs };
      } else {
        this.status = res.status === 429 ? "RATE_LIMITED" : "FAILED";
        this.lastError = res.error;
        return { success: false, message: res.error || "Reddit connection failed", latencyMs };
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
    const limit = Math.min(options?.limit ?? 10, 25);
    // Search business/freelance subreddits for relevant discussions
    const subreddits = "smallbusiness+freelance+Entrepreneur+SaaS+productivity";
    const searchUrl = `https://www.reddit.com/r/${subreddits}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=relevance&limit=${limit}`;

    const res = await safeFetch(searchUrl, {
      headers: { "User-Agent": "AutonomousBusinessOS-ResearchEngine/1.0 (Public Research)" },
      timeoutMs: 8000,
    });

    if (!res.ok) {
      this.status = res.status === 429 ? "RATE_LIMITED" : "FAILED";
      this.lastError = res.error;
      return [];
    }

    try {
      const data = JSON.parse(res.text);
      this.status = "CONNECTED";
      this.lastSuccess = new Date().toISOString();
      const children = data?.data?.children || [];
      return this.normalize(children);
    } catch (err) {
      this.status = "FAILED";
      this.lastError = err instanceof Error ? err.message : "JSON parse error";
      return [];
    }
  }

  async fetch(url: string): Promise<string | null> {
    const res = await safeFetch(url, {
      headers: { "User-Agent": "AutonomousBusinessOS-ResearchEngine/1.0 (Public Research)" },
      timeoutMs: 8000,
    });
    return res.ok ? res.text : null;
  }

  normalize(rawChildren: unknown): RawResearchItem[] {
    if (!Array.isArray(rawChildren)) return [];

    return rawChildren
      .map((child) => child?.data)
      .filter((post) => post && post.title && post.permalink)
      .map((post) => {
        const fullUrl = `https://www.reddit.com${post.permalink}`;
        const content = `${post.title}\n\n${post.selftext || ""}`;

        return {
          id: `reddit-${post.id}`,
          sourceType: "reddit",
          sourceName: `r/${post.subreddit || "reddit"}`,
          sourceUrl: fullUrl,
          title: post.title,
          content: content.slice(0, 4000),
          author: post.author,
          publishedAt: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : undefined,
          score: post.score || 0,
          commentsCount: post.num_comments || 0,
          rawMetadata: {
            subreddit: post.subreddit,
            upvote_ratio: post.upvote_ratio,
            num_comments: post.num_comments,
          },
        };
      });
  }
}
