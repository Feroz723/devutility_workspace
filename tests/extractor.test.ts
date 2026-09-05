import { describe, it, expect } from "vitest";
import { extractHeuristically, extractOpportunityFromContent } from "@/research/extractor";
import type { RawResearchItem } from "@/research/types";

describe("Opportunity Extractor & Heuristic Extraction", () => {
  it("extracts real customer problem from raw post when AI is not configured", () => {
    const rawItem: RawResearchItem = {
      id: "raw-1",
      sourceType: "reddit",
      sourceName: "r/freelance",
      sourceUrl: "https://reddit.com/r/freelance/comments/1",
      title: "How do I automate client invoices and receipts?",
      content: "I am a freelance web developer. How do I automate client invoices and receipts? I waste 3 hours every Sunday doing manual spreadsheet entry and it is very frustrating.",
      author: "freelancer_dan",
      score: 35,
      commentsCount: 18,
    };

    const candidate = extractHeuristically(rawItem);
    expect(candidate).not.toBeNull();
    expect(candidate?.title).toContain("How do I automate client invoices");
    expect(candidate?.target_customer).toBe("Freelancers");
    expect(candidate?.evidence.length).toBe(1);
    expect(candidate?.evidence[0]?.evidence_nature).toBe("DIRECT");
    expect(candidate?.evidence[0]?.source_url).toBe("https://reddit.com/r/freelance/comments/1");
  });

  it("safely handles content without identifiable pain points by returning null", () => {
    const nonProblemItem: RawResearchItem = {
      id: "raw-2",
      sourceType: "web",
      sourceName: "News",
      sourceUrl: "https://example.com/news",
      title: "Hello world",
      content: "Hi.",
    };

    const candidate = extractHeuristically(nonProblemItem);
    expect(candidate).toBeNull();
  });

  it("handles extractOpportunityFromContent in mock/offline mode without crashing or faking AI", async () => {
    const item: RawResearchItem = {
      id: "raw-3",
      sourceType: "hacker_news",
      sourceName: "Hacker News",
      sourceUrl: "https://news.ycombinator.com/item?id=555",
      title: "Ask HN: What repetitive tasks do you wish there was a tool for?",
      content: "I spend way too much time cleaning CSV files before importing into Postgres. Wish there was a tool to validate and clean delimiters automatically.",
      score: 50,
      commentsCount: 25,
    };

    const result = await extractOpportunityFromContent(item);
    expect(result.extractionMethod).toBe("AI_NOT_CONFIGURED");
    expect(result.candidate).not.toBeNull();
    expect(result.candidate?.evidence[0]?.evidence_nature).toBe("DIRECT");
  });
});
