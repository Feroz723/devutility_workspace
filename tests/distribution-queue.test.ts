import { describe, it, expect } from "vitest";
import { validateQueueTransition, generateQueueIdempotencyKey } from "@/distribution/queue";

describe("Distribution Queue State Machine & Idempotency", () => {
  it("permits valid forward state transitions", () => {
    expect(validateQueueTransition("DRAFT", "READY_FOR_REVIEW").valid).toBe(true);
    expect(validateQueueTransition("READY_FOR_REVIEW", "APPROVED").valid).toBe(true);
    expect(validateQueueTransition("APPROVED", "PUBLISHING").valid).toBe(true);
    expect(validateQueueTransition("PUBLISHING", "PUBLISHED").valid).toBe(true);
  });

  it("blocks illegal transitions (e.g. Published to Draft or Published to Publishing)", () => {
    expect(validateQueueTransition("PUBLISHED", "DRAFT").valid).toBe(false);
    expect(validateQueueTransition("PUBLISHED", "PUBLISHING").valid).toBe(false);
  });

  it("permits cancellation and retry from failed states", () => {
    expect(validateQueueTransition("READY_FOR_REVIEW", "CANCELLED").valid).toBe(true);
    expect(validateQueueTransition("FAILED", "READY_FOR_REVIEW").valid).toBe(true);
    expect(validateQueueTransition("FAILED", "CANCELLED").valid).toBe(true);
  });

  it("generates collision-resistant deterministic idempotency keys", () => {
    const key1 = generateQueueIdempotencyKey("camp1", "chan1", "asset1", "2026-09-04T12:00:00Z");
    const key2 = generateQueueIdempotencyKey("camp1", "chan1", "asset1", "2026-09-04T12:00:00Z");
    const key3 = generateQueueIdempotencyKey("camp1", "chan1", "asset2", "2026-09-04T12:00:00Z");

    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key1.startsWith("idemp_")).toBe(true);
  });
});
