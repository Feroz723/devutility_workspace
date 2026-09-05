import { describe, it, expect } from "vitest";
import { SalesPricingEngine } from "@/sales/pricing";

describe("SalesPricingEngine", () => {
  it("formats INR and USD display prices correctly", () => {
    expect(SalesPricingEngine.formatDisplayPrice(0, "INR")).toBe("Free");
    expect(SalesPricingEngine.formatDisplayPrice(49900, "INR")).toBe("₹499");
    expect(SalesPricingEngine.formatDisplayPrice(1999, "USD")).toBe("$19.99");
  });

  it("converts INR major units to paise", () => {
    expect(SalesPricingEngine.inrToPaise(499)).toBe(49900);
    expect(SalesPricingEngine.inrToPaise(99.5)).toBe(9950);
  });

  it("recommends Free model for FREE_TOOL when no paid intent is found", () => {
    const rec = SalesPricingEngine.recommendPricing({
      productType: "FREE_TOOL",
    });

    expect(rec.isFree).toBe(true);
    expect(rec.recommendedPriceCents).toBe(0);
    expect(rec.pricingModel).toBe("FREE");
    expect(rec.displayPrice).toBe("Free");
    expect(rec.valueTier).toBe("FREE_TIER");
  });

  it("calculates competitive entry price based on competitor pricing research", () => {
    const rec = SalesPricingEngine.recommendPricing({
      productType: "DOWNLOADABLE_PRODUCT",
      willingnessToPayEvidence: {
        competitorPricingInr: [500, 1000, 1500],
        hasPaymentIntent: true,
      },
    });

    expect(rec.isFree).toBe(false);
    // Median is 1000. Target is 70% of 1000 = 700 INR = 70000 paise
    expect(rec.recommendedPriceCents).toBe(70000);
    expect(rec.displayPrice).toBe("₹700");
    expect(rec.valueTier).toBe("ENTRY_LEVEL");
    expect(rec.marketComparison?.medianPriceCents).toBe(100000);
  });

  it("respects human user defined pricing override", () => {
    const rec = SalesPricingEngine.recommendPricing({
      userDefinedPriceInr: 1299,
    });

    expect(rec.isFree).toBe(false);
    expect(rec.recommendedPriceCents).toBe(129900);
    expect(rec.displayPrice).toBe("₹1,299");
    expect(rec.reasoning).toContain("User-defined pricing override");
  });

  it("respects human user setting price to 0 as free tier", () => {
    const rec = SalesPricingEngine.recommendPricing({
      userDefinedPriceInr: 0,
    });

    expect(rec.isFree).toBe(true);
    expect(rec.recommendedPriceCents).toBe(0);
    expect(rec.pricingModel).toBe("FREE");
  });
});
