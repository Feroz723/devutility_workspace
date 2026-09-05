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

export class RazorpayAdapter implements PaymentProviderAdapter {
  readonly provider: PaymentProvider = "RAZORPAY";

  private getKeyId(): string | null {
    return process.env.RAZORPAY_KEY_ID ?? null;
  }

  private getKeySecret(): string | null {
    return process.env.RAZORPAY_KEY_SECRET ?? null;
  }

  private getWebhookSecret(): string | null {
    return process.env.RAZORPAY_WEBHOOK_SECRET ?? null;
  }

  async testConnection(): Promise<ProviderConnectionStatus> {
    const keyId = this.getKeyId();
    const keySecret = this.getKeySecret();
    const missing: string[] = [];

    if (!keyId) missing.push("RAZORPAY_KEY_ID");
    if (!keySecret) missing.push("RAZORPAY_KEY_SECRET");

    if (!keyId || !keySecret) {
      return {
        provider: "RAZORPAY",
        status: "NOT_CONNECTED",
        isConfigured: false,
        supportsWebhooks: true,
        supportedCurrencies: ["INR"],
        supportedPaymentMethods: ["upi", "card", "netbanking", "wallet"],
        credentialsMissing: missing,
        setupInstructions: [
          "1. Register or log into Razorpay Dashboard at https://dashboard.razorpay.com",
          "2. Navigate to Settings -> API Keys and generate your Key ID and Key Secret",
          "3. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment (.env.local)",
          "4. In Settings -> Webhooks, add endpoint: https://your-domain.com/api/sales/webhooks/razorpay",
          "5. Subscribe to events: payment.captured, payment.failed, order.paid, refund.processed",
          "6. Set RAZORPAY_WEBHOOK_SECRET in your environment",
        ],
      };
    }

    const isTestMode = keyId.startsWith("rzp_test_");

    return {
      provider: "RAZORPAY",
      status: isTestMode ? "CONFIGURED_TEST" : "CONFIGURED_LIVE",
      isConfigured: true,
      supportsWebhooks: true,
      supportedCurrencies: ["INR"],
      supportedPaymentMethods: ["upi", "card", "netbanking", "wallet"],
      credentialsMissing: [],
      setupInstructions: ["Razorpay is fully configured and ready for live or test transactions."],
    };
  }

  async createCheckoutSession(args: CreateProviderCheckoutArgs): Promise<CheckoutResult> {
    const keyId = this.getKeyId();
    const keySecret = this.getKeySecret();

    if (!keyId || !keySecret) {
      throw new Error(
        "Razorpay adapter is NOT_CONNECTED: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing. Configure Razorpay credentials to accept payments via UPI, Cards, and Netbanking."
      );
    }

    try {
      const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: args.amountCents,
          currency: args.currency.toUpperCase(),
          receipt: args.orderNumber,
          notes: {
            sessionId: args.sessionId,
            ...args.metadata,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Razorpay API error: ${data.error?.description ?? response.statusText}`);
      }

      return {
        sessionId: args.sessionId,
        checkoutUrl: `/checkout/razorpay-pay?order_id=${data.id}&session_id=${args.sessionId}`,
        provider: "RAZORPAY",
        providerSessionId: data.id,
        isFree: false,
      };
    } catch (err: any) {
      throw new Error(`Razorpay order creation failed: ${err.message}`);
    }
  }

  async verifyPayment(args: VerifyProviderPaymentArgs): Promise<PaymentVerificationResult> {
    const keyId = this.getKeyId();
    const keySecret = this.getKeySecret();

    if (!keyId || !keySecret) {
      return {
        verified: false,
        amountCents: 0,
        currency: "INR",
        status: "FAILED",
        error: "Razorpay credentials not configured",
      };
    }

    if (!args.providerPaymentId) {
      return {
        verified: false,
        amountCents: 0,
        currency: "INR",
        status: "FAILED",
        error: "Missing Razorpay payment ID",
      };
    }

    try {
      const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const res = await fetch(`https://api.razorpay.com/v1/payments/${args.providerPaymentId}`, {
        headers: { Authorization: authHeader },
      });
      const data = await res.json();

      if (!res.ok) {
        return {
          verified: false,
          amountCents: 0,
          currency: "INR",
          status: "FAILED",
          error: data.error?.description ?? "Payment verification failed",
        };
      }

      const isCaptured = data.status === "captured";
      return {
        verified: isCaptured,
        orderId: args.orderId,
        providerPaymentId: data.id,
        amountCents: data.amount,
        currency: (data.currency ?? "INR").toUpperCase(),
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
        provider: "RAZORPAY",
        eventType: "unknown",
        status: "INVALID_SIGNATURE",
        error: "RAZORPAY_WEBHOOK_SECRET is not configured on server",
      };
    }

    if (!args.signature) {
      return {
        success: false,
        provider: "RAZORPAY",
        eventType: "unknown",
        status: "INVALID_SIGNATURE",
        error: "Missing x-razorpay-signature header",
      };
    }

    try {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(args.rawBody, "utf8")
        .digest("hex");

      if (expectedSignature !== args.signature) {
        return {
          success: false,
          provider: "RAZORPAY",
          eventType: "unknown",
          status: "INVALID_SIGNATURE",
          error: "Razorpay HMAC signature mismatch",
        };
      }

      const event = JSON.parse(args.rawBody);
      return {
        success: true,
        provider: "RAZORPAY",
        eventType: event.event,
        status: "PROCESSED",
      };
    } catch (err: any) {
      return {
        success: false,
        provider: "RAZORPAY",
        eventType: "error",
        status: "FAILED",
        error: err.message,
      };
    }
  }
}
