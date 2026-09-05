import { safeFetch } from "@/lib/ssrf";
import type { ResearchProvider, ProviderStatus, ProviderInfo, RawResearchItem } from "../types";

export class GitHubProvider implements ResearchProvider {
  readonly id = "github";
  readonly name = "GitHub Issues & Discussions";
  readonly isFree = true;

  private lastRun?: string;
  private lastSuccess?: string;
  private lastError?: string;
  private status: ProviderStatus = "READY";

  private getAuthHeaders(): Record<string, string> {
    const token = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "AutonomousBusinessOS-ResearchEngine/1.0",
    };
    if (token) {
      headers.Authorization = `token ${token}`;
    }
    return headers;
  }

  async getStatus(): Promise<ProviderStatus> {
    return this.status;
  }

  async getInfo(): Promise<ProviderInfo> {
    const hasToken = !!process.env.GITHUB_TOKEN;
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      isFree: this.isFree,
      rateLimit: hasToken ? "5,000 requests/hour (authenticated)" : "60 requests/hour (unauthenticated)",
      lastRun: this.lastRun,
      lastSuccess: this.lastSuccess,
      lastError: this.lastError,
      configurationRequired: hasToken ? undefined : "Optional: GITHUB_TOKEN increases rate limits",
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const start = Date.now();
    try {
      const res = await safeFetch("https://api.github.com/zen", {
        headers: this.getAuthHeaders(),
        timeoutMs: 5000,
      });

      const latencyMs = Date.now() - start;
      if (res.ok) {
        this.status = "CONNECTED";
        this.lastSuccess = new Date().toISOString();
        return { success: true, message: `GitHub API reachable: "${res.text.trim()}"`, latencyMs };
      } else {
        this.status = res.status === 403 ? "RATE_LIMITED" : "FAILED";
        this.lastError = res.error;
        return { success: false, message: res.error || "GitHub connection failed", latencyMs };
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
    const limit = Math.min(options?.limit ?? 10, 30);
    // Focus search on issues describing bugs, feature requests, or workflows
    const encodedQuery = encodeURIComponent(`${query} is:issue`);
    const searchUrl = `https://api.github.com/search/issues?q=${encodedQuery}&sort=comments&order=desc&per_page=${limit}`;

    const res = await safeFetch(searchUrl, {
      headers: this.getAuthHeaders(),
      timeoutMs: 8000,
    });

    if (!res.ok) {
      this.status = res.status === 403 || res.status === 429 ? "RATE_LIMITED" : "FAILED";
      this.lastError = res.error;
      return [];
    }

    try {
      const data = JSON.parse(res.text);
      this.status = "CONNECTED";
      this.lastSuccess = new Date().toISOString();
      return this.normalize(data.items || []);
    } catch (err) {
      this.status = "FAILED";
      this.lastError = err instanceof Error ? err.message : "JSON parse error";
      return [];
    }
  }

  async fetch(url: string): Promise<string | null> {
    const res = await safeFetch(url, {
      headers: this.getAuthHeaders(),
      timeoutMs: 8000,
    });
    return res.ok ? res.text : null;
  }

  normalize(rawItems: unknown): RawResearchItem[] {
    if (!Array.isArray(rawItems)) return [];

    return rawItems
      .filter((item) => item && item.title && item.html_url)
      .map((item) => {
        const bodySnippet = item.body ? item.body.slice(0, 3000) : "";
        return {
          id: `gh-${item.id}`,
          sourceType: "github",
          sourceName: "GitHub Issues",
          sourceUrl: item.html_url,
          title: item.title,
          content: `${item.title}\n\n${bodySnippet}`,
          author: item.user?.login,
          publishedAt: item.created_at,
          score: item.reactions?.total_count || item.score || 0,
          commentsCount: item.comments || 0,
          rawMetadata: {
            state: item.state,
            comments: item.comments,
            repository_url: item.repository_url,
          },
        };
      });
  }
}
