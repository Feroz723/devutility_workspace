import { describe, it, expect } from "vitest";
import {
  findExistingDuplicate,
  mergeEvidence,
  normalizeText,
  calculateTokenOverlap,
} from "@/research/deduplication";
import type { Opportunity } from "@/types/opportunity";
import type { CandidateOpportunity, ExtractedEvidence } from "@/research/types";

describe("Research Engine — Deduplication & Evidence Merging", () => {
  it("normalizes text by stripping punctuation and short words", () => {
    const tokens = normalizeText("How do I automate my freelance invoicing in Excel?!");
    expect(tokens).toContain("automate");
    expect(tokens).toContain("freelance");
    expect(tokens).toContain("invoicing");
    expect(tokens).toContain("excel");
  });

  it("calculates token overlap similarity correctly", () => {
    const tokensA = ["freelance", "invoicing", "automation", "tool"];
    const tokensB = ["freelance", "invoicing", "template", "spreadsheet"];
    const similarity = calculateTokenOverlap(tokensA, tokensB);

    // 2 matching tokens ("freelance", "invoicing") out of 6 unique tokens = 2/6 = 0.333
    expect(similarity).toBeCloseTo(0.333, 2);
  });

  it("identifies duplicate opportunities by exact source URL", () => {
    const existingOpp: Opportunity = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      title: "Invoice Tool",
      problem: "Billing is tedious",
      source_url: "https://news.ycombinator.com/item?id=99999",
      status: "new",
      is_demo: false,
      research_confidence: 50,
      evidence_count: 1,
      source_count: 1,
      research_run_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const candidate: CandidateOpportunity = {
      title: "Freelance Invoicing Generator",
      problem: "Manual spreadsheet billing",
      target_customer: "Freelancers",
      existing_solutions: [],
      monetization_confidence: "INFERRED",
      demand_factor: 70,
      competition_factor: 50,
      monetization_factor: 60,
      automation_factor: 80,
      zero_cost_factor: 90,
      evidence: [
        {
          source_type: "hacker_news",
          source_name: "Hacker News",
          source_url: "https://news.ycombinator.com/item?id=99999",
          evidence_text: "Freelancers spend 5 hours a week formatting invoices",
          evidence_strength: "HIGH",
          evidence_nature: "DIRECT",
          source_quality: "PRIMARY",
        },
      ],
    };

    const match = findExistingDuplicate(candidate, [existingOpp]);
    expect(match.isDuplicate).toBe(true);
    expect(match.similarityScore).toBe(1.0);
    expect(match.matchReason).toContain("Exact source URL match");
  });

  it("identifies duplicate opportunities by high semantic title/problem overlap", () => {
    const existingOpp: Opportunity = {
      id: "123e4567-e89b-12d3-a456-426614174001",
      title: "Automated Notion Invoice Generator for Freelancers",
      problem: "Freelancers waste hours manually tracking hours and creating PDF invoices in spreadsheets",
      status: "new",
      is_demo: false,
      research_confidence: 60,
      evidence_count: 1,
      source_count: 1,
      research_run_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const candidate: CandidateOpportunity = {
      title: "Notion Invoice Generator for Freelancers",
      problem: "Freelancers lose time manually creating invoice PDFs and spreadsheets",
      target_customer: "Freelancers",
      existing_solutions: [],
      monetization_confidence: "INFERRED",
      demand_factor: 75,
      competition_factor: 45,
      monetization_factor: 65,
      automation_factor: 85,
      zero_cost_factor: 95,
      evidence: [
        {
          source_type: "reddit",
          source_name: "r/freelance",
          source_url: "https://reddit.com/r/freelance/comments/123",
          evidence_text: "Need an easy way to bill clients directly from my Notion workspace",
          evidence_strength: "HIGH",
          evidence_nature: "DIRECT",
          source_quality: "PRIMARY",
        },
      ],
    };

    const match = findExistingDuplicate(candidate, [existingOpp]);
    expect(match.isDuplicate).toBe(true);
    expect(match.similarityScore).toBeGreaterThanOrEqual(0.45);
  });

  it("merges two independent evidence sources for the same problem without duplication", () => {
    const existingEvidence: ExtractedEvidence[] = [
      {
        source_type: "hacker_news",
        source_name: "Hacker News",
        source_url: "https://news.ycombinator.com/item?id=111",
        evidence_text: "I wish there was a tool to clean CSV files automatically",
        evidence_strength: "MEDIUM",
        evidence_nature: "DIRECT",
        source_quality: "PRIMARY",
      },
    ];

    const newEvidence: ExtractedEvidence[] = [
      // Duplicate of item 1
      {
        source_type: "hacker_news",
        source_name: "Hacker News",
        source_url: "https://news.ycombinator.com/item?id=111",
        evidence_text: "I wish there was a tool to clean CSV files automatically",
        evidence_strength: "MEDIUM",
        evidence_nature: "DIRECT",
        source_quality: "PRIMARY",
      },
      // Distinct new evidence from GitHub
      {
        source_type: "github",
        source_name: "GitHub Issues",
        source_url: "https://github.com/org/repo/issues/456",
        evidence_text: "Our data pipeline breaks constantly due to unescaped delimiters in user CSVs",
        evidence_strength: "HIGH",
        evidence_nature: "DIRECT",
        source_quality: "PRIMARY",
      },
    ];

    const { merged, addedCount } = mergeEvidence(existingEvidence, newEvidence);

    // Only 1 new unique evidence item should be added
    expect(addedCount).toBe(1);
    expect(merged.length).toBe(2);
    expect(merged[0]?.source_name).toBe("Hacker News");
    expect(merged[1]?.source_name).toBe("GitHub Issues");
  });
});
