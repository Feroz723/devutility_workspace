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

export class ManualPaymentAdapter implements PaymentProviderAdapter {
  readonly provider: PaymentProvider = "MANUAL";

  async testConnection(): Promise<ProviderConnectionStatus> {
    return {
      provider: "MANUAL",
      status: "CONFIGURED_LIVE",
      isConfigured: true,
      supportsWebhooks: false,
      supportedCurrencies: ["INR", "USD"],
      supportedPaymentMethods: ["free_grant", "direct_bank_transfer", "manual_approval"],
      credentialsMissing: [],
      setupInstructions: [
        "Manual / Direct payment provider is always active.",
        "Free products automatically complete checkout without external payment gateway redirect.",
        "Direct bank transfers / UPI proofs can be verified manually in the Sales Control Center.",
      ],
    };
  }

  async createCheckoutSession(args: CreateProviderCheckoutArgs): Promise<CheckoutResult> {
    const isFree = args.amountCents === 0;

    return {
      sessionId: args.sessionId,
      checkoutUrl: isFree
        ? `/checkout/free-confirm?session_id=${args.sessionId}`
        : `/checkout/manual-instructions?session_id=${args.sessionId}&order_number=${args.orderNumber}`,
      provider: "MANUAL",
      isFree,
    };
  }

  async verifyPayment(args: VerifyProviderPaymentArgs): Promise<PaymentVerificationResult> {
    return {
      verified: true,
      orderId: args.orderId,
      amountCents: 0,
      currency: "INR",
      status: "CAPTURED",
    };
  }

  async processWebhook(_args: ProcessWebhookArgs): Promise<WebhookProcessResult> {
    return {
      success: true,
      provider: "MANUAL",
      eventType: "manual.payment.confirmed",
      status: "PROCESSED",
    };
  }
}
