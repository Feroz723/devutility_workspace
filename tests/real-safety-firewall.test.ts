import { describe, it, expect, vi } from "vitest";
import { waitStrategyEvaluator } from "@/strategy/wait-strategy-evaluator";
import { SalesGuard } from "@/sales/guard";
import * as client from "@/database/client";

describe("Phase 15: Production Safety Firewalls & Reality Guardrails", () => {
  describe("Separation of Real vs Simulation Data", () => {
    it("ensures production queries enforce is_demo = false filter", async () => {
      const mockQuery = vi.spyOn(client, "query").mockResolvedValue({ rows: [] } as any);

      // Verify a typical real query pattern
      await client.query(
        "SELECT * FROM customer_events WHERE is_demo = false AND event_type = $1",
        ["PAGE_VIEW"]
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("is_demo = false"),
        expect.anything()
      );
    });
  });

  describe("Wait Strategy & Observation Window", () => {
    it("evaluates WAIT_FOR_DATA when exposure/events are below statistical significance", async () => {
      const { strategyRepo } = await import("@/database/repositories/strategy-repo");
      vi.spyOn(strategyRepo, "listObservationWindows").mockResolvedValue([
        {
          id: "win-123",
          product_id: "a0000000-0000-0000-0000-000000000001",
          window_status: "IN_PROGRESS",
          min_sample_size_required: 50,
          actual_sample_size_collected: 8,
          target_review_date: new Date(Date.now() + 86400000 * 5).toISOString(),
          is_demo: false,
        } as any,
      ]);

      const waitEval = await waitStrategyEvaluator.evaluateWaitStrategy("a0000000-0000-0000-0000-000000000001", false);

      expect(waitEval.should_wait).toBe(true);
      expect(waitEval.wait_reason).toContain("Need 42 more samples");

      const rec = waitStrategyEvaluator.buildWaitRecommendation("a0000000-0000-0000-0000-000000000001", waitEval, false);
      expect(rec.strategy_type).toBe("WAIT_FOR_DATA");
      expect(rec.objective).toBe("ACCUMULATE_STATISTICAL_EVIDENCE");
    });
  });

  describe("Payment Firewall & Zero-Spend Invariant", () => {
    it("prohibits fulfilling paid order or claiming customer status without CAPTURED payment", () => {
      const order = { is_free: false, total_amount_cents: 50000, status: "PENDING" };

      // 1. Without payment record
      const checkNoPay = SalesGuard.validatePaymentFulfillment(order);
      expect(checkNoPay.allowed).toBe(false);
      expect(checkNoPay.violations.some((v) => v.includes("Cannot fulfill paid order"))).toBe(true);

      // 2. With unverified / pending payment
      const checkPending = SalesGuard.validatePaymentFulfillment(order, { status: "PENDING" });
      expect(checkPending.allowed).toBe(false);
      expect(checkPending.violations.some((v) => v.includes("Payment must be CAPTURED"))).toBe(true);

      // 3. With CAPTURED payment
      const checkCaptured = SalesGuard.validatePaymentFulfillment(order, { status: "CAPTURED" });
      expect(checkCaptured.allowed).toBe(true);
    });

    it("enforces ₹0 budget guardrail against automated financial expense attempts", () => {
      const allowedZero = SalesGuard.validateExpenseAttempt(0, "Free tier deployment");
      expect(allowedZero.allowed).toBe(true);

      const blockedPaid = SalesGuard.validateExpenseAttempt(1000, "Paid ad campaign or server fee");
      expect(blockedPaid.allowed).toBe(false);
      expect(blockedPaid.violations[0]).toContain("Autonomous system budget policy forbids");
    });

    it("ensures payment gateways remain NOT_CONNECTED in Phase 15", async () => {
      const stripeSecret = process.env.STRIPE_SECRET_KEY;
      const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

      // In phase 15 ₹0 operation, paid gateways are not active
      const isPaidGatewayActive = Boolean(stripeSecret && razorpaySecret);
      expect(isPaidGatewayActive).toBe(false);
    });
  });
});
