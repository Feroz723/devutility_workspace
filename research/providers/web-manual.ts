import { safeFetch, validatePublicUrl } from "@/lib/ssrf";
import type { ResearchProvider, ProviderStatus, ProviderInfo, RawResearchItem } from "../types";

export class WebManualProvider implements ResearchProvider {
  readonly id = "web_manual";
  readonly name = "Direct URL & Manual Research";
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
      rateLimit: "On-demand manual execution",
      lastRun: this.lastRun,
      lastSuccess: this.lastSuccess,
      lastError: this.lastError,
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const start = Date.now();
    this.status = "CONNECTED";
    this.lastSuccess = new Date().toISOString();
    return { success: true, message: "Manual Web Provider is ready with SSRF protection", latencyMs: Date.now() - start };
  }

  async search(queryOrUrl: string, _options?: { limit?: number }): Promise<RawResearchItem[]> {
    this.lastRun = new Date().toISOString();

    // If the input is a valid URL, fetch and extract content
    if (queryOrUrl.startsWith("http://") || queryOrUrl.startsWith("https://")) {
      const validation = validatePublicUrl(queryOrUrl);
      if (!validation.safe) {
        this.status = "FAILED";
        this.lastError = validation.reason;
        return [];
      }

      const res = await safeFetch(queryOrUrl, { timeoutMs: 10000 });
      if (!res.ok) {
        this.status = "FAILED";
        this.lastError = res.error;
        return [];
      }

      this.status = "CONNECTED";
      this.lastSuccess = new Date().toISOString();

      // Extract title from HTML if possible
      const titleMatch = res.text.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1]?.trim() ?? queryOrUrl : queryOrUrl;

      // Clean HTML tags simply (standard regex)
      const cleanText = res.text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      return [
        {
          id: `manual-${Date.now()}`,
          sourceType: "web",
          sourceName: "User Provided URL",
          sourceUrl: queryOrUrl,
          title,
          content: cleanText.slice(0, 5000),
          publishedAt: new Date().toISOString(),
          score: 100,
        },
      ];
    }

    // If input is text/problem description, treat directly as research item
    this.status = "CONNECTED";
    return [
      {
        id: `manual-text-${Date.now()}`,
        sourceType: "manual_input",
        sourceName: "Owner Input",
        sourceUrl: "internal://manual-research",
        title: queryOrUrl.slice(0, 100),
        content: queryOrUrl,
        publishedAt: new Date().toISOString(),
        score: 100,
      },
    ];
  }

  async fetch(url: string): Promise<string | null> {
    const res = await safeFetch(url, { timeoutMs: 8000 });
    return res.ok ? res.text : null;
  }

  normalize(raw: unknown): RawResearchItem[] {
    return Array.isArray(raw) ? (raw as RawResearchItem[]) : [];
  }
}
