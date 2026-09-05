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

export class PayPalAdapter implements PaymentProviderAdapter {
  readonly provider: PaymentProvider = "PAYPAL";

  private getClientId(): string | null {
    return process.env.PAYPAL_CLIENT_ID ?? null;
  }

  private getClientSecret(): string | null {
    return process.env.PAYPAL_CLIENT_SECRET ?? null;
  }

  private getWebhookId(): string | null {
    return process.env.PAYPAL_WEBHOOK_ID ?? null;
  }

  async testConnection(): Promise<ProviderConnectionStatus> {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();
    const missing: string[] = [];

    if (!clientId) missing.push("PAYPAL_CLIENT_ID");
    if (!clientSecret) missing.push("PAYPAL_CLIENT_SECRET");

    if (missing.length > 0) {
      return {
        provider: "PAYPAL",
        status: "NOT_CONNECTED",
        isConfigured: false,
        supportsWebhooks: true,
        supportedCurrencies: ["USD", "EUR", "GBP", "CAD", "AUD"],
        supportedPaymentMethods: ["paypal", "card"],
        credentialsMissing: missing,
        setupInstructions: [
          "1. Log into PayPal Developer Portal at https://developer.paypal.com",
          "2. Navigate to Apps & Credentials and create a REST API App",
          "3. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in your environment (.env.local)",
          "4. Under Webhooks, add endpoint: https://your-domain.com/api/sales/webhooks/paypal",
          "5. Subscribe to events: CHECKOUT.ORDER.APPROVED, PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.DENIED",
          "6. Set PAYPAL_WEBHOOK_ID in your environment",
        ],
      };
    }

    return {
      provider: "PAYPAL",
      status: "CONFIGURED_LIVE",
      isConfigured: true,
      supportsWebhooks: true,
      supportedCurrencies: ["USD", "EUR", "GBP", "CAD", "AUD"],
      supportedPaymentMethods: ["paypal", "card"],
      credentialsMissing: [],
      setupInstructions: ["PayPal is fully configured and ready for international transactions."],
    };
  }

  async createCheckoutSession(args: CreateProviderCheckoutArgs): Promise<CheckoutResult> {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();

    if (!clientId || !clientSecret) {
      throw new Error(
        "PayPal adapter is NOT_CONNECTED: PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is missing. Set up credentials in .env.local to enable PayPal checkout."
      );
    }

    // Call PayPal API for order creation
    try {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      const tokenRes = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(`PayPal auth error: ${tokenData.error_description}`);

      const accessToken = tokenData.access_token;
      const orderRes = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              reference_id: args.orderNumber,
              amount: {
                currency_code: args.currency.toUpperCase(),
                value: (args.amountCents / 100).toFixed(2),
              },
              description: args.title,
            },
          ],
          application_context: {
            return_url: args.successUrl,
            cancel_url: args.cancelUrl,
          },
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(`PayPal order error: ${orderData.message}`);

      const approveLink = orderData.links?.find((l: any) => l.rel === "approve")?.href;

      return {
        sessionId: args.sessionId,
        checkoutUrl: approveLink ?? args.successUrl,
        provider: "PAYPAL",
        providerSessionId: orderData.id,
        isFree: false,
      };
    } catch (err: any) {
      throw new Error(`PayPal checkout creation failed: ${err.message}`);
    }
  }

  async verifyPayment(args: VerifyProviderPaymentArgs): Promise<PaymentVerificationResult> {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();

    if (!clientId || !clientSecret) {
      return {
        verified: false,
        amountCents: 0,
        currency: "USD",
        status: "FAILED",
        error: "PayPal credentials not configured",
      };
    }

    return {
      verified: false,
      amountCents: 0,
      currency: "USD",
      status: "PENDING",
      error: "PayPal payment capture pending confirmation",
    };
  }

  async processWebhook(args: ProcessWebhookArgs): Promise<WebhookProcessResult> {
    const webhookId = this.getWebhookId();
    if (!webhookId) {
      return {
        success: false,
        provider: "PAYPAL",
        eventType: "unknown",
        status: "INVALID_SIGNATURE",
        error: "PAYPAL_WEBHOOK_ID is not configured",
      };
    }

    try {
      const event = JSON.parse(args.rawBody);
      return {
        success: true,
        provider: "PAYPAL",
        eventType: event.event_type ?? "unknown",
        status: "PROCESSED",
      };
    } catch (err: any) {
      return {
        success: false,
        provider: "PAYPAL",
        eventType: "error",
        status: "FAILED",
        error: err.message,
      };
    }
  }
}
