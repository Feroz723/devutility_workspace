import { describe, it, expect } from "vitest";
import { HackerNewsProvider } from "@/research/providers/hacker-news";
import { GitHubProvider } from "@/research/providers/github";
import { RedditPublicProvider } from "@/research/providers/reddit-rss";
import { WebManualProvider } from "@/research/providers/web-manual";

describe("Research Providers Architecture", () => {
  it("normalizes Hacker News search hits properly", () => {
    const provider = new HackerNewsProvider();
    const rawHits = [
      {
        objectID: "12345",
        title: "Ask HN: How do you handle freelance taxes?",
        story_text: "I am spending 10 hours a month doing manual spreadsheet calculations.",
        author: "founder1",
        created_at: "2026-01-01T00:00:00Z",
        points: 45,
        num_comments: 32,
      },
    ];

    const normalized = provider.normalize(rawHits);
    expect(normalized.length).toBe(1);
    expect(normalized[0]?.id).toBe("hn-12345");
    expect(normalized[0]?.sourceType).toBe("hacker_news");
    expect(normalized[0]?.sourceName).toBe("Hacker News");
    expect(normalized[0]?.title).toContain("How do you handle freelance taxes");
    expect(normalized[0]?.content).toContain("manual spreadsheet calculations");
    expect(normalized[0]?.score).toBe(45);
    expect(normalized[0]?.commentsCount).toBe(32);
  });

  it("normalizes GitHub issue search results properly", () => {
    const provider = new GitHubProvider();
    const rawItems = [
      {
        id: 9876,
        title: "Bug: CSV parser fails on large spreadsheets",
        body: "Takes too much time to load large datasets and crashes memory.",
        html_url: "https://github.com/example/repo/issues/1",
        user: { login: "dev_user" },
        created_at: "2026-02-01T00:00:00Z",
        comments: 14,
        state: "open",
        reactions: { total_count: 8 },
      },
    ];

    const normalized = provider.normalize(rawItems);
    expect(normalized.length).toBe(1);
    expect(normalized[0]?.id).toBe("gh-9876");
    expect(normalized[0]?.sourceType).toBe("github");
    expect(normalized[0]?.sourceUrl).toBe("https://github.com/example/repo/issues/1");
    expect(normalized[0]?.content).toContain("Takes too much time");
  });

  it("normalizes Reddit posts properly", () => {
    const provider = new RedditPublicProvider();
    const rawChildren = [
      {
        data: {
          id: "r123",
          title: "Looking for a tool to automate customer followups",
          selftext: "Currently using Gmail and a notepad. It is frustrating and repetitive.",
          permalink: "/r/smallbusiness/comments/r123/looking_for_a_tool/",
          author: "small_biz_guy",
          subreddit: "smallbusiness",
          score: 28,
          num_comments: 19,
          created_utc: 1767225600,
        },
      },
    ];

    const normalized = provider.normalize(rawChildren);
    expect(normalized.length).toBe(1);
    expect(normalized[0]?.id).toBe("reddit-r123");
    expect(normalized[0]?.sourceType).toBe("reddit");
    expect(normalized[0]?.sourceUrl).toBe("https://www.reddit.com/r/smallbusiness/comments/r123/looking_for_a_tool/");
    expect(normalized[0]?.content).toContain("frustrating and repetitive");
  });

  it("handles empty or invalid inputs gracefully across all providers", () => {
    const hn = new HackerNewsProvider();
    const gh = new GitHubProvider();
    const reddit = new RedditPublicProvider();
    const manual = new WebManualProvider();

    expect(hn.normalize(null)).toEqual([]);
    expect(hn.normalize({})).toEqual([]);
    expect(gh.normalize(undefined)).toEqual([]);
    expect(reddit.normalize([null, {}])).toEqual([]);
    expect(manual.normalize("not-an-array")).toEqual([]);
  });

  it("provides accurate free-cost classification in provider info", async () => {
    const hn = new HackerNewsProvider();
    const info = await hn.getInfo();
    expect(info.isFree).toBe(true);
    expect(info.name).toContain("Hacker News");
  });
});
