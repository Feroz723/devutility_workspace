import { describe, it, expect } from "vitest";
import { SalesGuard } from "@/sales/guard";

describe("SalesGuard - Zero-Spend and Financial Integrity", () => {
  it("blocks any automated expense attempt greater than 0", () => {
    const result = SalesGuard.validateExpenseAttempt(500, "Stripe monthly account fee");
    expect(result.allowed).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.reason).toContain("Autonomous system budget policy forbids automated financial outflow");
  });

  it("permits 0 expense operations", () => {
    const result = SalesGuard.validateExpenseAttempt(0, "Free tier digital deployment");
    expect(result.allowed).toBe(true);
    expect(result.violations.length).toBe(0);
  });

  it("permits immediate fulfillment for free products without payment record", () => {
    const order = {
      is_free: true,
      total_amount_cents: 0,
      status: "PENDING",
    };
    const result = SalesGuard.validatePaymentFulfillment(order);
    expect(result.allowed).toBe(true);
    expect(result.violations.length).toBe(0);
  });

  it("blocks fulfillment of paid order if payment record is missing", () => {
    const order = {
      is_free: false,
      total_amount_cents: 49900,
      status: "PENDING",
    };
    const result = SalesGuard.validatePaymentFulfillment(order, undefined);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Cannot fulfill paid order without an associated payment record");
  });

  it("blocks fulfillment if payment is not in CAPTURED state", () => {
    const order = {
      is_free: false,
      total_amount_cents: 49900,
      status: "PENDING",
    };
    const payment = { status: "INITIATED" };
    const result = SalesGuard.validatePaymentFulfillment(order, payment);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Payment must be CAPTURED before order fulfillment");
  });

  it("allows fulfillment of paid order once payment is CAPTURED", () => {
    const order = {
      is_free: false,
      total_amount_cents: 49900,
      status: "PAID",
    };
    const payment = { status: "CAPTURED" };
    const result = SalesGuard.validatePaymentFulfillment(order, payment);
    expect(result.allowed).toBe(true);
  });

  it("correctly sanitizes demo flag in test environment", () => {
    expect(SalesGuard.sanitizeDemoFlag(false, "test")).toBe(true);
    expect(SalesGuard.sanitizeDemoFlag(true, "production")).toBe(true);
    expect(SalesGuard.sanitizeDemoFlag(false, "production")).toBe(false);
  });
});
