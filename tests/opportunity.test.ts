import { describe, it, expect } from "vitest";
import {
  CreateOpportunitySchema,
  UpdateOpportunitySchema,
  OpportunitySchema,
  OpportunityFilterSchema,
} from "@/types/opportunity";

describe("Opportunity Schemas & Validation", () => {
  it("validates valid opportunity creation payload", () => {
    const valid = {
      title: "Micro-SaaS SEO Audit Tool",
      problem: "SMBs struggle with indexing errors",
      target_customer: "Solo founders",
      demand_score: 85,
      competition_score: 30,
      monetization_score: 80,
      automation_score: 90,
      zero_cost_score: 95,
      is_demo: false,
    };

    const parsed = CreateOpportunitySchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects score below 0 or above 100", () => {
    const lowScore = {
      title: "Invalid Low",
      demand_score: -5,
    };
    expect(CreateOpportunitySchema.safeParse(lowScore).success).toBe(false);

    const highScore = {
      title: "Invalid High",
      demand_score: 105,
    };
    expect(CreateOpportunitySchema.safeParse(highScore).success).toBe(false);
  });

  it("rejects empty title", () => {
    const emptyTitle = {
      title: "",
    };
    expect(CreateOpportunitySchema.safeParse(emptyTitle).success).toBe(false);
  });

  it("validates update schema allowing partial fields including overall_score and decision", () => {
    const update = {
      overall_score: 86,
      decision: "TEST",
      status: "testing",
    };

    const parsed = UpdateOpportunitySchema.safeParse(update);
    expect(parsed.success).toBe(true);
  });

  it("validates full OpportunitySchema with uuid and timestamps", () => {
    const full = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      title: "Full Record",
      status: "new",
      is_demo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const parsed = OpportunitySchema.safeParse(full);
    expect(parsed.success).toBe(true);
  });

  it("validates filter query params", () => {
    const filter = {
      search: "automation",
      status: "testing",
      min_score: 70,
      sort_by: "overall_score",
      sort_order: "desc",
      page: 1,
      limit: 20,
    };

    const parsed = OpportunityFilterSchema.safeParse(filter);
    expect(parsed.success).toBe(true);
  });
});
