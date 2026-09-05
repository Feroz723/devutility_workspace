export type ProviderConnectionStatus = "NOT_CONNECTED" | "CONNECTED" | "READY" | "FAILED";

export interface IntegrationProvider {
  name: string;
  type: "ANALYTICS" | "DISTRIBUTION" | "PAYMENT" | "WEBSITE_METRICS";
  status: ProviderConnectionStatus;
  description: string;
}

export interface AnalyticsProvider extends IntegrationProvider {
  type: "ANALYTICS";
  trackEvent?: (event: string, properties?: Record<string, unknown>) => Promise<void>;
}

export interface DistributionProvider extends IntegrationProvider {
  type: "DISTRIBUTION";
  publishPost?: (channel: string, content: string) => Promise<{ success: boolean; url?: string }>;
}

export interface PaymentProvider extends IntegrationProvider {
  type: "PAYMENT";
  createPaymentLink?: (amountInr: number, description: string) => Promise<{ url: string }>;
}

export interface WebsiteMetricsProvider extends IntegrationProvider {
  type: "WEBSITE_METRICS";
  fetchPageviews?: (url: string) => Promise<{ views: number; uniqueVisitors: number }>;
}

export const KNOWN_PROVIDERS: IntegrationProvider[] = [
  {
    name: "Plausible / Umami Analytics",
    type: "ANALYTICS",
    status: "NOT_CONNECTED",
    description: "Privacy-friendly website traffic metrics (Future Integration).",
  },
  {
    name: "Organic Social / Community Publisher",
    type: "DISTRIBUTION",
    status: "NOT_CONNECTED",
    description: "Automated distribution channel connector (Future Integration).",
  },
  {
    name: "Razorpay / Stripe Payments",
    type: "PAYMENT",
    status: "NOT_CONNECTED",
    description: "Payment gateway interface for commercial transactions (Future Integration).",
  },
  {
    name: "Self-hosted Web Telemetry",
    type: "WEBSITE_METRICS",
    status: "NOT_CONNECTED",
    description: "Serverless log aggregation for page views and CTA clicks.",
  },
];
