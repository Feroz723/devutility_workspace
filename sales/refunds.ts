import {
  getOrderById,
  updateOrder,
  getPaymentByOrderId,
  createRefund,
  updateRefund,
  listRefunds,
  getCustomerEntitlements,
} from "@/database/repositories/sales-repo";
import { logAudit } from "@/database/repositories/audit-repo";
import { EntitlementEngine } from "./entitlements";
import { Refund } from "@/types/sales";

export interface RequestRefundOptions {
  orderId: string;
  reason?: string;
  amountCents?: number;
}

export class RefundManager {
  /**
   * Initiates and processes a customer refund, safely revoking product entitlements.
   */
  static async processRefund(options: RequestRefundOptions): Promise<Refund> {
    const order = await getOrderById(options.orderId);
    if (!order) throw new Error(`Order not found: ${options.orderId}`);

    if (order.status !== "PAID" && order.status !== "PARTIALLY_REFUNDED") {
      throw new Error(`Cannot refund order with status: ${order.status}`);
    }

    const refundAmount = options.amountCents ?? order.total_amount_cents;
    if (refundAmount <= 0) {
      throw new Error("Refund amount must be greater than zero");
    }

    if (refundAmount > order.total_amount_cents) {
      throw new Error("Refund amount cannot exceed total order amount");
    }

    const payment = await getPaymentByOrderId(order.id);

    logAudit({
      event_type: "REFUND_REQUESTED",
      entity_type: "ORDER",
      entity_id: order.id,
      actor: "system",
      details: { amountCents: refundAmount, reason: options.reason },
    }).catch(() => null);

    // 1. Create refund record
    const refund = await createRefund({
      order_id: order.id,
      payment_id: payment?.id ?? null,
      customer_id: order.customer_id,
      amount_cents: refundAmount,
      currency: order.currency,
      reason: options.reason ?? "Customer requested refund",
      status: "PROCESSED",
      processed_at: new Date().toISOString(),
      is_demo: order.is_demo,
    });

    // 2. Revoke active customer entitlements for this order
    const entitlements = await getCustomerEntitlements({
      customerId: order.customer_id,
      productId: order.product_id,
      status: "ACTIVE",
    });

    for (const ent of entitlements) {
      if (ent.order_id === order.id) {
        await EntitlementEngine.revokeEntitlement(ent.id, `Order ${order.order_number} refunded`).catch(() => null);
      }
    }

    // 3. Update order status
    const isFullRefund = refundAmount >= order.total_amount_cents;
    await updateOrder(order.id, {
      status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
    });

    logAudit({
      event_type: "REFUND_PROCESSED",
      entity_type: "REFUND",
      entity_id: refund.id,
      actor: "system",
      details: {
        orderId: order.id,
        amountCents: refundAmount,
        isFullRefund,
      },
    }).catch(() => null);

    return refund;
  }
}
