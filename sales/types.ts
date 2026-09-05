import {
  Offer,
  OfferPrice,
  Customer,
  CheckoutSession,
  Order,
  Payment,
  CustomerEntitlement,
  Delivery,
  PaymentProvider,
  PricingModel,
  Refund,
  Subscription,
} from "@/types/sales";

export interface OfferEligibilityResult {
  eligible: boolean;
  productId: string;
  reason: string;
  checks: {
    productExists: boolean;
    productStatusValid: boolean;
    hasApprovedArtifacts: boolean;
    buildCostZero: boolean;
    qualityGatePassed: boolean;
    noActiveBlockingOffer: boolean;
  };
}

export interface PricingRecommendation {
  pricingModel: PricingModel;
  recommendedPriceCents: number;
  currency: string;
  displayPrice: string;
  isFree: boolean;
  confidenceScore: number;
  reasoning: string;
  marketComparison?: {
    lowPriceCents: number;
    highPriceCents: number;
    medianPriceCents: number;
  };
  valueTier: "FREE_TIER" | "ENTRY_LEVEL" | "STANDARD" | "PREMIUM";
}

export interface ProviderConnectionStatus {
  provider: PaymentProvider;
  status: "CONNECTED" | "NOT_CONNECTED" | "REQUIRES_MANUAL_SETUP" | "CONFIGURED_LIVE" | "CONFIGURED_TEST";
  isConfigured: boolean;
  supportsWebhooks: boolean;
  supportedCurrencies: string[];
  supportedPaymentMethods: string[];
  setupInstructions: string[];
  credentialsMissing: string[];
}

export interface CreateCheckoutOptions {
  offerId: string;
  customerEmail?: string;
  customerName?: string;
  provider?: PaymentProvider;
  currency?: string;
  successUrl?: string;
  cancelUrl?: string;
  attribution?: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
    referrer?: string;
    landingPage?: string;
  };
  isDemo?: boolean;
}

export interface CheckoutResult {
  sessionId: string;
  checkoutUrl: string;
  provider: PaymentProvider;
  providerSessionId?: string;
  isFree: boolean;
  expiresAt?: string;
}

export interface PaymentVerificationResult {
  verified: boolean;
  orderId?: string;
  paymentId?: string;
  providerPaymentId?: string;
  amountCents: number;
  currency: string;
  status: "CAPTURED" | "FAILED" | "PENDING";
  error?: string;
  rawResponse?: Record<string, any>;
}

export interface WebhookProcessResult {
  success: boolean;
  provider: PaymentProvider;
  eventType: string;
  orderId?: string;
  paymentId?: string;
  status: "PROCESSED" | "IGNORED" | "FAILED" | "INVALID_SIGNATURE";
  error?: string;
}

export interface DeliveryResult {
  deliveryId: string;
  orderId: string;
  customerId: string;
  status: "DELIVERED" | "PENDING" | "FAILED";
  accessLink?: string;
  itemsCount: number;
  entitlementId?: string;
  emailSent: boolean;
  error?: string;
}

export interface SalesAnalysisSummary {
  period: string;
  totalOrders: number;
  freeOrders: number;
  paidOrders: number;
  grossRevenueCents: number;
  netRevenueCents: number;
  totalRefundsCents: number;
  conversionRatePercent: number;
  averageOrderValueCents: number;
  topPerformingOffer?: {
    id: string;
    title: string;
    ordersCount: number;
    revenueCents: number;
  };
  channelAttributionSummary: Array<{
    source: string;
    ordersCount: number;
    revenueCents: number;
  }>;
}

export interface OfferOptimizationRecommendation {
  offerId: string;
  title: string;
  type: "PRICE_ADJUSTMENT" | "COPY_IMPROVEMENT" | "GUARANTEE_ADDITION" | "FEATURE_HIGHLIGHT" | "RETIRE";
  priority: "HIGH" | "MEDIUM" | "LOW";
  recommendation: string;
  rationale: string;
  proposedAction: Record<string, any>;
}

export interface SalesRunnerCycleResult {
  cycleTimestamp: string;
  offersChecked: number;
  offersPublished: number;
  pendingDeliveriesProcessed: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  refundsProcessed: number;
  metricsCalculated: boolean;
  errors: string[];
}
