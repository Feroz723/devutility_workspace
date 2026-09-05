import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebhookDispatcher } from "@/sales/webhooks";
import { OrderManager } from "@/sales/order";
import { DeliveryEngine } from "@/sales/delivery";
import * as salesRepo from "@/database/repositories/sales-repo";
import crypto from "crypto";

describe("WebhookDispatcher - Cryptographic Signature & Business Dispatch", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("fails with INVALID_SIGNATURE if STRIPE_WEBHOOK_SECRET is missing", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const result = await WebhookDispatcher.handleWebhook({
      provider: "STRIPE",
      rawBody: JSON.stringify({ id: "evt_1" }),
      signature: "t=123,v1=abc",
    });

    expect(result.status).toBe("INVALID_SIGNATURE");
    expect(result.error).toContain("STRIPE_WEBHOOK_SECRET is not configured");
  });

  it("fails with INVALID_SIGNATURE if HMAC signature does not match", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";

    const result = await WebhookDispatcher.handleWebhook({
      provider: "STRIPE",
      rawBody: JSON.stringify({ id: "evt_1" }),
      signature: "t=123,v1=tampered_signature",
    });

    expect(result.status).toBe("INVALID_SIGNATURE");
    expect(result.error).toContain("signature mismatch");
  });

  it("accepts valid Stripe signature and dispatches fulfillment", async () => {
    const secret = "whsec_valid_secret";
    process.env.STRIPE_WEBHOOK_SECRET = secret;

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payloadObj = {
      id: "evt_checkout_completed",
      type: "checkout.session.completed",
      data: {
        object: {
          client_reference_id: "ord-test-123",
          payment_intent: "pi_stripe_captured_123",
        },
      },
    };
    const rawBody = JSON.stringify(payloadObj);
    const signedPayload = `${timestamp}.${rawBody}`;
    const v1 = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
    const signature = `t=${timestamp},v1=${v1}`;

    vi.spyOn(salesRepo, "createPaymentEvent").mockResolvedValueOnce({} as any);
    vi.spyOn(OrderManager, "markOrderPaid").mockResolvedValueOnce({} as any);
    vi.spyOn(DeliveryEngine, "fulfillOrder").mockResolvedValueOnce({} as any);

    const result = await WebhookDispatcher.handleWebhook({
      provider: "STRIPE",
      rawBody,
      signature,
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe("PROCESSED");
    expect(result.eventType).toBe("checkout.session.completed");
    expect(OrderManager.markOrderPaid).toHaveBeenCalledWith("ord-test-123", "pi_stripe_captured_123");
    expect(DeliveryEngine.fulfillOrder).toHaveBeenCalledWith("ord-test-123");
  });
});
