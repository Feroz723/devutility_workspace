import { queryMany } from "@/database/client";
import { offerPerformanceEvaluator } from "./offer-performance";
import type { PortfolioDecisionType, IntelligenceConfidence } from "./types";

export interface OfferDecisionResult {
  offer_id: string;
  decision: PortfolioDecisionType;
  confidence: IntelligenceConfidence;
  conversion_rate_percent: number;
  refund_rate_percent: number;
  pricing_recommendation: string;
  rationale: string;
  requires_approval: boolean; // Always true for pricing/offer alterations
}

export class SalesDecisionEngine {
  /**
   * Evaluate all active offers and formulate commercial recommendations
   */
  async evaluateOffers(isDemo: boolean = false): Promise<OfferDecisionResult[]> {
    const offers = await queryMany<any>(
      `SELECT id, product_id, title, price_inr, status
       FROM offers
       WHERE is_demo = $1`,
      [isDemo]
    );

    const decisions: OfferDecisionResult[] = [];

    for (const offer of offers) {
      const perf = await offerPerformanceEvaluator.evaluateOffer(offer.id, isDemo);
      let decision: PortfolioDecisionType = "MAINTAIN";
      let confidence: IntelligenceConfidence = "LOW";
      let pricingRec = "Keep current price point.";
      let rationale = "";

      const views = perf.views_count;
      const conv = perf.conversion_rate_percent;
      const refunds = perf.refund_rate_percent;

      if (views < 10) {
        decision = "RESEARCH_MORE";
        confidence = "INSUFFICIENT_DATA";
        pricingRec = "Maintain price. Gather minimum 20 checkout views before adjusting.";
        rationale = "Insufficient traffic volume to determine pricing elasticity.";
      } else if (refunds > 20) {
        decision = "ITERATE";
        confidence = "HIGH";
        pricingRec = "Pause offer marketing and re-evaluate expectation alignment or guarantee terms.";
        rationale = `Excessive refund rate (${refunds.toFixed(1)}%). Indicates potential gap between offer promise and delivery.`;
      } else if (conv > 5.0 && refunds <= 5) {
        decision = "SCALE";
        confidence = "HIGH";
        pricingRec = `Strong demand validation. Opportunity to test a +15% premium price point (e.g. ₹${Math.round(offer.price_inr * 1.15)}) or annual billing option.`;
        rationale = `High checkout conversion (${conv.toFixed(1)}%) and low refund rate (${refunds.toFixed(1)}%).`;
      } else if (conv < 1.0 && views >= 30) {
        decision = "ITERATE";
        confidence = "MEDIUM";
        pricingRec = `Consider testing an introductory tier at ₹${Math.round(offer.price_inr * 0.75)} or a 14-day risk-free guarantee.`;
        rationale = `Low checkout conversion (${conv.toFixed(1)}%) suggests checkout friction or price-to-value friction.`;
      } else {
        decision = "MAINTAIN";
        confidence = "MEDIUM";
        pricingRec = "Maintain current pricing configuration.";
        rationale = "Performance matches standard operational benchmarks.";
      }

      decisions.push({
        offer_id: offer.id,
        decision,
        confidence,
        conversion_rate_percent: conv,
        refund_rate_percent: refunds,
        pricing_recommendation: pricingRec,
        rationale,
        requires_approval: true, // MANDATORY: Live pricing changes require operator review
      });
    }

    return decisions;
  }
}

export const salesDecisionEngine = new SalesDecisionEngine();
