import { z } from "zod";

// ==========================================
// ENUMS & CONSTANTS
// ==========================================

export const PricingModelSchema = z.enum([
  "FREE",
  "ONE_TIME",
  "SUBSCRIPTION",
  "USAGE_BASED",
  "PAY_WHAT_YOU_WANT",
]);
export type PricingModel = z.infer<typeof PricingModelSchema>;

export const OfferStatusSchema = z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]);
export type OfferStatus = z.infer<typeof OfferStatusSchema>;

export const PaymentProviderSchema = z.enum([
  "STRIPE",
  "RAZORPAY",
  "PAYPAL",
  "MANUAL",
  "MOCK_TEST",
]);
export type PaymentProvider = z.infer<typeof PaymentProviderSchema>;

export const CheckoutStatusSchema = z.enum([
  "PENDING",
  "COMPLETED",
  "EXPIRED",
  "ABANDONED",
]);
export type CheckoutStatus = z.infer<typeof CheckoutStatusSchema>;

export const OrderStatusSchema = z.enum([
  "PENDING",
  "PAID",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
  "CANCELLED",
  "FAILED",
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const PaymentStatusSchema = z.enum([
  "INITIATED",
  "AUTHORIZED",
  "CAPTURED",
  "FAILED",
  "REFUNDED",
]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const DeliveryStatusSchema = z.enum([
  "PENDING",
  "DELIVERED",
  "FAILED",
  "REVOKED",
]);
export type DeliveryStatus = z.infer<typeof DeliveryStatusSchema>;

export const EntitlementTypeSchema = z.enum([
  "ACCESS",
  "DOWNLOAD",
  "LICENSE_KEY",
  "API_CREDITS",
  "SEATS",
]);
export type EntitlementType = z.infer<typeof EntitlementTypeSchema>;

export const EntitlementStatusSchema = z.enum([
  "ACTIVE",
  "EXPIRED",
  "REVOKED",
  "SUSPENDED",
]);
export type EntitlementStatus = z.infer<typeof EntitlementStatusSchema>;

export const SubscriptionStatusSchema = z.enum([
  "ACTIVE",
  "PAST_DUE",
  "CANCELLED",
  "UNPAID",
  "TRIALING",
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const RefundStatusSchema = z.enum([
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "PROCESSED",
  "FAILED",
]);
export type RefundStatus = z.infer<typeof RefundStatusSchema>;

export const SalesJobTypeSchema = z.enum([
  "VERIFY_PENDING_PAYMENTS",
  "DELIVER_PENDING_ORDERS",
  "RETRY_FAILED_DELIVERIES",
  "SYNC_SUBSCRIPTIONS",
  "AGGREGATE_METRICS",
]);
export type SalesJobType = z.infer<typeof SalesJobTypeSchema>;

export const SalesJobStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
]);
export type SalesJobStatus = z.infer<typeof SalesJobStatusSchema>;

// ==========================================
// OFFERS & PRICING
// ==========================================

export const OfferPriceSchema = z.object({
  id: z.string().uuid(),
  offer_id: z.string().uuid(),
  currency: z.string().min(3).max(3),
  amount_cents: z.number().int().nonnegative(),
  display_amount: z.string(),
  is_free: z.boolean().default(false),
  interval: z.string().nullable().optional(), // 'month', 'year'
  interval_count: z.number().int().positive().default(1),
  trial_days: z.number().int().nonnegative().default(0),
  provider_price_id: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type OfferPrice = z.infer<typeof OfferPriceSchema>;

export const OfferSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  title: z.string().min(1),
  slug: z.string().min(1),
  tagline: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  pricing_model: PricingModelSchema.default("ONE_TIME"),
  status: OfferStatusSchema.default("DRAFT"),
  features: z.array(z.string()).default([]),
  deliverables: z.array(z.string()).default([]),
  guarantees: z.array(z.string()).default([]),
  faq: z.array(z.record(z.any())).default([]),
  primary_price_cents: z.number().int().nonnegative().default(0),
  primary_currency: z.string().default("INR"),
  is_free: z.boolean().default(false),
  requires_approval: z.boolean().default(false),
  is_approved: z.boolean().default(true),
  metadata: z.record(z.any()).default({}),
  is_demo: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Offer = z.infer<typeof OfferSchema>;

// ==========================================
// CUSTOMERS
// ==========================================

export const CustomerSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  stripe_customer_id: z.string().nullable().optional(),
  razorpay_customer_id: z.string().nullable().optional(),
  total_spent_cents: z.number().int().default(0),
  orders_count: z.number().int().default(0),
  first_touch_source: z.string().nullable().optional(),
  metadata: z.record(z.any()).default({}),
  is_demo: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Customer = z.infer<typeof CustomerSchema>;

// ==========================================
// CHECKOUT SESSIONS
// ==========================================

export const CheckoutSessionSchema = z.object({
  id: z.string().uuid(),
  offer_id: z.string().uuid(),
  customer_id: z.string().uuid().nullable().optional(),
  customer_email: z.string().nullable().optional(),
  customer_name: z.string().nullable().optional(),
  provider: PaymentProviderSchema.default("MANUAL"),
  provider_session_id: z.string().nullable().optional(),
  status: CheckoutStatusSchema.default("PENDING"),
  amount_cents: z.number().int().nonnegative().default(0),
  currency: z.string().default("INR"),
  is_free: z.boolean().default(false),
  success_url: z.string().nullable().optional(),
  cancel_url: z.string().nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  attribution: z.record(z.any()).default({}),
  metadata: z.record(z.any()).default({}),
  is_demo: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type CheckoutSession = z.infer<typeof CheckoutSessionSchema>;

// ==========================================
// ORDERS & ORDER ITEMS
// ==========================================

export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  product_id: z.string().uuid(),
  offer_id: z.string().uuid(),
  title: z.string(),
  quantity: z.number().int().positive().default(1),
  unit_price_cents: z.number().int().nonnegative().default(0),
  total_price_cents: z.number().int().nonnegative().default(0),
  currency: z.string().default("INR"),
  is_free: z.boolean().default(false),
  created_at: z.string().datetime(),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderSchema = z.object({
  id: z.string().uuid(),
  order_number: z.string().min(1),
  customer_id: z.string().uuid(),
  offer_id: z.string().uuid(),
  product_id: z.string().uuid(),
  status: OrderStatusSchema.default("PENDING"),
  total_amount_cents: z.number().int().nonnegative().default(0),
  currency: z.string().default("INR"),
  is_free: z.boolean().default(false),
  checkout_session_id: z.string().uuid().nullable().optional(),
  paid_at: z.string().datetime().nullable().optional(),
  fulfilled_at: z.string().datetime().nullable().optional(),
  cancelled_at: z.string().datetime().nullable().optional(),
  campaign_id: z.string().uuid().nullable().optional(),
  channel_id: z.string().uuid().nullable().optional(),
  utm_source: z.string().nullable().optional(),
  utm_medium: z.string().nullable().optional(),
  utm_campaign: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  metadata: z.record(z.any()).default({}),
  is_demo: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Order = z.infer<typeof OrderSchema>;

// ==========================================
// PAYMENTS & PAYMENT EVENTS
// ==========================================

export const PaymentSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  provider: PaymentProviderSchema,
  provider_payment_id: z.string().nullable().optional(),
  provider_order_id: z.string().nullable().optional(),
  amount_cents: z.number().int().nonnegative().default(0),
  currency: z.string().default("INR"),
  status: PaymentStatusSchema.default("INITIATED"),
  error_code: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
  receipt_url: z.string().nullable().optional(),
  is_free: z.boolean().default(false),
  captured_at: z.string().datetime().nullable().optional(),
  metadata: z.record(z.any()).default({}),
  is_demo: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Payment = z.infer<typeof PaymentSchema>;

export const PaymentEventSchema = z.object({
  id: z.string().uuid(),
  payment_id: z.string().uuid().nullable().optional(),
  order_id: z.string().uuid().nullable().optional(),
  provider: PaymentProviderSchema,
  event_type: z.string(),
  event_id: z.string().nullable().optional(),
  payload: z.record(z.any()),
  signature_valid: z.boolean().default(false),
  processed: z.boolean().default(false),
  error: z.string().nullable().optional(),
  created_at: z.string().datetime(),
});
export type PaymentEvent = z.infer<typeof PaymentEventSchema>;

// ==========================================
// ENTITLEMENTS & DELIVERIES
// ==========================================

export const CustomerEntitlementSchema = z.object({
  id: z.string().uuid(),
  customer_id: z.string().uuid(),
  product_id: z.string().uuid(),
  order_id: z.string().uuid(),
  offer_id: z.string().uuid(),
  entitlement_type: EntitlementTypeSchema.default("ACCESS"),
  status: EntitlementStatusSchema.default("ACTIVE"),
  license_key: z.string().nullable().optional(),
  token: z.string().nullable().optional(),
  access_url: z.string().nullable().optional(),
  max_uses: z.number().int().nullable().optional(),
  used_count: z.number().int().default(0),
  expires_at: z.string().datetime().nullable().optional(),
  revoked_at: z.string().datetime().nullable().optional(),
  revocation_reason: z.string().nullable().optional(),
  metadata: z.record(z.any()).default({}),
  is_demo: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type CustomerEntitlement = z.infer<typeof CustomerEntitlementSchema>;

export const DeliveryItemSchema = z.object({
  id: z.string().uuid(),
  delivery_id: z.string().uuid(),
  product_artifact_id: z.string().uuid().nullable().optional(),
  name: z.string(),
  artifact_type: z.string(),
  download_url: z.string().nullable().optional(),
  file_size_bytes: z.number().int().nullable().optional(),
  created_at: z.string().datetime(),
});
export type DeliveryItem = z.infer<typeof DeliveryItemSchema>;

export const DeliverySchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  product_id: z.string().uuid(),
  entitlement_id: z.string().uuid().nullable().optional(),
  delivery_channel: z.string().default("DOWNLOAD_PAGE"), // 'EMAIL', 'DOWNLOAD_PAGE', 'WEBHOOK'
  status: DeliveryStatusSchema.default("PENDING"),
  access_link: z.string().nullable().optional(),
  email_sent: z.boolean().default(false),
  email_id: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
  delivered_at: z.string().datetime().nullable().optional(),
  download_count: z.number().int().default(0),
  metadata: z.record(z.any()).default({}),
  is_demo: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Delivery = z.infer<typeof DeliverySchema>;

// ==========================================
// REFUNDS & SUBSCRIPTIONS
// ==========================================

export const RefundSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  payment_id: z.string().uuid().nullable().optional(),
  customer_id: z.string().uuid(),
  amount_cents: z.number().int().positive(),
  currency: z.string().default("INR"),
  reason: z.string().nullable().optional(),
  status: RefundStatusSchema.default("REQUESTED"),
  provider_refund_id: z.string().nullable().optional(),
  processed_at: z.string().datetime().nullable().optional(),
  is_demo: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Refund = z.infer<typeof RefundSchema>;

export const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  customer_id: z.string().uuid(),
  offer_id: z.string().uuid(),
  product_id: z.string().uuid(),
  provider: PaymentProviderSchema,
  provider_subscription_id: z.string().nullable().optional(),
  status: SubscriptionStatusSchema.default("ACTIVE"),
  current_period_start: z.string().datetime().nullable().optional(),
  current_period_end: z.string().datetime().nullable().optional(),
  cancel_at_period_end: z.boolean().default(false),
  cancelled_at: z.string().datetime().nullable().optional(),
  ended_at: z.string().datetime().nullable().optional(),
  interval: z.string().default("month"),
  interval_count: z.number().int().default(1),
  amount_cents: z.number().int().nonnegative().default(0),
  currency: z.string().default("INR"),
  is_demo: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Subscription = z.infer<typeof SubscriptionSchema>;

// ==========================================
// METRICS & ATTRIBUTION
// ==========================================

export const SalesMetricSchema = z.object({
  id: z.string().uuid(),
  period_type: z.string().default("DAILY"),
  period_start: z.string().datetime(),
  product_id: z.string().uuid().nullable().optional(),
  offer_id: z.string().uuid().nullable().optional(),
  total_visitors: z.number().int().default(0),
  checkout_views: z.number().int().default(0),
  checkout_starts: z.number().int().default(0),
  checkout_completions: z.number().int().default(0),
  gross_revenue_cents: z.number().int().default(0),
  net_revenue_cents: z.number().int().default(0),
  refunds_count: z.number().int().default(0),
  refunded_cents: z.number().int().default(0),
  free_orders_count: z.number().int().default(0),
  paid_orders_count: z.number().int().default(0),
  average_order_value_cents: z.number().int().default(0),
  conversion_rate_percent: z.number().default(0),
  is_demo: z.boolean().default(false),
  created_at: z.string().datetime(),
});
export type SalesMetric = z.infer<typeof SalesMetricSchema>;

export const SalesAttributionSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  channel_id: z.string().uuid().nullable().optional(),
  campaign_id: z.string().uuid().nullable().optional(),
  utm_source: z.string().nullable().optional(),
  utm_medium: z.string().nullable().optional(),
  utm_campaign: z.string().nullable().optional(),
  utm_term: z.string().nullable().optional(),
  utm_content: z.string().nullable().optional(),
  referrer_url: z.string().nullable().optional(),
  landing_page_url: z.string().nullable().optional(),
  touchpoint_type: z.string().default("LAST_TOUCH"),
  revenue_attributed_cents: z.number().int().default(0),
  created_at: z.string().datetime(),
});
export type SalesAttribution = z.infer<typeof SalesAttributionSchema>;

// ==========================================
// BACKGROUND JOBS & EVENTS
// ==========================================

export const SalesJobSchema = z.object({
  id: z.string().uuid(),
  job_type: SalesJobTypeSchema,
  status: SalesJobStatusSchema.default("PENDING"),
  payload: z.record(z.any()).default({}),
  result: z.record(z.any()).nullable().optional(),
  error_message: z.string().nullable().optional(),
  attempts: z.number().int().default(0),
  max_attempts: z.number().int().default(3),
  scheduled_at: z.string().datetime().nullable().optional(),
  started_at: z.string().datetime().nullable().optional(),
  completed_at: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime(),
});
export type SalesJob = z.infer<typeof SalesJobSchema>;

export const SalesEventSchema = z.object({
  id: z.string().uuid(),
  event_name: z.string(),
  offer_id: z.string().uuid().nullable().optional(),
  order_id: z.string().uuid().nullable().optional(),
  customer_id: z.string().uuid().nullable().optional(),
  properties: z.record(z.any()).default({}),
  user_agent: z.string().nullable().optional(),
  ip_address_hash: z.string().nullable().optional(),
  created_at: z.string().datetime(),
});
export type SalesEvent = z.infer<typeof SalesEventSchema>;

// ==========================================
// INPUT TYPES FOR REPOSITORIES
// ==========================================

export interface CreateOfferInput {
  product_id: string;
  title: string;
  slug: string;
  tagline?: string | null;
  description?: string | null;
  pricing_model?: PricingModel;
  status?: OfferStatus;
  features?: string[];
  deliverables?: string[];
  guarantees?: string[];
  faq?: any[];
  primary_price_cents?: number;
  primary_currency?: string;
  is_free?: boolean;
  requires_approval?: boolean;
  is_approved?: boolean;
  metadata?: Record<string, any>;
  is_demo?: boolean;
}

export interface UpdateOfferInput {
  title?: string;
  slug?: string;
  tagline?: string | null;
  description?: string | null;
  pricing_model?: PricingModel;
  status?: OfferStatus;
  features?: string[];
  deliverables?: string[];
  guarantees?: string[];
  faq?: any[];
  primary_price_cents?: number;
  primary_currency?: string;
  is_free?: boolean;
  requires_approval?: boolean;
  is_approved?: boolean;
  metadata?: Record<string, any>;
}

export interface CreateOfferPriceInput {
  offer_id: string;
  currency: string;
  amount_cents: number;
  display_amount: string;
  is_free?: boolean;
  interval?: string | null;
  interval_count?: number;
  trial_days?: number;
  provider_price_id?: string | null;
  is_active?: boolean;
}

export interface CreateCustomerInput {
  email: string;
  name?: string | null;
  phone?: string | null;
  country?: string | null;
  stripe_customer_id?: string | null;
  razorpay_customer_id?: string | null;
  total_spent_cents?: number;
  orders_count?: number;
  first_touch_source?: string | null;
  metadata?: Record<string, any>;
  is_demo?: boolean;
}

export interface UpdateCustomerInput {
  name?: string | null;
  phone?: string | null;
  country?: string | null;
  stripe_customer_id?: string | null;
  razorpay_customer_id?: string | null;
  total_spent_cents?: number;
  orders_count?: number;
  metadata?: Record<string, any>;
}

export interface CreateCheckoutSessionInput {
  offer_id: string;
  customer_id?: string | null;
  customer_email?: string | null;
  customer_name?: string | null;
  provider?: PaymentProvider;
  provider_session_id?: string | null;
  status?: CheckoutStatus;
  amount_cents?: number;
  currency?: string;
  is_free?: boolean;
  success_url?: string | null;
  cancel_url?: string | null;
  expires_at?: string | null;
  attribution?: Record<string, any>;
  metadata?: Record<string, any>;
  is_demo?: boolean;
}

export interface UpdateCheckoutSessionInput {
  status?: CheckoutStatus;
  provider_session_id?: string | null;
  customer_id?: string | null;
  customer_email?: string | null;
  customer_name?: string | null;
  metadata?: Record<string, any>;
}

export interface CreateOrderInput {
  order_number: string;
  customer_id: string;
  offer_id: string;
  product_id: string;
  status?: OrderStatus;
  total_amount_cents?: number;
  currency?: string;
  is_free?: boolean;
  checkout_session_id?: string | null;
  paid_at?: string | null;
  fulfilled_at?: string | null;
  cancelled_at?: string | null;
  campaign_id?: string | null;
  channel_id?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  notes?: string | null;
  metadata?: Record<string, any>;
  is_demo?: boolean;
}

export interface UpdateOrderInput {
  status?: OrderStatus;
  paid_at?: string | null;
  fulfilled_at?: string | null;
  cancelled_at?: string | null;
  notes?: string | null;
  metadata?: Record<string, any>;
}

export interface CreateOrderItemInput {
  order_id: string;
  product_id: string;
  offer_id: string;
  title: string;
  quantity?: number;
  unit_price_cents?: number;
  total_price_cents?: number;
  currency?: string;
  is_free?: boolean;
}

export interface CreatePaymentInput {
  order_id: string;
  provider: PaymentProvider;
  provider_payment_id?: string | null;
  provider_order_id?: string | null;
  amount_cents?: number;
  currency?: string;
  status?: PaymentStatus;
  error_code?: string | null;
  error_message?: string | null;
  receipt_url?: string | null;
  is_free?: boolean;
  captured_at?: string | null;
  metadata?: Record<string, any>;
  is_demo?: boolean;
}

export interface UpdatePaymentInput {
  status?: PaymentStatus;
  provider_payment_id?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  receipt_url?: string | null;
  captured_at?: string | null;
  metadata?: Record<string, any>;
}

export interface CreatePaymentEventInput {
  payment_id?: string | null;
  order_id?: string | null;
  provider: PaymentProvider;
  event_type: string;
  event_id?: string | null;
  payload: Record<string, any>;
  signature_valid?: boolean;
  processed?: boolean;
  error?: string | null;
}

export interface CreateCustomerEntitlementInput {
  customer_id: string;
  product_id: string;
  order_id: string;
  offer_id: string;
  entitlement_type?: EntitlementType;
  status?: EntitlementStatus;
  license_key?: string | null;
  token?: string | null;
  access_url?: string | null;
  max_uses?: number | null;
  expires_at?: string | null;
  metadata?: Record<string, any>;
  is_demo?: boolean;
}

export interface UpdateCustomerEntitlementInput {
  status?: EntitlementStatus;
  used_count?: number;
  revoked_at?: string | null;
  revocation_reason?: string | null;
  metadata?: Record<string, any>;
}

export interface CreateDeliveryInput {
  order_id: string;
  customer_id: string;
  product_id: string;
  entitlement_id?: string | null;
  delivery_channel?: string;
  status?: DeliveryStatus;
  access_link?: string | null;
  email_sent?: boolean;
  email_id?: string | null;
  error_message?: string | null;
  delivered_at?: string | null;
  metadata?: Record<string, any>;
  is_demo?: boolean;
}

export interface UpdateDeliveryInput {
  status?: DeliveryStatus;
  access_link?: string | null;
  email_sent?: boolean;
  email_id?: string | null;
  error_message?: string | null;
  delivered_at?: string | null;
  download_count?: number;
  metadata?: Record<string, any>;
}

export interface CreateDeliveryItemInput {
  delivery_id: string;
  product_artifact_id?: string | null;
  name: string;
  artifact_type: string;
  download_url?: string | null;
  file_size_bytes?: number | null;
}

export interface CreateRefundInput {
  order_id: string;
  payment_id?: string | null;
  customer_id: string;
  amount_cents: number;
  currency?: string;
  reason?: string | null;
  status?: RefundStatus;
  provider_refund_id?: string | null;
  processed_at?: string | null;
  is_demo?: boolean;
}

export interface UpdateRefundInput {
  status?: RefundStatus;
  provider_refund_id?: string | null;
  processed_at?: string | null;
}

export interface CreateSubscriptionInput {
  customer_id: string;
  offer_id: string;
  product_id: string;
  provider: PaymentProvider;
  provider_subscription_id?: string | null;
  status?: SubscriptionStatus;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  interval?: string;
  interval_count?: number;
  amount_cents?: number;
  currency?: string;
  is_demo?: boolean;
}

export interface UpdateSubscriptionInput {
  status?: SubscriptionStatus;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  cancelled_at?: string | null;
  ended_at?: string | null;
}

export interface CreateSalesMetricInput {
  period_type?: string;
  period_start: string;
  product_id?: string | null;
  offer_id?: string | null;
  total_visitors?: number;
  checkout_views?: number;
  checkout_starts?: number;
  checkout_completions?: number;
  gross_revenue_cents?: number;
  net_revenue_cents?: number;
  refunds_count?: number;
  refunded_cents?: number;
  free_orders_count?: number;
  paid_orders_count?: number;
  average_order_value_cents?: number;
  conversion_rate_percent?: number;
  is_demo?: boolean;
}

export interface CreateSalesAttributionInput {
  order_id: string;
  customer_id: string;
  channel_id?: string | null;
  campaign_id?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  referrer_url?: string | null;
  landing_page_url?: string | null;
  touchpoint_type?: string;
  revenue_attributed_cents?: number;
}

export interface CreateSalesJobInput {
  job_type: SalesJobType;
  status?: SalesJobStatus;
  payload?: Record<string, any>;
  scheduled_at?: string | null;
}

export interface UpdateSalesJobInput {
  status?: SalesJobStatus;
  result?: Record<string, any> | null;
  error_message?: string | null;
  attempts?: number;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface CreateSalesEventInput {
  event_name: string;
  offer_id?: string | null;
  order_id?: string | null;
  customer_id?: string | null;
  properties?: Record<string, any>;
  user_agent?: string | null;
  ip_address_hash?: string | null;
}
