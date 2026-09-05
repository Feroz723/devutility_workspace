import {
  createOffer,
  updateOffer,
  createOfferPrice,
  getOfferById,
  getOfferBySlug,
  listOffers,
} from "@/database/repositories/sales-repo";
import { getProductById } from "@/database/repositories/product-repo";
import { logAudit } from "@/database/repositories/audit-repo";
import { SalesEligibilityChecker } from "./eligibility";
import { SalesPricingEngine } from "./pricing";
import { Offer, CreateOfferInput, PricingModel } from "@/types/sales";

export interface GenerateOfferOptions {
  productId: string;
  customTitle?: string;
  customTagline?: string;
  pricingModel?: PricingModel;
  priceInr?: number;
  isFree?: boolean;
  requiresApproval?: boolean;
  isDemo?: boolean;
}

export class OfferManager {
  /**
   * Generates a slug from title
   */
  static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 60);
  }

  /**
   * Automatically packages a product into a public commercial or free Offer.
   */
  static async createOfferFromProduct(options: GenerateOfferOptions): Promise<Offer> {
    const eligibility = await SalesEligibilityChecker.checkProductEligibility(options.productId);
    if (!eligibility.eligible) {
      throw new Error(`Cannot create offer for product: ${eligibility.reason}`);
    }

    const product = await getProductById(options.productId);
    if (!product) throw new Error("Product not found");

    const pricing = SalesPricingEngine.recommendPricing({
      productType: product.product_type,
      userDefinedPriceInr: options.priceInr,
    });

    const isFree = options.isFree ?? pricing.isFree;
    const priceCents = isFree ? 0 : (options.priceInr ? SalesPricingEngine.inrToPaise(options.priceInr) : pricing.recommendedPriceCents);
    const title = options.customTitle ?? product.name;
    const baseSlug = this.generateSlug(title);
    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

    const prodAny = product as any;
    const deliverables = Array.isArray(prodAny.deliverables) ? prodAny.deliverables : [
      "Full digital product access / download package",
      "Comprehensive setup and user guide",
      "Direct updates & release notes",
    ];

    const guarantees = isFree
      ? ["100% Free Forever", "No credit card required", "Instant digital access"]
      : ["30-Day Money-Back Guarantee", "Instant digital delivery", "Dedicated support"];

    const faq = [
      {
        question: "How do I receive access after ordering?",
        answer: "Immediately upon checkout completion, you will be redirected to your secure download and entitlement page, and access details will be shown on screen.",
      },
      {
        question: "Are there any recurring hidden fees?",
        answer: isFree ? "None. This product is 100% free with no surprise charges." : "No. It is a single one-time payment with lifetime access to the purchased version.",
      },
    ];

    const offerInput: CreateOfferInput = {
      product_id: product.id,
      title,
      slug: uniqueSlug,
      tagline: options.customTagline ?? prodAny.tagline ?? product.value_proposition ?? "Production-ready autonomous digital product",
      description: product.description ?? product.solution ?? "Built autonomously with full verification.",
      pricing_model: options.pricingModel ?? pricing.pricingModel,
      status: "DRAFT",
      features: (prodAny.features as string[]) ?? [
        "Production-tested codebase",
        "Automated deployment workflows",
        "Clean architecture and zero external runtime dependencies",
      ],
      deliverables,
      guarantees,
      faq,
      primary_price_cents: priceCents,
      primary_currency: "INR",
      is_free: isFree,
      requires_approval: options.requiresApproval ?? false,
      is_approved: !options.requiresApproval,
      metadata: {
        valueTier: pricing.valueTier,
        pricingConfidence: pricing.confidenceScore,
        pricingReasoning: pricing.reasoning,
      },
      is_demo: options.isDemo ?? false,
    };

    const offer = await createOffer(offerInput);

    // Create primary price tier in offer_prices
    await createOfferPrice({
      offer_id: offer.id,
      currency: "INR",
      amount_cents: priceCents,
      display_amount: SalesPricingEngine.formatDisplayPrice(priceCents, "INR"),
      is_free: isFree,
      interval: offer.pricing_model === "SUBSCRIPTION" ? "month" : null,
      is_active: true,
    });

    // Also create secondary USD price if paid
    if (!isFree) {
      const approxUsdCents = Math.round((priceCents / 85)); // ~₹85 per USD
      await createOfferPrice({
        offer_id: offer.id,
        currency: "USD",
        amount_cents: approxUsdCents,
        display_amount: SalesPricingEngine.formatDisplayPrice(approxUsdCents, "USD"),
        is_free: false,
        interval: offer.pricing_model === "SUBSCRIPTION" ? "month" : null,
        is_active: true,
      });
    }

    logAudit({
      event_type: "OFFER_CREATED",
      entity_type: "OFFER",
      entity_id: offer.id,
      actor: "system",
      details: { title: offer.title, is_free: isFree, priceCents, slug: offer.slug },
    }).catch(() => null);

    return offer;
  }

  /**
   * Publishes an offer to make it live for checkout
   */
  static async publishOffer(offerId: string): Promise<Offer> {
    const offer = await getOfferById(offerId);
    if (!offer) throw new Error("Offer not found");

    if (offer.requires_approval && !offer.is_approved) {
      throw new Error("Cannot publish offer: human approval is required.");
    }

    const updated = await updateOffer(offerId, { status: "ACTIVE" });
    if (!updated) throw new Error("Failed to activate offer");

    logAudit({
      event_type: "OFFER_PUBLISHED",
      entity_type: "OFFER",
      entity_id: offerId,
      actor: "system",
      details: { title: offer.title, status: "ACTIVE" },
    }).catch(() => null);

    return updated;
  }

  /**
   * Pauses an offer
   */
  static async pauseOffer(offerId: string): Promise<Offer> {
    const updated = await updateOffer(offerId, { status: "PAUSED" });
    if (!updated) throw new Error("Failed to pause offer");

    logAudit({
      event_type: "OFFER_PAUSED",
      entity_type: "OFFER",
      entity_id: offerId,
      actor: "system",
      details: { status: "PAUSED" },
    }).catch(() => null);

    return updated;
  }
}
