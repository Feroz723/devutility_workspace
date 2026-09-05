import {
  PaymentProvider,
  CheckoutSession,
  Payment,
  PaymentEvent,
} from "@/types/sales";
import {
  ProviderConnectionStatus,
  CheckoutResult,
  PaymentVerificationResult,
  WebhookProcessResult,
} from "../types";

export interface CreateProviderCheckoutArgs {
  sessionId: string;
  orderNumber: string;
  title: string;
  amountCents: number;
  currency: string;
  customerEmail?: string | null;
  customerName?: string | null;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, any>;
}

export interface VerifyProviderPaymentArgs {
  providerPaymentId?: string;
  providerOrderId?: string;
  orderId: string;
}

export interface ProcessWebhookArgs {
  rawBody: string;
  signature?: string;
  headers?: Record<string, string>;
}

export interface PaymentProviderAdapter {
  readonly provider: PaymentProvider;
  
  /**
   * Tests connection and checks if necessary environment credentials are configured.
   */
  testConnection(): Promise<ProviderConnectionStatus>;

  /**
   * Creates an external checkout session or payment intent on the gateway.
   */
  createCheckoutSession(args: CreateProviderCheckoutArgs): Promise<CheckoutResult>;

  /**
   * Directly verifies a payment status with the gateway API.
   */
  verifyPayment(args: VerifyProviderPaymentArgs): Promise<PaymentVerificationResult>;

  /**
   * Processes an incoming webhook event, validating cryptographic signatures.
   */
  processWebhook(args: ProcessWebhookArgs): Promise<WebhookProcessResult>;
}
