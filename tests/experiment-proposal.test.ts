import { describe, it, expect } from "vitest";
import { generateExperimentProposal } from "@/validation/experiment-proposal";
import { validateOpportunity } from "@/validation/engine";
import type { Opportunity } from "@/types/opportunity";

describe("Validation Engine — Experiment Proposal Generator", () => {
  it("strictly enforces ₹0 cost estimate for test candidate proposals", () => {
    const proposal = generateExperimentProposal({
      title: "Automated Changelog Generator",
      target_customer: "Open-source maintainers",
      source: "github",
    });

    expect(proposal.cost_estimate_inr).toBe(0);
    expect(proposal.test_type).toBe("COMMUNITY_POST");
    expect(proposal.step_by_step_plan).toHaveLength(3);
    expect(proposal.step_by_step_plan.every((s) => s.cost_inr === 0)).toBe(true);
  });

  it("end-to-end validates an opportunity and produces a structured result", () => {
    const opp: Opportunity = {
      id: "11111111-1111-1111-1111-111111111111",
      title: "Real-time Stripe Webhook Monitor",
      problem: "Developers struggle with silent webhook failures in production.",
      problem_statement: "Silent webhook drops cause subscription desync and revenue loss.",
      target_customer: "SaaS backend developers",
      target_market: "DevTools",
      source: "hacker_news",
      source_url: "https://news.ycombinator.com/item?id=12345",
      demand_score: 85,
      competition_score: 30,
      monetization_score: 85,
      automation_score: 90,
      zero_cost_score: 90,
      overall_score: 85,
      decision: null,
      estimated_revenue: "$500/mo",
      estimated_time_to_test: "5 days",
      human_involvement: "minimal",
      risk_level: "low",
      status: "new",
      is_demo: false,
      research_confidence: 80,
      evidence_count: 2,
      source_count: 2,
      last_researched_at: new Date().toISOString(),
      research_run_count: 1,
      competitors: ["WebhookRelay", "Hookdeck"],
      monetization_type: "MICRO_SAAS",
      monetization_confidence: "EVIDENCE-BACKED",
      validation_score: null,
      priority_score: null,
      validation_status: "UNVALIDATED",
      evidence: [
        {
          quote: "I am paying $20/mo for a webhook logger but need real-time failure alerts.",
          source: "Hacker News",
        },
        {
          quote: "We lost 3 customer subscriptions because Stripe webhook failed silently.",
          source: "Reddit",
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = validateOpportunity(opp);

    expect(result.validation_score).toBeGreaterThanOrEqual(70);
    expect(result.decision).toBe("TEST_CANDIDATE");
    expect(result.validation_status).toBe("TEST_CANDIDATE");
    expect(result.customer_profile.target_segment).toBe("SaaS backend developers");
    expect(result.customer_profile.pain_points.some((p) => p.nature === "EVIDENCE")).toBe(true);
    expect(result.competitors.length).toBeGreaterThan(0);
    expect(result.experiment_proposal.cost_estimate_inr).toBe(0);
    expect(result.preconditions.is_candidate).toBe(true);
    expect(result.explanation.why.length).toBeGreaterThan(0);
  });
});
