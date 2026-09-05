import {
  getOrderById,
  updateOrder,
  getCustomerById,
  getPaymentByOrderId,
  getOfferById,
  createDelivery,
  createDeliveryItem,
  updateDelivery,
  getDeliveryByOrderId,
  listDeliveries,
} from "@/database/repositories/sales-repo";
import { getProductById, listProductArtifacts } from "@/database/repositories/product-repo";
import { logAudit } from "@/database/repositories/audit-repo";
import { EntitlementEngine } from "./entitlements";
import { SalesGuard } from "./guard";
import { SalesEmailService } from "./email";
import { DeliveryResult } from "./types";

export class DeliveryEngine {
  /**
   * Fulfills an order by granting entitlement, packaging artifacts, and generating access link.
   */
  static async fulfillOrder(orderId: string): Promise<DeliveryResult> {
    const order = await getOrderById(orderId);
    if (!order) throw new Error(`Order not found: ${orderId}`);

    const customer = await getCustomerById(order.customer_id);
    if (!customer) throw new Error(`Customer not found for order: ${orderId}`);

    const offer = await getOfferById(order.offer_id);
    const product = await getProductById(order.product_id);
    const payment = await getPaymentByOrderId(orderId);

    // 1. Guard check: Validate payment status unless order is free
    const guardCheck = SalesGuard.validatePaymentFulfillment(
      { is_free: order.is_free, total_amount_cents: order.total_amount_cents, status: order.status },
      payment ? { status: payment.status } : undefined
    );

    if (!guardCheck.allowed) {
      throw new Error(`Order fulfillment blocked by SalesGuard: ${guardCheck.reason}`);
    }

    logAudit({
      event_type: "DELIVERY_ATTEMPTED",
      entity_type: "ORDER",
      entity_id: orderId,
      actor: "system",
      details: { orderNumber: order.order_number },
    }).catch(() => null);

    // 2. Grant Entitlement
    const entitlement = await EntitlementEngine.grantEntitlement({
      customerId: order.customer_id,
      productId: order.product_id,
      orderId: order.id,
      offerId: order.offer_id,
      entitlementType: "DOWNLOAD",
      isDemo: order.is_demo,
    });

    const accessLink = entitlement.access_url ?? `/customer/access?token=${entitlement.token}&product_id=${order.product_id}`;

    // 3. Create Delivery Record
    const delivery = await createDelivery({
      order_id: order.id,
      customer_id: order.customer_id,
      product_id: order.product_id,
      entitlement_id: entitlement.id,
      delivery_channel: "DOWNLOAD_PAGE",
      status: "PENDING",
      access_link: accessLink,
      is_demo: order.is_demo,
    });

    // 4. Attach Product Artifacts
    const artifacts = await listProductArtifacts(order.product_id).catch(() => []);
    let itemsCount = 0;

    if (artifacts.length > 0) {
      for (const artifact of artifacts) {
        await createDeliveryItem({
          delivery_id: delivery.id,
          product_artifact_id: artifact.id,
          name: artifact.file_path,
          artifact_type: artifact.artifact_type,
          download_url: `/api/customer/download?artifact_id=${artifact.id}&token=${entitlement.token}`,
          file_size_bytes: artifact.size_bytes,
        });
        itemsCount++;
      }
    } else {
      // Default bundle delivery item
      await createDeliveryItem({
        delivery_id: delivery.id,
        name: `${product?.name ?? "Product"} Package`,
        artifact_type: "DIGITAL_BUNDLE",
        download_url: accessLink,
      });
      itemsCount = 1;
    }

    // 5. Send Email Notification
    let emailSent = false;
    let emailId: string | undefined;
    if (customer.email) {
      const emailRes = await SalesEmailService.sendDeliveryEmail(
        customer.email,
        order.order_number,
        accessLink,
        product?.name ?? offer?.title ?? "Product"
      );
      emailSent = emailRes.sent;
      emailId = emailRes.messageId;
    }

    const now = new Date().toISOString();

    // 6. Complete delivery record
    await updateDelivery(delivery.id, {
      status: "DELIVERED",
      email_sent: emailSent,
      email_id: emailId ?? null,
      delivered_at: now,
    });

    // 7. Update order to fulfilled
    await updateOrder(order.id, {
      status: "PAID",
      fulfilled_at: now,
    });

    logAudit({
      event_type: "DELIVERY_COMPLETED",
      entity_type: "DELIVERY",
      entity_id: delivery.id,
      actor: "system",
      details: {
        orderId: order.id,
        itemsCount,
        emailSent,
        accessLink,
      },
    }).catch(() => null);

    return {
      deliveryId: delivery.id,
      orderId: order.id,
      customerId: order.customer_id,
      status: "DELIVERED",
      accessLink,
      itemsCount,
      entitlementId: entitlement.id,
      emailSent,
    };
  }

  /**
   * Retries fulfillment for pending or failed deliveries.
   */
  static async retryPendingDeliveries(): Promise<{ retried: number; succeeded: number }> {
    const pending = await listDeliveries({ status: "PENDING", limit: 20 });
    let succeeded = 0;

    for (const d of pending) {
      try {
        await this.fulfillOrder(d.order_id);
        succeeded++;
      } catch {
        // continue
      }
    }

    return { retried: pending.length, succeeded };
  }
}
