import { describe, it, expect, vi } from "vitest";
import {
  submitCustomerFeedback,
  classifySentiment,
  getFeedbackSummary,
} from "@/customer-success/feedback";
import { clusterFeatureRequests } from "@/customer-success/feature-requests";
import * as csRepo from "@/database/repositories/customer-success-repo";
import * as auditRepo from "@/database/repositories/audit-repo";

describe("Customer Success - Feedback & Feature Clustering", () => {
  it("accurately classifies sentiment from score and comments", () => {
    expect(classifySentiment(null, 10)).toBe("POSITIVE");
    expect(classifySentiment(null, 3)).toBe("NEGATIVE");
    expect(classifySentiment(null, 7)).toBe("NEUTRAL");
    expect(classifySentiment("This tool is great and fast!")).toBe("POSITIVE");
    expect(classifySentiment("Completely broken, awful experience")).toBe("NEGATIVE");
  });

  it("calculates NPS score and CSAT average accurately", async () => {
    vi.spyOn(csRepo, "listCustomerFeedback").mockResolvedValueOnce([
      { feedback_type: "NPS", score: 10, sentiment: "POSITIVE" } as any,
      { feedback_type: "NPS", score: 9, sentiment: "POSITIVE" } as any,
      { feedback_type: "NPS", score: 8, sentiment: "NEUTRAL" } as any,
      { feedback_type: "NPS", score: 4, sentiment: "NEGATIVE" } as any,
      { feedback_type: "CSAT", score: 5, sentiment: "POSITIVE" } as any,
      { feedback_type: "CSAT", score: 4, sentiment: "POSITIVE" } as any,
    ]);

    const summary = await getFeedbackSummary();
    expect(summary.total_feedback).toBe(6);
    expect(summary.has_sufficient_data).toBe(true);
    // NPS: 2 promoters (10, 9), 1 passive (8), 1 detractor (4) -> (2 - 1) / 4 = +25
    expect(summary.nps_score).toBe(25);
    // CSAT: (5 + 4) / 2 = 4.5
    expect(summary.average_csat).toBe(4.5);
  });

  it("clusters feature requests into priority tiers based on frequency", async () => {
    vi.spyOn(csRepo, "listCustomerFeedback").mockResolvedValueOnce([
      { comment: "Please add dark mode theme support" } as any,
      { comment: "Dark mode would be awesome" } as any,
      { comment: "Need CSV and PDF export options" } as any,
    ]);
    vi.spyOn(csRepo, "listCustomerSupportRequests").mockResolvedValueOnce([]);

    const clusters = await clusterFeatureRequests();
    expect(clusters.length).toBeGreaterThanOrEqual(1);
    const darkModeCluster = clusters.find((c) => c.theme.includes("Dark Mode"));
    expect(darkModeCluster?.count).toBe(2);
    expect(darkModeCluster?.priority_tier).toBe("EMERGING");
  });
});
