import { PricingRecommendation } from "./types";
import { PricingModel } from "@/types/sales";

export interface PricingInputContext {
  productType?: string;
  willingnessToPayEvidence?: {
    estimatedBudgetInr?: number;
    competitorPricingInr?: number[];
    hasPaymentIntent?: boolean;
  };
  experimentData?: {
    totalWaitlist?: number;
    priceTestedInr?: number;
    conversionRatePercent?: number;
  };
  userDefinedPriceInr?: number;
}

export class SalesPricingEngine {
  /**
   * Currency formatting utility
   */
  static formatDisplayPrice(amountCents: number, currency = "INR"): string {
    if (amountCents === 0) return "Free";

    const majorUnits = amountCents / 100;
    if (currency.toUpperCase() === "INR") {
      return `₹${majorUnits.toLocaleString("en-IN")}`;
    } else if (currency.toUpperCase() === "USD") {
      return `$${majorUnits.toFixed(2)}`;
    }
    return `${currency} ${majorUnits.toFixed(2)}`;
  }

  /**
   * Converts INR amount to cents/paise
   */
  static inrToPaise(amountInr: number): number {
    return Math.round(amountInr * 100);
  }

  /**
   * Recommends pricing strategy based on Phase 4 research, Phase 5 experiment, and product characteristics.
   */
  static recommendPricing(context: PricingInputContext): PricingRecommendation {
    // 1. Check if user explicitly set a price
    if (context.userDefinedPriceInr !== undefined) {
      const isFree = context.userDefinedPriceInr <= 0;
      const paise = isFree ? 0 : this.inrToPaise(context.userDefinedPriceInr);
      return {
        pricingModel: isFree ? "FREE" : "ONE_TIME",
        recommendedPriceCents: paise,
        currency: "INR",
        displayPrice: this.formatDisplayPrice(paise, "INR"),
        isFree,
        confidenceScore: 0.95,
        reasoning: "User-defined pricing override applied.",
        valueTier: isFree ? "FREE_TIER" : paise < 100000 ? "ENTRY_LEVEL" : "STANDARD",
      };
    }

    // 2. Free product types check
    const freeProductTypes = ["FREE_TOOL", "TEMPLATE", "AUTOMATION"];
    if (context.productType && freeProductTypes.includes(context.productType.toUpperCase())) {
      // Unless strong competitor paid baseline exists, recommend Free for top-of-funnel
      if (!context.willingnessToPayEvidence?.hasPaymentIntent) {
        return {
          pricingModel: "FREE",
          recommendedPriceCents: 0,
          currency: "INR",
          displayPrice: "Free",
          isFree: true,
          confidenceScore: 0.9,
          reasoning: `Product type ${context.productType} is optimized as a ₹0 acquisition tool to drive user trust and distribution reach.`,
          valueTier: "FREE_TIER",
        };
      }
    }

    // 3. Evidence-based pricing from Phase 4 research
    if (context.willingnessToPayEvidence?.competitorPricingInr && context.willingnessToPayEvidence.competitorPricingInr.length > 0) {
      const prices = context.willingnessToPayEvidence.competitorPricingInr.filter(p => p > 0);
      if (prices.length > 0) {
        prices.sort((a, b) => a - b);
        const low = prices[0] ?? 499;
        const high = prices[prices.length - 1] ?? 499;
        const median = prices[Math.floor(prices.length / 2)] ?? 499;

        // Position at entry level below median for high autonomous conversion
        const targetPriceInr = Math.max(99, Math.round(median * 0.7));
        const paise = this.inrToPaise(targetPriceInr);

        return {
          pricingModel: "ONE_TIME",
          recommendedPriceCents: paise,
          currency: "INR",
          displayPrice: this.formatDisplayPrice(paise, "INR"),
          isFree: false,
          confidenceScore: 0.85,
          reasoning: `Validated from competitor intelligence: pricing anchored at 70% of market median (₹${median}), establishing competitive advantage at ₹${targetPriceInr}.`,
          marketComparison: {
            lowPriceCents: this.inrToPaise(low),
            highPriceCents: this.inrToPaise(high),
            medianPriceCents: this.inrToPaise(median),
          },
          valueTier: "ENTRY_LEVEL",
        };
      }
    }

    // 4. Experiment tested price from Phase 5
    if (context.experimentData?.priceTestedInr && context.experimentData.priceTestedInr > 0) {
      const paise = this.inrToPaise(context.experimentData.priceTestedInr);
      return {
        pricingModel: "ONE_TIME",
        recommendedPriceCents: paise,
        currency: "INR",
        displayPrice: this.formatDisplayPrice(paise, "INR"),
        isFree: false,
        confidenceScore: 0.8,
        reasoning: `Anchored to Phase 5 experiment tested price of ₹${context.experimentData.priceTestedInr} with conversion signals.`,
        valueTier: paise < 100000 ? "ENTRY_LEVEL" : "STANDARD",
      };
    }

    // 5. Default safe entry tier
    const defaultPriceInr = 499;
    const defaultPaise = this.inrToPaise(defaultPriceInr);

    return {
      pricingModel: "ONE_TIME",
      recommendedPriceCents: defaultPaise,
      currency: "INR",
      displayPrice: this.formatDisplayPrice(defaultPaise, "INR"),
      isFree: false,
      confidenceScore: 0.6,
      reasoning: "Standard autonomous digital product default entry-level price (₹499).",
      valueTier: "ENTRY_LEVEL",
    };
  }
}
