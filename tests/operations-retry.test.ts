import { describe, it, expect } from "vitest";
import { retryEngine } from "@/operations/retry-engine";
import type { OperationsJob } from "@/types/operations";

describe("Phase 11 — Failure Classification & Exponential Retry Engine", () => {
  describe("Error Classification", () => {
    it("correctly identifies TRANSIENT network errors", () => {
      expect(retryEngine.classifyError(new Error("connect ECONNREFUSED 127.0.0.1:5432"))).toBe("TRANSIENT");
      expect(retryEngine.classifyError(new Error("gateway timeout 504"))).toBe("TRANSIENT");
      expect(retryEngine.classifyError(new Error("socket hang up"))).toBe("TRANSIENT");
    });

    it("correctly identifies RATE_LIMIT errors", () => {
      expect(retryEngine.classifyError(new Error("HTTP 429 Too Many Requests"))).toBe("RATE_LIMIT");
      expect(retryEngine.classifyError(new Error("rate limit reached"))).toBe("RATE_LIMIT");
    });

    it("correctly identifies MANUAL_SETUP / NOT_CONNECTED errors", () => {
      expect(retryEngine.classifyError(new Error("Razorpay provider status: NOT_CONNECTED"))).toBe("MANUAL_SETUP");
      expect(retryEngine.classifyError(new Error("Missing API Key for Anthropic Claude"))).toBe("MANUAL_SETUP");
    });

    it("correctly identifies SECURITY and spending violations", () => {
      expect(retryEngine.classifyError(new Error("Security violation: SSRF attempt to internal IP"))).toBe("SECURITY");
      expect(retryEngine.classifyError(new Error("Prohibited: Automatic spending limit ₹0 exceeded"))).toBe("SECURITY");
    });

    it("correctly identifies VALIDATION and schema errors", () => {
      expect(retryEngine.classifyError(new Error("Zod validation error: Invalid UUID for campaign_id"))).toBe("VALIDATION");
    });

    it("defaults unknown non-transient errors to PERMANENT", () => {
      expect(retryEngine.classifyError(new Error("Unexpected internal logic error"))).toBe("PERMANENT");
    });
  });

  describe("Retry Eligibility", () => {
    it("allows retry only for TRANSIENT and RATE_LIMIT failures", () => {
      expect(retryEngine.isRetryable("TRANSIENT")).toBe(true);
      expect(retryEngine.isRetryable("RATE_LIMIT")).toBe(true);
      expect(retryEngine.isRetryable("AUTHENTICATION")).toBe(false);
      expect(retryEngine.isRetryable("MANUAL_SETUP")).toBe(false);
      expect(retryEngine.isRetryable("SECURITY")).toBe(false);
      expect(retryEngine.isRetryable("VALIDATION")).toBe(false);
      expect(retryEngine.isRetryable("PERMANENT")).toBe(false);
    });
  });

  describe("Exponential Backoff Calculation", () => {
    it("computes backoff with exponential scaling capped at max_backoff", () => {
      const policy = { backoff_base_ms: 1000, backoff_factor: 2, max_backoff_ms: 10000 };

      // Attempt 1: ~1000ms (within 800 - 1200 with jitter)
      const b1 = retryEngine.computeBackoffMs(1, policy);
      expect(b1).toBeGreaterThanOrEqual(700);
      expect(b1).toBeLessThanOrEqual(1300);

      // Attempt 2: ~2000ms (within 1600 - 2400 with jitter)
      const b2 = retryEngine.computeBackoffMs(2, policy);
      expect(b2).toBeGreaterThanOrEqual(1500);
      expect(b2).toBeLessThanOrEqual(2500);

      // Attempt 10: capped at max 10000
      const b10 = retryEngine.computeBackoffMs(10, policy);
      expect(b10).toBeLessThanOrEqual(10000);
    });
  });

  describe("Failure Outcome Evaluation", () => {
    const baseJob: OperationsJob = {
      id: "a0000000-0000-0000-0000-000000000003",
      name: "Research Cycle Job",
      module: "RESEARCH",
      action: "RUN_CYCLE",
      status: "RUNNING",
      idempotency_key: "idem-fail",
      depends_on: [],
      blocks: [],
      priority: 50,
      retry_policy: { max_attempts: 3, backoff_base_ms: 1000, backoff_factor: 2, max_backoff_ms: 30000 },
      attempts: 0,
      max_attempts: 3,
      failure_classification: null,
      last_error: null,
      error_stack: null,
      timeout_seconds: 300,
      started_at: new Date().toISOString(),
      completed_at: null,
      next_run_at: null,
      required_approval: false,
      approval_id: null,
      required_integration: null,
      resource_requirement: { time_weight: 1, compute_weight: 1 },
      safety_classification: "ZERO_COST_AUTO",
      payload: {},
      result: null,
      is_demo: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it("schedules RETRYING status for transient network failure under max attempts", () => {
      const outcome = retryEngine.evaluateFailureOutcome(
        { ...baseJob, attempts: 1, max_attempts: 3 },
        new Error("ETIMEDOUT")
      );

      expect(outcome.shouldRetry).toBe(true);
      expect(outcome.nextStatus).toBe("RETRYING");
      expect(outcome.classification).toBe("TRANSIENT");
      expect(outcome.nextRunAt).toBeDefined();
    });

    it("routes to DEAD_LETTER when max attempts are reached", () => {
      const outcome = retryEngine.evaluateFailureOutcome(
        { ...baseJob, attempts: 2, max_attempts: 3 }, // next attempt would be 3 >= max_attempts
        new Error("ETIMEDOUT")
      );

      expect(outcome.shouldRetry).toBe(false);
      expect(outcome.nextStatus).toBe("DEAD_LETTER");
      expect(outcome.classification).toBe("TRANSIENT");
    });

    it("routes immediately to REQUIRES_MANUAL_SETUP for missing credentials", () => {
      const outcome = retryEngine.evaluateFailureOutcome(
        baseJob,
        new Error("Razorpay provider status: NOT_CONNECTED")
      );

      expect(outcome.shouldRetry).toBe(false);
      expect(outcome.nextStatus).toBe("REQUIRES_MANUAL_SETUP");
      expect(outcome.classification).toBe("MANUAL_SETUP");
    });

    it("routes non-retryable PERMANENT or VALIDATION errors immediately to DEAD_LETTER", () => {
      const outcome = retryEngine.evaluateFailureOutcome(
        baseJob,
        new Error("Zod validation failed: invalid format")
      );

      expect(outcome.shouldRetry).toBe(false);
      expect(outcome.nextStatus).toBe("DEAD_LETTER");
      expect(outcome.classification).toBe("VALIDATION");
    });
  });
});
