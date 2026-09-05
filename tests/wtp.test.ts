import { describe, it, expect } from "vitest";
import { classifyWillingnessToPay } from "@/validation/wtp";

describe("Validation Engine — Willingness to Pay Classification", () => {
  it("classifies STRONG when explicit pricing / subscription mentions exist", () => {
    const evidence = [
      {
        quote: "I am paying $29/mo for an alternative and looking for something lighter.",
        source: "Hacker News",
      },
      {
        quote: "Would gladly pay $50/year if this automated my reporting.",
        source: "Reddit",
      },
    ];

    const result = classifyWillingnessToPay(evidence);
    expect(result.level).toBe("STRONG");
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.signals.length).toBeGreaterThanOrEqual(2);
  });

  it("classifies MODERATE when inquiries for commercial alternatives exist", () => {
    const evidence = [
      {
        quote: "Is there any commercial alternative or enterprise tool that handles this workflow?",
        source: "Reddit",
      },
    ];

    const result = classifyWillingnessToPay(evidence);
    expect(result.level).toBe("MODERATE");
    expect(result.score).toBeGreaterThanOrEqual(50);
    expect(result.score).toBeLessThan(80);
  });

  it("classifies WEAK when users primarily ask for free or hobbyist solutions", () => {
    const evidence = [
      {
        quote: "Looking for a free alternative or hobby side project that does this.",
        source: "GitHub",
      },
    ];

    const result = classifyWillingnessToPay(evidence);
    expect(result.level).toBe("WEAK");
    expect(result.score).toBeLessThan(50);
  });

  it("classifies NONE when users explicitly reject any commercial monetization", () => {
    const evidence = [
      {
        quote: "I will never pay for this, FOSS only, boycott any SaaS charging for it.",
        source: "Reddit",
      },
    ];

    const result = classifyWillingnessToPay(evidence);
    expect(result.level).toBe("NONE");
    expect(result.score).toBeLessThanOrEqual(20);
  });
});
