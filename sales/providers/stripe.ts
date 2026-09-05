import { PaymentProvider } from "@/types/sales";
import {
  PaymentProviderAdapter,
  CreateProviderCheckoutArgs,
  VerifyProviderPaymentArgs,
  ProcessWebhookArgs,
} from "./base";
import {
  ProviderConnectionStatus,
  CheckoutResult,
  PaymentVerificationResult,
  WebhookProcessResult,
} from "../types";
import crypto from "crypto";

export class StripeAdapter implements PaymentProviderAdapter {
  readonly provider: PaymentProvider = "STRIPE";

  private getApiKey(): string | null {
    return process.env.STRIPE_SECRET_KEY ?? null;
  }

  private getWebhookSecret(): string | null {
    return process.env.STRIPE_WEBHOOK_SECRET ?? null;
  }

  async testConnection(): Promise<ProviderConnectionStatus> {
    const apiKey = this.getApiKey();
    const webhookSecret = this.getWebhookSecret();
    const missing: string[] = [];

    if (!apiKey) missing.push("STRIPE_SECRET_KEY");
    if (!webhookSecret) missing.push("STRIPE_WEBHOOK_SECRET");

    if (!apiKey || !webhookSecret) {
      return {
        provider: "STRIPE",
        status: "NOT_CONNECTED",
        isConfigured: false,
        supportsWebhooks: true,
        supportedCurrencies: ["INR", "USD", "EUR", "GBP", "CAD", "AUD"],
        supportedPaymentMethods: ["card", "apple_pay", "google_pay"],
        credentialsMissing: missing,
        setupInstructions: [
          "1. Sign up or log into Stripe Dashboard at https://dashboard.stripe.com",
          "2. Navigate to Developers -> API Keys to retrieve your Secret key (sk_live_... or sk_test_...)",
          "3. Set STRIPE_SECRET_KEY in your environment (.env.local)",
          "4. In Stripe Dashboard, go to Developers -> Webhooks and add endpoint: https://your-domain.com/api/sales/webhooks/stripe",
          "5. Select events: checkout.session.completed, payment_intent.succeeded, payment_intent.payment_failed, charge.refunded",
          "6. Copy the Signing Secret (whsec_...) and set STRIPE_WEBHOOK_SECRET in your environment",
        ],
      };
    }

    const isTestMode = apiKey.startsWith("sk_test_");

    return {
      provider: "STRIPE",
      status: isTestMode ? "CONFIGURED_TEST" : "CONFIGURED_LIVE",
      isConfigured: true,
      supportsWebhooks: true,
      supportedCurrencies: ["INR", "USD", "EUR", "GBP", "CAD", "AUD"],
      supportedPaymentMethods: ["card", "apple_pay", "google_pay"],
      credentialsMissing: [],
      setupInstructions: ["Stripe is fully configured and ready for live or test transactions."],
    };
  }

  async createCheckoutSession(args: CreateProviderCheckoutArgs): Promise<CheckoutResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error(
        "Stripe adapter is NOT_CONNECTED: STRIPE_SECRET_KEY environment variable is missing. Set up your Stripe credentials to enable live checkout."
      );
    }

    // When real Stripe SDK or HTTP API is used:
    // In production, we make a standard fetch request to https://api.stripe.com/v1/checkout/sessions
    try {
      const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          "payment_method_types[0]": "card",
          mode: "payment",
          success_url: args.successUrl,
          cancel_url: args.cancelUrl,
          client_reference_id: args.sessionId,
          customer_email: args.customerEmail ?? "",
          "line_items[0][price_data][currency]": args.currency.toLowerCase(),
          "line_items[0][price_data][unit_amount]": args.amountCents.toString(),
          "line_items[0][price_data][product_data][name]": args.title,
          "line_items[0][quantity]": "1",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Stripe API error: ${data.error?.message ?? response.statusText}`);
      }

      return {
        sessionId: args.sessionId,
        checkoutUrl: data.url,
        provider: "STRIPE",
        providerSessionId: data.id,
        isFree: false,
        expiresAt: new Date(data.expires_at * 1000).toISOString(),
      };
    } catch (err: any) {
      throw new Error(`Stripe checkout creation failed: ${err.message}`);
    }
  }

  async verifyPayment(args: VerifyProviderPaymentArgs): Promise<PaymentVerificationResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        verified: false,
        amountCents: 0,
        currency: "INR",
        status: "FAILED",
        error: "Stripe credentials not configured",
      };
    }

    if (!args.providerPaymentId) {
      return {
        verified: false,
        amountCents: 0,
        currency: "INR",
        status: "FAILED",
        error: "Missing Stripe payment intent ID",
      };
    }

    try {
      const res = await fetch(`https://api.stripe.com/v1/payment_intents/${args.providerPaymentId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await res.json();

      if (!res.ok) {
        return {
          verified: false,
          amountCents: 0,
          currency: "INR",
          status: "FAILED",
          error: data.error?.message ?? "Payment verification failed",
        };
      }

      const isCaptured = data.status === "succeeded";
      return {
        verified: isCaptured,
        orderId: args.orderId,
        providerPaymentId: data.id,
        amountCents: data.amount_received ?? data.amount,
        currency: (data.currency ?? "inr").toUpperCase(),
        status: isCaptured ? "CAPTURED" : "PENDING",
        rawResponse: data,
      };
    } catch (err: any) {
      return {
        verified: false,
        amountCents: 0,
        currency: "INR",
        status: "FAILED",
        error: err.message,
      };
    }
  }

  async processWebhook(args: ProcessWebhookArgs): Promise<WebhookProcessResult> {
    const webhookSecret = this.getWebhookSecret();
    if (!webhookSecret) {
      return {
        success: false,
        provider: "STRIPE",
        eventType: "unknown",
        status: "INVALID_SIGNATURE",
        error: "STRIPE_WEBHOOK_SECRET is not configured on server",
      };
    }

    if (!args.signature) {
      return {
        success: false,
        provider: "STRIPE",
        eventType: "unknown",
        status: "INVALID_SIGNATURE",
        error: "Missing stripe-signature header",
      };
    }

    // Verify Stripe signature header: t=timestamp,v1=signature
    try {
      const sigParts = args.signature.split(",").reduce((acc, part) => {
        const [k, v] = part.split("=");
        if (k && v) acc[k.trim()] = v.trim();
        return acc;
      }, {} as Record<string, string>);

      const timestamp = sigParts.t;
      const signature = sigParts.v1;

      if (!timestamp || !signature) {
        return {
          success: false,
          provider: "STRIPE",
          eventType: "unknown",
          status: "INVALID_SIGNATURE",
          error: "Malformed stripe-signature header",
        };
      }

      const signedPayload = `${timestamp}.${args.rawBody}`;
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(signedPayload, "utf8")
        .digest("hex");

      if (expectedSignature !== signature) {
        return {
          success: false,
          provider: "STRIPE",
          eventType: "unknown",
          status: "INVALID_SIGNATURE",
          error: "Stripe HMAC signature mismatch",
        };
      }

      const event = JSON.parse(args.rawBody);
      return {
        success: true,
        provider: "STRIPE",
        eventType: event.type,
        status: "PROCESSED",
      };
    } catch (err: any) {
      return {
        success: false,
        provider: "STRIPE",
        eventType: "error",
        status: "FAILED",
        error: err.message,
      };
    }
  }
}
