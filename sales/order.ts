import {
  createOrder,
  getOrderById,
  updateOrder,
  createOrderItem,
  createPayment,
  updatePayment,
  getPaymentByOrderId,
  getOfferById,
} from "@/database/repositories/sales-repo";
import { logAudit } from "@/database/repositories/audit-repo";
import { CustomerManager } from "./customer";
import { SalesGuard } from "./guard";
import { Order, Payment, PaymentProvider } from "@/types/sales";

export interface CompleteOrderInput {
  sessionId?: string;
  offerId: string;
  customerId: string;
  customerEmail?: string;
  customerName?: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  provider: PaymentProvider;
  amountCents: number;
  currency: string;
  isFree?: boolean;
  attribution?: Record<string, any>;
  metadata?: Record<string, any>;
  isDemo?: boolean;
}

export class OrderManager {
  /**
   * Generates a unique sequential order number
   */
  static generateOrderNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `ORD-${dateStr}-${rand}`;
  }

  /**
   * Creates a confirmed order upon successful checkout or webhook receipt.
   */
  static async createOrderFromCheckout(input: CompleteOrderInput): Promise<{ order: Order; payment: Payment }> {
    const offer = await getOfferById(input.offerId);
    if (!offer) throw new Error(`Offer not found: ${input.offerId}`);

    const isFree = input.isFree ?? (input.amountCents === 0 || offer.is_free);
    const orderNumber = this.generateOrderNumber();
    const paidAt = isFree || input.providerPaymentId ? new Date().toISOString() : null;
    const initialStatus = paidAt ? "PAID" : "PENDING";

    // 1. Create order record
    const order = await createOrder({
      order_number: orderNumber,
      customer_id: input.customerId,
      offer_id: input.offerId,
      product_id: offer.product_id,
      status: initialStatus,
      total_amount_cents: input.amountCents,
      currency: input.currency,
      is_free: isFree,
      checkout_session_id: input.sessionId ?? null,
      paid_at: paidAt,
      campaign_id: input.attribution?.campaignId ?? null,
      channel_id: input.attribution?.channelId ?? null,
      utm_source: input.attribution?.utmSource ?? null,
      utm_medium: input.attribution?.utmMedium ?? null,
      utm_campaign: input.attribution?.utmCampaign ?? null,
      metadata: input.metadata ?? {},
      is_demo: input.isDemo ?? false,
    });

    // 2. Create order item
    await createOrderItem({
      order_id: order.id,
      product_id: offer.product_id,
      offer_id: offer.id,
      title: offer.title,
      quantity: 1,
      unit_price_cents: input.amountCents,
      total_price_cents: input.amountCents,
      currency: input.currency,
      is_free: isFree,
    });

    // 3. Create payment record
    const payment = await createPayment({
      order_id: order.id,
      provider: input.provider,
      provider_payment_id: input.providerPaymentId ?? null,
      provider_order_id: input.providerOrderId ?? null,
      amount_cents: input.amountCents,
      currency: input.currency,
      status: paidAt ? "CAPTURED" : "INITIATED",
      is_free: isFree,
      captured_at: paidAt,
      metadata: input.metadata ?? {},
      is_demo: input.isDemo ?? false,
    });

    // 4. Update customer stats if paid
    if (order.status === "PAID") {
      await CustomerManager.recordOrderStats(input.customerId, input.amountCents);
    }

    logAudit({
      event_type: order.status === "PAID" ? "ORDER_PAID" : "ORDER_CREATED",
      entity_type: "ORDER",
      entity_id: order.id,
      actor: "system",
      details: {
        orderNumber: order.order_number,
        amountCents: order.total_amount_cents,
        isFree: order.is_free,
        status: order.status,
      },
    }).catch(() => null);

    return { order, payment };
  }

  /**
   * Confirms order payment from external payment gateway webhook.
   */
  static async markOrderPaid(orderId: string, providerPaymentId: string): Promise<Order> {
    const order = await getOrderById(orderId);
    if (!order) throw new Error(`Order not found: ${orderId}`);

    if (order.status === "PAID") {
      return order; // idempotent
    }

    const now = new Date().toISOString();

    // Update payment record
    const payment = await getPaymentByOrderId(orderId);
    if (payment) {
      await updatePayment(payment.id, {
        status: "CAPTURED",
        provider_payment_id: providerPaymentId,
        captured_at: now,
      });
    }

    const updated = await updateOrder(orderId, {
      status: "PAID",
      paid_at: now,
    });

    if (!updated) throw new Error(`Failed to update order status: ${orderId}`);

    // Update customer spending stats
    await CustomerManager.recordOrderStats(order.customer_id, order.total_amount_cents);

    logAudit({
      event_type: "ORDER_PAID",
      entity_type: "ORDER",
      entity_id: orderId,
      actor: "system",
      details: { providerPaymentId, paid_at: now },
    }).catch(() => null);

    return updated;
  }
}
