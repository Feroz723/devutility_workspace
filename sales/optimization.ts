import { listOffers, listOrders } from "@/database/repositories/sales-repo";
import { OfferOptimizationRecommendation } from "./types";

export class SalesOptimizationEngine {
  /**
   * Evaluates active offers and generates actionable conversion and pricing optimizations.
   */
  static async evaluateOffers(): Promise<OfferOptimizationRecommendation[]> {
    const offers = await listOffers({ status: "ACTIVE", limit: 50 });
    const orders = await listOrders({ limit: 1000 });
    const recommendations: OfferOptimizationRecommendation[] = [];

    for (const offer of offers) {
      const offerOrders = orders.filter((o) => o.offer_id === offer.id);
      const paidOrders = offerOrders.filter((o) => o.status === "PAID");

      // 1. High traffic / views but zero conversions
      if (offerOrders.length === 0 && !offer.is_free) {
        recommendations.push({
          offerId: offer.id,
          title: offer.title,
          type: "PRICE_ADJUSTMENT",
          priority: "HIGH",
          recommendation: `Consider introducing a ₹0 free tier or introductory price cut for '${offer.title}'.`,
          rationale: "No paid orders recorded yet. Lowering the initial barrier to entry drives early user acquisition and activation.",
          proposedAction: {
            suggestedPriceCents: Math.round(offer.primary_price_cents * 0.7),
            currency: offer.primary_currency,
          },
        });
      }

      // 2. Missing risk reversal guarantees
      if ((!offer.guarantees || (offer.guarantees as string[]).length === 0) && !offer.is_free) {
        recommendations.push({
          offerId: offer.id,
          title: offer.title,
          type: "GUARANTEE_ADDITION",
          priority: "MEDIUM",
          recommendation: `Add a explicit 30-day money-back guarantee to '${offer.title}'.`,
          rationale: "Adding clear risk-reversal guarantees systematically reduces checkout drop-off for autonomous digital products.",
          proposedAction: {
            guaranteeText: "30-Day No-Questions-Asked Full Refund Guarantee",
          },
        });
      }

      // 3. High conversion - opportunity to test higher tier
      if (paidOrders.length > 20) {
        recommendations.push({
          offerId: offer.id,
          title: offer.title,
          type: "PRICE_ADJUSTMENT",
          priority: "LOW",
          recommendation: `Strong conversion signals detected on '${offer.title}'. Consider introducing a premium tier.`,
          rationale: `Offer has achieved ${paidOrders.length} paid orders. Market demand is validated.`,
          proposedAction: {
            suggestedUpsellPriceCents: Math.round(offer.primary_price_cents * 1.5),
          },
        });
      }
    }

    return recommendations;
  }
}
