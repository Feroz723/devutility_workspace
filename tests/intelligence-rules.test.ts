import { describe, it, expect } from "vitest";
import { stopRulesEvaluator } from "@/intelligence/stop-rules";
import { confidenceEvaluator } from "@/intelligence/confidence";
import { decisionStateMachine } from "@/intelligence/state-machine";
import type { ProductPerformance } from "@/types/intelligence";

describe("Phase 10 — Decision Rules, Confidence & State Machine", () => {
  describe("Confidence Evaluator & Insufficient Data Guards", () => {
    it("returns INSUFFICIENT_DATA when sample size is below minimum threshold", () => {
      const level = confidenceEvaluator.evaluateConfidence(3); // below default minThreshold 5
      expect(level).toBe("INSUFFICIENT_DATA");
    });

    it("evaluates HIGH confidence with large sample size and low contradictions", () => {
      const level = confidenceEvaluator.evaluateConfidence(50, 0);
      expect(level).toBe("HIGH");
    });

    it("evaluates MEDIUM confidence for moderate sample size", () => {
      const level = confidenceEvaluator.evaluateConfidence(20, 0);
      expect(level).toBe("MEDIUM");
    });

    it("evaluates LOW confidence when contradiction rate is high", () => {
      const level = confidenceEvaluator.evaluateConfidence(10, 5); // 50% contradiction
      expect(level).toBe("LOW");
    });
  });

  describe("Multi-Signal Stop Rules", () => {
    it("flags STOP_CANDIDATE when multiple negative signals coincide", () => {
      const failingProduct: ProductPerformance = {
        id: "prod-failing",
        product_id: "prod-failing",
        performance_tier: "STOP_CANDIDATE",
        traffic_count: 150,
        users_count: 10,
        customers_count: 5,
        revenue_inr: 2500,
        refund_rate_percent: 30, // Trigger 1 (>25%)
        churn_rate_percent: 70,  // Trigger 2 (>60%)
        support_burden_score: 85,
        customer_outcomes_score: 20,
        retention_rate_percent: 30,
        activation_rate_percent: 40,
        feature_requests_count: 0,
        evaluation_summary: null,
        evidence: {},
        is_demo: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const evaluation = stopRulesEvaluator.evaluateProductStopRules(failingProduct);

      expect(evaluation.isStopCandidate).toBe(true);
      expect(evaluation.triggeredSignals.length).toBeGreaterThanOrEqual(2);
      expect(evaluation.recommendedAction).toBe("STOP");
      expect(evaluation.requiresHumanApproval).toBe(true);
    });

    it("does not flag STOP_CANDIDATE when metrics are healthy", () => {
      const healthyProduct: ProductPerformance = {
        id: "prod-healthy",
        product_id: "prod-healthy",
        performance_tier: "WINNER",
        traffic_count: 200,
        users_count: 50,
        customers_count: 25,
        revenue_inr: 50000,
        refund_rate_percent: 2,
        churn_rate_percent: 5,
        support_burden_score: 10,
        customer_outcomes_score: 95,
        retention_rate_percent: 92,
        activation_rate_percent: 88,
        feature_requests_count: 5,
        evaluation_summary: null,
        evidence: {},
        is_demo: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const evaluation = stopRulesEvaluator.evaluateProductStopRules(healthyProduct);

      expect(evaluation.isStopCandidate).toBe(false);
      expect(evaluation.triggeredSignals).toHaveLength(0);
      expect(evaluation.recommendedAction).toBe("CONTINUE");
    });

    it("requires human approval for any destructive product stop action", () => {
      const productWithSignals: ProductPerformance = {
        id: "prod-candidate",
        product_id: "prod-candidate",
        performance_tier: "STOP_CANDIDATE",
        traffic_count: 200,
        users_count: 10,
        customers_count: 0, // Trigger 1: zero sales with high traffic
        revenue_inr: 0,
        refund_rate_percent: 0,
        churn_rate_percent: 0,
        support_burden_score: 85, // Trigger 2: high burden with low outcome
        customer_outcomes_score: 10,
        retention_rate_percent: 0,
        activation_rate_percent: 0,
        feature_requests_count: 0,
        evaluation_summary: null,
        evidence: {},
        is_demo: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const evaluation = stopRulesEvaluator.evaluateProductStopRules(productWithSignals);

      expect(evaluation.requiresHumanApproval).toBe(true);
    });
  });

  describe("Decision State Machine", () => {
    it("validates legal lifecycle transition PROPOSED -> APPROVED", () => {
      const res = decisionStateMachine.validateTransition("PROPOSED", "APPROVED");
      expect(res.isValid).toBe(true);
    });

    it("validates legal lifecycle transition APPROVED -> EXECUTING", () => {
      const res = decisionStateMachine.validateTransition("APPROVED", "EXECUTING");
      expect(res.isValid).toBe(true);
    });

    it("validates legal lifecycle transition EXECUTING -> COMPLETED", () => {
      const res = decisionStateMachine.validateTransition("EXECUTING", "COMPLETED");
      expect(res.isValid).toBe(true);
    });

    it("rejects illegal transitions like PROPOSED -> EXECUTING when not allowed", () => {
      const res = decisionStateMachine.validateTransition("PROPOSED", "EXECUTING", true);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Invalid decision transition from PROPOSED to EXECUTING");
    });

    it("allows rejection from PROPOSED status", () => {
      const res = decisionStateMachine.validateTransition("PROPOSED", "REJECTED");
      expect(res.isValid).toBe(true);
    });

    it("cannot transition from final states like COMPLETED or REJECTED", () => {
      const res1 = decisionStateMachine.validateTransition("COMPLETED", "APPROVED");
      expect(res1.isValid).toBe(false);

      const res2 = decisionStateMachine.validateTransition("REJECTED", "EXECUTING");
      expect(res2.isValid).toBe(false);
    });
  });
});
