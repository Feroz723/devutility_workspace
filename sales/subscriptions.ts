import {
  createSubscription,
  getSubscriptionById,
  updateSubscription,
  listSubscriptions,
} from "@/database/repositories/sales-repo";
import { logAudit } from "@/database/repositories/audit-repo";
import { Subscription, PaymentProvider, SubscriptionStatus } from "@/types/sales";

export interface CreateSubscriptionOptions {
  customerId: string;
  offerId: string;
  productId: string;
  provider: PaymentProvider;
  providerSubscriptionId?: string;
  amountCents: number;
  currency?: string;
  interval?: string;
  intervalCount?: number;
  isDemo?: boolean;
}

export class SubscriptionManager {
  /**
   * Registers a new recurring subscription.
   */
  static async registerSubscription(options: CreateSubscriptionOptions): Promise<Subscription> {
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // default +30 days

    const sub = await createSubscription({
      customer_id: options.customerId,
      offer_id: options.offerId,
      product_id: options.productId,
      provider: options.provider,
      provider_subscription_id: options.providerSubscriptionId ?? null,
      status: "ACTIVE",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      interval: options.interval ?? "month",
      interval_count: options.intervalCount ?? 1,
      amount_cents: options.amountCents,
      currency: options.currency ?? "INR",
      is_demo: options.isDemo ?? false,
    });

    logAudit({
      event_type: "SUBSCRIPTION_CREATED",
      entity_type: "SUBSCRIPTION",
      entity_id: sub.id,
      actor: "system",
      details: {
        provider: options.provider,
        amountCents: options.amountCents,
        interval: sub.interval,
      },
    }).catch(() => null);

    return sub;
  }

  /**
   * Updates subscription lifecycle status (e.g. from webhook).
   */
  static async updateStatus(subscriptionId: string, status: SubscriptionStatus): Promise<Subscription> {
    const updated = await updateSubscription(subscriptionId, { status });
    if (!updated) throw new Error(`Subscription not found: ${subscriptionId}`);

    logAudit({
      event_type: "SUBSCRIPTION_UPDATED",
      entity_type: "SUBSCRIPTION",
      entity_id: subscriptionId,
      actor: "system",
      details: { status },
    }).catch(() => null);

    return updated;
  }

  /**
   * Cancels subscription at period end or immediately.
   */
  static async cancelSubscription(subscriptionId: string, cancelImmediately = false): Promise<Subscription> {
    const now = new Date().toISOString();
    const updated = await updateSubscription(subscriptionId, {
      status: cancelImmediately ? "CANCELLED" : "ACTIVE",
      cancel_at_period_end: !cancelImmediately,
      cancelled_at: now,
      ended_at: cancelImmediately ? now : undefined,
    });

    if (!updated) throw new Error(`Subscription not found: ${subscriptionId}`);

    logAudit({
      event_type: "SUBSCRIPTION_CANCELLED",
      entity_type: "SUBSCRIPTION",
      entity_id: subscriptionId,
      actor: "system",
      details: { cancelImmediately },
    }).catch(() => null);

    return updated;
  }
}
