import {
  createCheckoutSession,
  getCheckoutSessionById,
  updateCheckoutSession,
  getOfferById,
} from "@/database/repositories/sales-repo";
import { logAudit } from "@/database/repositories/audit-repo";
import { CustomerManager } from "./customer";
import { getPaymentProvider } from "./providers";
import { CreateCheckoutOptions, CheckoutResult } from "./types";
import { CheckoutSession, PaymentProvider } from "@/types/sales";

export class CheckoutEngine {
  /**
   * Generates a new checkout session for an offer.
   */
  static async initiateCheckout(options: CreateCheckoutOptions): Promise<CheckoutResult> {
    const offer = await getOfferById(options.offerId);
    if (!offer) {
      throw new Error(`Offer not found: ${options.offerId}`);
    }

    if (offer.status !== "ACTIVE") {
      throw new Error(`Offer is not active (current status: ${offer.status})`);
    }

    // Determine customer if email is provided
    let customerId: string | null = null;
    if (options.customerEmail) {
      const customer = await CustomerManager.getOrCreateCustomer({
        email: options.customerEmail,
        name: options.customerName,
        source: options.attribution?.utmSource ?? "direct",
        isDemo: options.isDemo,
      });
      customerId = customer.id;
    }

    const isFree = offer.is_free || offer.primary_price_cents === 0;
    const amountCents = isFree ? 0 : offer.primary_price_cents;
    const currency = isFree ? (options.currency ?? "INR") : offer.primary_currency;

    // Determine payment provider
    let provider: PaymentProvider = options.provider ?? (isFree ? "MANUAL" : "STRIPE");
    if (isFree) {
      provider = "MANUAL";
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours expiry

    // Create session in database
    const session = await createCheckoutSession({
      offer_id: offer.id,
      customer_id: customerId,
      customer_email: options.customerEmail ?? null,
      customer_name: options.customerName ?? null,
      provider,
      status: "PENDING",
      amount_cents: amountCents,
      currency,
      is_free: isFree,
      success_url: options.successUrl ?? `/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: options.cancelUrl ?? `/checkout/cancelled?session_id={CHECKOUT_SESSION_ID}`,
      expires_at: expiresAt,
      attribution: options.attribution ?? {},
      metadata: {
        offerTitle: offer.title,
        productId: offer.product_id,
      },
      is_demo: options.isDemo ?? false,
    });

    // Delegate to provider adapter
    const adapter = getPaymentProvider(provider);
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    const providerResult = await adapter.createCheckoutSession({
      sessionId: session.id,
      orderNumber,
      title: offer.title,
      amountCents,
      currency,
      customerEmail: options.customerEmail,
      customerName: options.customerName,
      successUrl: (options.successUrl ?? `/checkout/success`).replace("{CHECKOUT_SESSION_ID}", session.id),
      cancelUrl: (options.cancelUrl ?? `/checkout/cancelled`).replace("{CHECKOUT_SESSION_ID}", session.id),
      metadata: {
        offerId: offer.id,
        productId: offer.product_id,
        sessionId: session.id,
      },
    });

    if (providerResult.providerSessionId) {
      await updateCheckoutSession(session.id, {
        provider_session_id: providerResult.providerSessionId,
      });
    }

    logAudit({
      event_type: "CHECKOUT_SESSION_CREATED",
      entity_type: "CHECKOUT_SESSION",
      entity_id: session.id,
      actor: "customer",
      details: {
        offerId: offer.id,
        amountCents,
        isFree,
        provider,
      },
    }).catch(() => null);

    return providerResult;
  }

  /**
   * Retrieves checkout session details
   */
  static async getSession(sessionId: string): Promise<CheckoutSession | null> {
    return getCheckoutSessionById(sessionId);
  }

  /**
   * Marks checkout session completed
   */
  static async completeSession(sessionId: string): Promise<CheckoutSession> {
    const updated = await updateCheckoutSession(sessionId, { status: "COMPLETED" });
    if (!updated) throw new Error(`Failed to complete checkout session: ${sessionId}`);

    logAudit({
      event_type: "CHECKOUT_SESSION_COMPLETED",
      entity_type: "CHECKOUT_SESSION",
      entity_id: sessionId,
      actor: "system",
      details: { status: "COMPLETED" },
    }).catch(() => null);

    return updated;
  }
}
