import { createPaymentEvent } from "@/database/repositories/sales-repo";
import { logAudit } from "@/database/repositories/audit-repo";
import { getPaymentProvider } from "./providers";
import { OrderManager } from "./order";
import { DeliveryEngine } from "./delivery";
import { PaymentProvider } from "@/types/sales";
import { WebhookProcessResult } from "./types";

export interface WebhookHandlerOptions {
  provider: PaymentProvider;
  rawBody: string;
  signature?: string;
  headers?: Record<string, string>;
}

export class WebhookDispatcher {
  /**
   * Dispatches and processes an incoming payment gateway webhook event safely.
   */
  static async handleWebhook(options: WebhookHandlerOptions): Promise<WebhookProcessResult> {
    const adapter = getPaymentProvider(options.provider);

    // 1. Process and verify with provider adapter
    const result = await adapter.processWebhook({
      rawBody: options.rawBody,
      signature: options.signature,
      headers: options.headers,
    });

    // 2. Parse event payload
    let payload: any = {};
    try {
      payload = JSON.parse(options.rawBody);
    } catch {
      payload = { raw: options.rawBody };
    }

    const eventId = payload.id ?? payload.event_id ?? null;
    const isSignatureValid = result.status === "PROCESSED";

    // 3. Save immutable audit event in payment_events
    await createPaymentEvent({
      provider: options.provider,
      event_type: result.eventType,
      event_id: eventId,
      payload,
      signature_valid: isSignatureValid,
      processed: isSignatureValid,
      error: result.error ?? null,
    }).catch(() => null);

    if (!isSignatureValid) {
      logAudit({
        event_type: "SALES_ACTION_BLOCKED",
        entity_type: "WEBHOOK",
        entity_id: eventId ?? "unknown",
        actor: "external_gateway",
        details: { provider: options.provider, error: result.error },
      }).catch(() => null);

      return result;
    }

    // 4. Handle verified business events
    try {
      if (options.provider === "STRIPE") {
        if (result.eventType === "checkout.session.completed") {
          const session = payload.data?.object;
          const orderId = session?.client_reference_id || session?.metadata?.orderId;
          const paymentIntentId = session?.payment_intent;

          if (orderId && paymentIntentId) {
            await OrderManager.markOrderPaid(orderId, paymentIntentId);
            await DeliveryEngine.fulfillOrder(orderId).catch(() => null);
          }
        }
      } else if (options.provider === "RAZORPAY") {
        if (result.eventType === "payment.captured" || result.eventType === "order.paid") {
          const paymentEntity = payload.payload?.payment?.entity;
          const orderId = paymentEntity?.notes?.orderId;
          const paymentId = paymentEntity?.id;

          if (orderId && paymentId) {
            await OrderManager.markOrderPaid(orderId, paymentId);
            await DeliveryEngine.fulfillOrder(orderId).catch(() => null);
          }
        }
      }
    } catch (err: any) {
      result.error = `Business fulfillment error: ${err.message}`;
    }

    logAudit({
      event_type: "PAYMENT_WEBHOOK_RECEIVED",
      entity_type: "PAYMENT_EVENT",
      entity_id: eventId ?? "webhook",
      actor: "system",
      details: {
        provider: options.provider,
        eventType: result.eventType,
        status: result.status,
      },
    }).catch(() => null);

    return result;
  }
}
