import { queryOne, queryMany, query } from "../client";
import type {
  Offer,
  CreateOfferInput,
  UpdateOfferInput,
  OfferPrice,
  CreateOfferPriceInput,
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  CheckoutSession,
  CreateCheckoutSessionInput,
  UpdateCheckoutSessionInput,
  Order,
  CreateOrderInput,
  UpdateOrderInput,
  OrderItem,
  CreateOrderItemInput,
  Payment,
  CreatePaymentInput,
  UpdatePaymentInput,
  PaymentEvent,
  CreatePaymentEventInput,
  CustomerEntitlement,
  CreateCustomerEntitlementInput,
  UpdateCustomerEntitlementInput,
  Delivery,
  CreateDeliveryInput,
  UpdateDeliveryInput,
  DeliveryItem,
  CreateDeliveryItemInput,
  Refund,
  CreateRefundInput,
  UpdateRefundInput,
  Subscription,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  SalesMetric,
  CreateSalesMetricInput,
  SalesAttribution,
  CreateSalesAttributionInput,
  SalesJob,
  CreateSalesJobInput,
  UpdateSalesJobInput,
  SalesEvent,
  CreateSalesEventInput,
} from "@/types/sales";

function serializeJson(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  return typeof val === "string" ? val : JSON.stringify(val);
}

// ============================================================
// 1. OFFERS & PRICES
// ============================================================

export async function createOffer(input: CreateOfferInput): Promise<Offer> {
  const row = await queryOne<Offer>(
    `INSERT INTO offers (
      product_id, title, slug, tagline, description,
      pricing_model, status, features, deliverables, guarantees,
      faq, primary_price_cents, primary_currency, is_free,
      requires_approval, is_approved, metadata, is_demo
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14,
      $15, $16, $17, $18
    )
    RETURNING *`,
    [
      input.product_id,
      input.title,
      input.slug,
      input.tagline ?? null,
      input.description ?? null,
      input.pricing_model ?? "ONE_TIME",
      input.status ?? "DRAFT",
      serializeJson(input.features ?? []),
      serializeJson(input.deliverables ?? []),
      serializeJson(input.guarantees ?? []),
      serializeJson(input.faq ?? []),
      input.primary_price_cents ?? 0,
      input.primary_currency ?? "INR",
      input.is_free ?? false,
      input.requires_approval ?? false,
      input.is_approved ?? true,
      serializeJson(input.metadata ?? {}),
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getOfferById(id: string): Promise<Offer | null> {
  return queryOne<Offer>(`SELECT * FROM offers WHERE id = $1`, [id]);
}

export async function getOfferBySlug(slug: string): Promise<Offer | null> {
  return queryOne<Offer>(`SELECT * FROM offers WHERE slug = $1`, [slug]);
}

export async function listOffers(options: {
  productId?: string;
  status?: string;
  includeDemo?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<Offer[]> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (options.productId) {
    params.push(options.productId);
    conditions.push(`product_id = $${params.length}`);
  }
  if (options.status) {
    params.push(options.status);
    conditions.push(`status = $${params.length}`);
  }
  if (options.includeDemo === false) {
    conditions.push(`is_demo = false`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  return queryMany<Offer>(
    `SELECT * FROM offers ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );
}

export async function updateOffer(id: string, input: UpdateOfferInput): Promise<Offer | null> {
  const fields: string[] = [];
  const params: any[] = [id];

  if (input.title !== undefined) {
    params.push(input.title);
    fields.push(`title = $${params.length}`);
  }
  if (input.slug !== undefined) {
    params.push(input.slug);
    fields.push(`slug = $${params.length}`);
  }
  if (input.tagline !== undefined) {
    params.push(input.tagline);
    fields.push(`tagline = $${params.length}`);
  }
  if (input.description !== undefined) {
    params.push(input.description);
    fields.push(`description = $${params.length}`);
  }
  if (input.pricing_model !== undefined) {
    params.push(input.pricing_model);
    fields.push(`pricing_model = $${params.length}`);
  }
  if (input.status !== undefined) {
    params.push(input.status);
    fields.push(`status = $${params.length}`);
  }
  if (input.features !== undefined) {
    params.push(serializeJson(input.features));
    fields.push(`features = $${params.length}`);
  }
  if (input.deliverables !== undefined) {
    params.push(serializeJson(input.deliverables));
    fields.push(`deliverables = $${params.length}`);
  }
  if (input.guarantees !== undefined) {
    params.push(serializeJson(input.guarantees));
    fields.push(`guarantees = $${params.length}`);
  }
  if (input.faq !== undefined) {
    params.push(serializeJson(input.faq));
    fields.push(`faq = $${params.length}`);
  }
  if (input.primary_price_cents !== undefined) {
    params.push(input.primary_price_cents);
    fields.push(`primary_price_cents = $${params.length}`);
  }
  if (input.primary_currency !== undefined) {
    params.push(input.primary_currency);
    fields.push(`primary_currency = $${params.length}`);
  }
  if (input.is_free !== undefined) {
    params.push(input.is_free);
    fields.push(`is_free = $${params.length}`);
  }
  if (input.requires_approval !== undefined) {
    params.push(input.requires_approval);
    fields.push(`requires_approval = $${params.length}`);
  }
  if (input.is_approved !== undefined) {
    params.push(input.is_approved);
    fields.push(`is_approved = $${params.length}`);
  }
  if (input.metadata !== undefined) {
    params.push(serializeJson(input.metadata));
    fields.push(`metadata = $${params.length}`);
  }

  if (fields.length === 0) return getOfferById(id);

  fields.push(`updated_at = NOW()`);

  return queryOne<Offer>(
    `UPDATE offers SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );
}

export async function createOfferPrice(input: CreateOfferPriceInput): Promise<OfferPrice> {
  const row = await queryOne<OfferPrice>(
    `INSERT INTO offer_prices (
      offer_id, currency, amount_cents, display_amount,
      is_free, interval, interval_count, trial_days,
      provider_price_id, is_active
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8,
      $9, $10
    )
    RETURNING *`,
    [
      input.offer_id,
      input.currency,
      input.amount_cents,
      input.display_amount,
      input.is_free ?? false,
      input.interval ?? null,
      input.interval_count ?? 1,
      input.trial_days ?? 0,
      input.provider_price_id ?? null,
      input.is_active ?? true,
    ]
  );
  return row!;
}

export async function getOfferPrices(offerId: string): Promise<OfferPrice[]> {
  return queryMany<OfferPrice>(
    `SELECT * FROM offer_prices WHERE offer_id = $1 AND is_active = true ORDER BY amount_cents ASC`,
    [offerId]
  );
}

// ============================================================
// 2. CUSTOMERS
// ============================================================

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const row = await queryOne<Customer>(
    `INSERT INTO customers (
      email, name, phone, country,
      stripe_customer_id, razorpay_customer_id,
      total_spent_cents, orders_count, first_touch_source,
      metadata, is_demo
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6,
      $7, $8, $9,
      $10, $11
    )
    RETURNING *`,
    [
      input.email,
      input.name ?? null,
      input.phone ?? null,
      input.country ?? null,
      input.stripe_customer_id ?? null,
      input.razorpay_customer_id ?? null,
      input.total_spent_cents ?? 0,
      input.orders_count ?? 0,
      input.first_touch_source ?? null,
      serializeJson(input.metadata ?? {}),
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  return queryOne<Customer>(`SELECT * FROM customers WHERE id = $1`, [id]);
}

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  return queryOne<Customer>(`SELECT * FROM customers WHERE email = $1`, [email]);
}

export async function listCustomers(options: {
  includeDemo?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<Customer[]> {
  const conditions: string[] = [];
  if (options.includeDemo === false) {
    conditions.push(`is_demo = false`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  return queryMany<Customer>(
    `SELECT * FROM customers ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
  );
}

export async function updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer | null> {
  const fields: string[] = [];
  const params: any[] = [id];

  if (input.name !== undefined) {
    params.push(input.name);
    fields.push(`name = $${params.length}`);
  }
  if (input.phone !== undefined) {
    params.push(input.phone);
    fields.push(`phone = $${params.length}`);
  }
  if (input.country !== undefined) {
    params.push(input.country);
    fields.push(`country = $${params.length}`);
  }
  if (input.stripe_customer_id !== undefined) {
    params.push(input.stripe_customer_id);
    fields.push(`stripe_customer_id = $${params.length}`);
  }
  if (input.razorpay_customer_id !== undefined) {
    params.push(input.razorpay_customer_id);
    fields.push(`razorpay_customer_id = $${params.length}`);
  }
  if (input.total_spent_cents !== undefined) {
    params.push(input.total_spent_cents);
    fields.push(`total_spent_cents = $${params.length}`);
  }
  if (input.orders_count !== undefined) {
    params.push(input.orders_count);
    fields.push(`orders_count = $${params.length}`);
  }
  if (input.metadata !== undefined) {
    params.push(serializeJson(input.metadata));
    fields.push(`metadata = $${params.length}`);
  }

  if (fields.length === 0) return getCustomerById(id);

  fields.push(`updated_at = NOW()`);

  return queryOne<Customer>(
    `UPDATE customers SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );
}

// ============================================================
// 3. CHECKOUT SESSIONS
// ============================================================

export async function createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSession> {
  const row = await queryOne<CheckoutSession>(
    `INSERT INTO checkout_sessions (
      offer_id, customer_id, customer_email, customer_name,
      provider, provider_session_id, status, amount_cents,
      currency, is_free, success_url, cancel_url,
      expires_at, attribution, metadata, is_demo
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8,
      $9, $10, $11, $12,
      $13, $14, $15, $16
    )
    RETURNING *`,
    [
      input.offer_id,
      input.customer_id ?? null,
      input.customer_email ?? null,
      input.customer_name ?? null,
      input.provider ?? "MANUAL",
      input.provider_session_id ?? null,
      input.status ?? "PENDING",
      input.amount_cents ?? 0,
      input.currency ?? "INR",
      input.is_free ?? false,
      input.success_url ?? null,
      input.cancel_url ?? null,
      input.expires_at ?? null,
      serializeJson(input.attribution ?? {}),
      serializeJson(input.metadata ?? {}),
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getCheckoutSessionById(id: string): Promise<CheckoutSession | null> {
  return queryOne<CheckoutSession>(`SELECT * FROM checkout_sessions WHERE id = $1`, [id]);
}

export async function updateCheckoutSession(id: string, input: UpdateCheckoutSessionInput): Promise<CheckoutSession | null> {
  const fields: string[] = [];
  const params: any[] = [id];

  if (input.status !== undefined) {
    params.push(input.status);
    fields.push(`status = $${params.length}`);
  }
  if (input.provider_session_id !== undefined) {
    params.push(input.provider_session_id);
    fields.push(`provider_session_id = $${params.length}`);
  }
  if (input.customer_id !== undefined) {
    params.push(input.customer_id);
    fields.push(`customer_id = $${params.length}`);
  }
  if (input.customer_email !== undefined) {
    params.push(input.customer_email);
    fields.push(`customer_email = $${params.length}`);
  }
  if (input.customer_name !== undefined) {
    params.push(input.customer_name);
    fields.push(`customer_name = $${params.length}`);
  }
  if (input.metadata !== undefined) {
    params.push(serializeJson(input.metadata));
    fields.push(`metadata = $${params.length}`);
  }

  if (fields.length === 0) return getCheckoutSessionById(id);

  fields.push(`updated_at = NOW()`);

  return queryOne<CheckoutSession>(
    `UPDATE checkout_sessions SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );
}

export async function listCheckoutSessions(options: {
  offerId?: string;
  customerId?: string;
  status?: string;
  includeDemo?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<CheckoutSession[]> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (options.offerId) {
    params.push(options.offerId);
    conditions.push(`offer_id = $${params.length}`);
  }
  if (options.customerId) {
    params.push(options.customerId);
    conditions.push(`customer_id = $${params.length}`);
  }
  if (options.status) {
    params.push(options.status);
    conditions.push(`status = $${params.length}`);
  }
  if (options.includeDemo === false) {
    conditions.push(`is_demo = false`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  return queryMany<CheckoutSession>(
    `SELECT * FROM checkout_sessions ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );
}

// ============================================================
// 4. ORDERS & ITEMS
// ============================================================


export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const row = await queryOne<Order>(
    `INSERT INTO orders (
      order_number, customer_id, offer_id, product_id,
      status, total_amount_cents, currency, is_free,
      checkout_session_id, paid_at, fulfilled_at, cancelled_at,
      campaign_id, channel_id, utm_source, utm_medium,
      utm_campaign, notes, metadata, is_demo
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8,
      $9, $10, $11, $12,
      $13, $14, $15, $16,
      $17, $18, $19, $20
    )
    RETURNING *`,
    [
      input.order_number,
      input.customer_id,
      input.offer_id,
      input.product_id,
      input.status ?? "PENDING",
      input.total_amount_cents ?? 0,
      input.currency ?? "INR",
      input.is_free ?? false,
      input.checkout_session_id ?? null,
      input.paid_at ?? null,
      input.fulfilled_at ?? null,
      input.cancelled_at ?? null,
      input.campaign_id ?? null,
      input.channel_id ?? null,
      input.utm_source ?? null,
      input.utm_medium ?? null,
      input.utm_campaign ?? null,
      input.notes ?? null,
      serializeJson(input.metadata ?? {}),
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getOrderById(id: string): Promise<Order | null> {
  return queryOne<Order>(`SELECT * FROM orders WHERE id = $1`, [id]);
}

export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  return queryOne<Order>(`SELECT * FROM orders WHERE order_number = $1`, [orderNumber]);
}

export async function listOrders(options: {
  customerId?: string;
  offerId?: string;
  productId?: string;
  status?: string;
  includeDemo?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<Order[]> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (options.customerId) {
    params.push(options.customerId);
    conditions.push(`customer_id = $${params.length}`);
  }
  if (options.offerId) {
    params.push(options.offerId);
    conditions.push(`offer_id = $${params.length}`);
  }
  if (options.productId) {
    params.push(options.productId);
    conditions.push(`product_id = $${params.length}`);
  }
  if (options.status) {
    params.push(options.status);
    conditions.push(`status = $${params.length}`);
  }
  if (options.includeDemo === false) {
    conditions.push(`is_demo = false`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  return queryMany<Order>(
    `SELECT * FROM orders ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );
}

export async function updateOrder(id: string, input: UpdateOrderInput): Promise<Order | null> {
  const fields: string[] = [];
  const params: any[] = [id];

  if (input.status !== undefined) {
    params.push(input.status);
    fields.push(`status = $${params.length}`);
  }
  if (input.paid_at !== undefined) {
    params.push(input.paid_at);
    fields.push(`paid_at = $${params.length}`);
  }
  if (input.fulfilled_at !== undefined) {
    params.push(input.fulfilled_at);
    fields.push(`fulfilled_at = $${params.length}`);
  }
  if (input.cancelled_at !== undefined) {
    params.push(input.cancelled_at);
    fields.push(`cancelled_at = $${params.length}`);
  }
  if (input.notes !== undefined) {
    params.push(input.notes);
    fields.push(`notes = $${params.length}`);
  }
  if (input.metadata !== undefined) {
    params.push(serializeJson(input.metadata));
    fields.push(`metadata = $${params.length}`);
  }

  if (fields.length === 0) return getOrderById(id);

  fields.push(`updated_at = NOW()`);

  return queryOne<Order>(
    `UPDATE orders SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );
}

export async function createOrderItem(input: CreateOrderItemInput): Promise<OrderItem> {
  const row = await queryOne<OrderItem>(
    `INSERT INTO order_items (
      order_id, product_id, offer_id, title,
      quantity, unit_price_cents, total_price_cents,
      currency, is_free
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7,
      $8, $9
    )
    RETURNING *`,
    [
      input.order_id,
      input.product_id,
      input.offer_id,
      input.title,
      input.quantity ?? 1,
      input.unit_price_cents ?? 0,
      input.total_price_cents ?? 0,
      input.currency ?? "INR",
      input.is_free ?? false,
    ]
  );
  return row!;
}

export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  return queryMany<OrderItem>(`SELECT * FROM order_items WHERE order_id = $1`, [orderId]);
}

// ============================================================
// 5. PAYMENTS & PAYMENT EVENTS
// ============================================================

export async function createPayment(input: CreatePaymentInput): Promise<Payment> {
  const row = await queryOne<Payment>(
    `INSERT INTO payments (
      order_id, provider, provider_payment_id, provider_order_id,
      amount_cents, currency, status, error_code,
      error_message, receipt_url, is_free, captured_at,
      metadata, is_demo
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8,
      $9, $10, $11, $12,
      $13, $14
    )
    RETURNING *`,
    [
      input.order_id,
      input.provider,
      input.provider_payment_id ?? null,
      input.provider_order_id ?? null,
      input.amount_cents ?? 0,
      input.currency ?? "INR",
      input.status ?? "INITIATED",
      input.error_code ?? null,
      input.error_message ?? null,
      input.receipt_url ?? null,
      input.is_free ?? false,
      input.captured_at ?? null,
      serializeJson(input.metadata ?? {}),
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  return queryOne<Payment>(`SELECT * FROM payments WHERE id = $1`, [id]);
}

export async function getPaymentByOrderId(orderId: string): Promise<Payment | null> {
  return queryOne<Payment>(`SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1`, [orderId]);
}

export async function listPayments(options: {
  orderId?: string;
  status?: string;
  includeDemo?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<Payment[]> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (options.orderId) {
    params.push(options.orderId);
    conditions.push(`order_id = $${params.length}`);
  }
  if (options.status) {
    params.push(options.status);
    conditions.push(`status = $${params.length}`);
  }
  if (options.includeDemo === false) {
    conditions.push(`is_demo = false`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  return queryMany<Payment>(
    `SELECT * FROM payments ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );
}

export async function updatePayment(id: string, input: UpdatePaymentInput): Promise<Payment | null> {
  const fields: string[] = [];
  const params: any[] = [id];

  if (input.status !== undefined) {
    params.push(input.status);
    fields.push(`status = $${params.length}`);
  }
  if (input.provider_payment_id !== undefined) {
    params.push(input.provider_payment_id);
    fields.push(`provider_payment_id = $${params.length}`);
  }
  if (input.error_code !== undefined) {
    params.push(input.error_code);
    fields.push(`error_code = $${params.length}`);
  }
  if (input.error_message !== undefined) {
    params.push(input.error_message);
    fields.push(`error_message = $${params.length}`);
  }
  if (input.receipt_url !== undefined) {
    params.push(input.receipt_url);
    fields.push(`receipt_url = $${params.length}`);
  }
  if (input.captured_at !== undefined) {
    params.push(input.captured_at);
    fields.push(`captured_at = $${params.length}`);
  }
  if (input.metadata !== undefined) {
    params.push(serializeJson(input.metadata));
    fields.push(`metadata = $${params.length}`);
  }

  if (fields.length === 0) return getPaymentById(id);

  fields.push(`updated_at = NOW()`);

  return queryOne<Payment>(
    `UPDATE payments SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );
}

export async function createPaymentEvent(input: CreatePaymentEventInput): Promise<PaymentEvent> {
  const row = await queryOne<PaymentEvent>(
    `INSERT INTO payment_events (
      payment_id, order_id, provider, event_type,
      event_id, payload, signature_valid, processed, error
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8, $9
    )
    RETURNING *`,
    [
      input.payment_id ?? null,
      input.order_id ?? null,
      input.provider,
      input.event_type,
      input.event_id ?? null,
      serializeJson(input.payload),
      input.signature_valid ?? false,
      input.processed ?? false,
      input.error ?? null,
    ]
  );
  return row!;
}

// ============================================================
// 6. CUSTOMER ENTITLEMENTS
// ============================================================

export async function createCustomerEntitlement(input: CreateCustomerEntitlementInput): Promise<CustomerEntitlement> {
  const row = await queryOne<CustomerEntitlement>(
    `INSERT INTO customer_entitlements (
      customer_id, product_id, order_id, offer_id,
      entitlement_type, status, license_key, token,
      access_url, max_uses, expires_at, metadata, is_demo
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8,
      $9, $10, $11, $12, $13
    )
    RETURNING *`,
    [
      input.customer_id,
      input.product_id,
      input.order_id,
      input.offer_id,
      input.entitlement_type ?? "ACCESS",
      input.status ?? "ACTIVE",
      input.license_key ?? null,
      input.token ?? null,
      input.access_url ?? null,
      input.max_uses ?? null,
      input.expires_at ?? null,
      serializeJson(input.metadata ?? {}),
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getCustomerEntitlementById(id: string): Promise<CustomerEntitlement | null> {
  return queryOne<CustomerEntitlement>(`SELECT * FROM customer_entitlements WHERE id = $1`, [id]);
}

export async function getCustomerEntitlements(options: {
  customerId?: string;
  productId?: string;
  status?: string;
  includeDemo?: boolean;
} = {}): Promise<CustomerEntitlement[]> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (options.customerId) {
    params.push(options.customerId);
    conditions.push(`customer_id = $${params.length}`);
  }
  if (options.productId) {
    params.push(options.productId);
    conditions.push(`product_id = $${params.length}`);
  }
  if (options.status) {
    params.push(options.status);
    conditions.push(`status = $${params.length}`);
  }
  if (options.includeDemo === false) {
    conditions.push(`is_demo = false`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  return queryMany<CustomerEntitlement>(
    `SELECT * FROM customer_entitlements ${whereClause} ORDER BY created_at DESC`,
    params
  );
}

export async function updateCustomerEntitlement(id: string, input: UpdateCustomerEntitlementInput): Promise<CustomerEntitlement | null> {
  const fields: string[] = [];
  const params: any[] = [id];

  if (input.status !== undefined) {
    params.push(input.status);
    fields.push(`status = $${params.length}`);
  }
  if (input.used_count !== undefined) {
    params.push(input.used_count);
    fields.push(`used_count = $${params.length}`);
  }
  if (input.revoked_at !== undefined) {
    params.push(input.revoked_at);
    fields.push(`revoked_at = $${params.length}`);
  }
  if (input.revocation_reason !== undefined) {
    params.push(input.revocation_reason);
    fields.push(`revocation_reason = $${params.length}`);
  }
  if (input.metadata !== undefined) {
    params.push(serializeJson(input.metadata));
    fields.push(`metadata = $${params.length}`);
  }

  if (fields.length === 0) return getCustomerEntitlementById(id);

  fields.push(`updated_at = NOW()`);

  return queryOne<CustomerEntitlement>(
    `UPDATE customer_entitlements SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );
}

// ============================================================
// 7. DELIVERIES & DELIVERY ITEMS
// ============================================================

export async function createDelivery(input: CreateDeliveryInput): Promise<Delivery> {
  const row = await queryOne<Delivery>(
    `INSERT INTO deliveries (
      order_id, customer_id, product_id, entitlement_id,
      delivery_channel, status, access_link, email_sent,
      email_id, error_message, delivered_at, metadata, is_demo
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8,
      $9, $10, $11, $12, $13
    )
    RETURNING *`,
    [
      input.order_id,
      input.customer_id,
      input.product_id,
      input.entitlement_id ?? null,
      input.delivery_channel ?? "DOWNLOAD_PAGE",
      input.status ?? "PENDING",
      input.access_link ?? null,
      input.email_sent ?? false,
      input.email_id ?? null,
      input.error_message ?? null,
      input.delivered_at ?? null,
      serializeJson(input.metadata ?? {}),
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getDeliveryById(id: string): Promise<Delivery | null> {
  return queryOne<Delivery>(`SELECT * FROM deliveries WHERE id = $1`, [id]);
}

export async function getDeliveryByOrderId(orderId: string): Promise<Delivery | null> {
  return queryOne<Delivery>(`SELECT * FROM deliveries WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1`, [orderId]);
}

export async function listDeliveries(options: {
  orderId?: string;
  status?: string;
  includeDemo?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<Delivery[]> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (options.orderId) {
    params.push(options.orderId);
    conditions.push(`order_id = $${params.length}`);
  }
  if (options.status) {
    params.push(options.status);
    conditions.push(`status = $${params.length}`);
  }
  if (options.includeDemo === false) {
    conditions.push(`is_demo = false`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  return queryMany<Delivery>(
    `SELECT * FROM deliveries ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );
}

export async function updateDelivery(id: string, input: UpdateDeliveryInput): Promise<Delivery | null> {
  const fields: string[] = [];
  const params: any[] = [id];

  if (input.status !== undefined) {
    params.push(input.status);
    fields.push(`status = $${params.length}`);
  }
  if (input.access_link !== undefined) {
    params.push(input.access_link);
    fields.push(`access_link = $${params.length}`);
  }
  if (input.email_sent !== undefined) {
    params.push(input.email_sent);
    fields.push(`email_sent = $${params.length}`);
  }
  if (input.email_id !== undefined) {
    params.push(input.email_id);
    fields.push(`email_id = $${params.length}`);
  }
  if (input.error_message !== undefined) {
    params.push(input.error_message);
    fields.push(`error_message = $${params.length}`);
  }
  if (input.delivered_at !== undefined) {
    params.push(input.delivered_at);
    fields.push(`delivered_at = $${params.length}`);
  }
  if (input.download_count !== undefined) {
    params.push(input.download_count);
    fields.push(`download_count = $${params.length}`);
  }
  if (input.metadata !== undefined) {
    params.push(serializeJson(input.metadata));
    fields.push(`metadata = $${params.length}`);
  }

  if (fields.length === 0) return getDeliveryById(id);

  fields.push(`updated_at = NOW()`);

  return queryOne<Delivery>(
    `UPDATE deliveries SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );
}

export async function createDeliveryItem(input: CreateDeliveryItemInput): Promise<DeliveryItem> {
  const row = await queryOne<DeliveryItem>(
    `INSERT INTO delivery_items (
      delivery_id, product_artifact_id, name,
      artifact_type, download_url, file_size_bytes
    ) VALUES (
      $1, $2, $3,
      $4, $5, $6
    )
    RETURNING *`,
    [
      input.delivery_id,
      input.product_artifact_id ?? null,
      input.name,
      input.artifact_type,
      input.download_url ?? null,
      input.file_size_bytes ?? null,
    ]
  );
  return row!;
}

export async function getDeliveryItems(deliveryId: string): Promise<DeliveryItem[]> {
  return queryMany<DeliveryItem>(`SELECT * FROM delivery_items WHERE delivery_id = $1`, [deliveryId]);
}

// ============================================================
// 8. REFUNDS
// ============================================================

export async function createRefund(input: CreateRefundInput): Promise<Refund> {
  const row = await queryOne<Refund>(
    `INSERT INTO refunds (
      order_id, payment_id, customer_id, amount_cents,
      currency, reason, status, provider_refund_id,
      processed_at, is_demo
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8,
      $9, $10
    )
    RETURNING *`,
    [
      input.order_id,
      input.payment_id ?? null,
      input.customer_id,
      input.amount_cents,
      input.currency ?? "INR",
      input.reason ?? null,
      input.status ?? "REQUESTED",
      input.provider_refund_id ?? null,
      input.processed_at ?? null,
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getRefundById(id: string): Promise<Refund | null> {
  return queryOne<Refund>(`SELECT * FROM refunds WHERE id = $1`, [id]);
}

export async function listRefunds(options: {
  orderId?: string;
  customerId?: string;
  status?: string;
  includeDemo?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<Refund[]> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (options.orderId) {
    params.push(options.orderId);
    conditions.push(`order_id = $${params.length}`);
  }
  if (options.customerId) {
    params.push(options.customerId);
    conditions.push(`customer_id = $${params.length}`);
  }
  if (options.status) {
    params.push(options.status);
    conditions.push(`status = $${params.length}`);
  }
  if (options.includeDemo === false) {
    conditions.push(`is_demo = false`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  return queryMany<Refund>(
    `SELECT * FROM refunds ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );
}

export async function updateRefund(id: string, input: UpdateRefundInput): Promise<Refund | null> {
  const fields: string[] = [];
  const params: any[] = [id];

  if (input.status !== undefined) {
    params.push(input.status);
    fields.push(`status = $${params.length}`);
  }
  if (input.provider_refund_id !== undefined) {
    params.push(input.provider_refund_id);
    fields.push(`provider_refund_id = $${params.length}`);
  }
  if (input.processed_at !== undefined) {
    params.push(input.processed_at);
    fields.push(`processed_at = $${params.length}`);
  }

  if (fields.length === 0) return getRefundById(id);

  fields.push(`updated_at = NOW()`);

  return queryOne<Refund>(
    `UPDATE refunds SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );
}

// ============================================================
// 9. SUBSCRIPTIONS
// ============================================================

export async function createSubscription(input: CreateSubscriptionInput): Promise<Subscription> {
  const row = await queryOne<Subscription>(
    `INSERT INTO subscriptions (
      customer_id, offer_id, product_id, provider,
      provider_subscription_id, status, current_period_start,
      current_period_end, cancel_at_period_end, interval,
      interval_count, amount_cents, currency, is_demo
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7,
      $8, $9, $10,
      $11, $12, $13, $14
    )
    RETURNING *`,
    [
      input.customer_id,
      input.offer_id,
      input.product_id,
      input.provider,
      input.provider_subscription_id ?? null,
      input.status ?? "ACTIVE",
      input.current_period_start ?? null,
      input.current_period_end ?? null,
      input.cancel_at_period_end ?? false,
      input.interval ?? "month",
      input.interval_count ?? 1,
      input.amount_cents ?? 0,
      input.currency ?? "INR",
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getSubscriptionById(id: string): Promise<Subscription | null> {
  return queryOne<Subscription>(`SELECT * FROM subscriptions WHERE id = $1`, [id]);
}

export async function listSubscriptions(options: {
  customerId?: string;
  status?: string;
  includeDemo?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<Subscription[]> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (options.customerId) {
    params.push(options.customerId);
    conditions.push(`customer_id = $${params.length}`);
  }
  if (options.status) {
    params.push(options.status);
    conditions.push(`status = $${params.length}`);
  }
  if (options.includeDemo === false) {
    conditions.push(`is_demo = false`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  return queryMany<Subscription>(
    `SELECT * FROM subscriptions ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  );
}

export async function updateSubscription(id: string, input: UpdateSubscriptionInput): Promise<Subscription | null> {
  const fields: string[] = [];
  const params: any[] = [id];

  if (input.status !== undefined) {
    params.push(input.status);
    fields.push(`status = $${params.length}`);
  }
  if (input.current_period_start !== undefined) {
    params.push(input.current_period_start);
    fields.push(`current_period_start = $${params.length}`);
  }
  if (input.current_period_end !== undefined) {
    params.push(input.current_period_end);
    fields.push(`current_period_end = $${params.length}`);
  }
  if (input.cancel_at_period_end !== undefined) {
    params.push(input.cancel_at_period_end);
    fields.push(`cancel_at_period_end = $${params.length}`);
  }
  if (input.cancelled_at !== undefined) {
    params.push(input.cancelled_at);
    fields.push(`cancelled_at = $${params.length}`);
  }
  if (input.ended_at !== undefined) {
    params.push(input.ended_at);
    fields.push(`ended_at = $${params.length}`);
  }

  if (fields.length === 0) return getSubscriptionById(id);

  fields.push(`updated_at = NOW()`);

  return queryOne<Subscription>(
    `UPDATE subscriptions SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );
}

// ============================================================
// 10. SALES METRICS & ATTRIBUTION
// ============================================================

export async function createSalesMetric(input: CreateSalesMetricInput): Promise<SalesMetric> {
  const row = await queryOne<SalesMetric>(
    `INSERT INTO sales_metrics (
      period_type, period_start, product_id, offer_id,
      total_visitors, checkout_views, checkout_starts, checkout_completions,
      gross_revenue_cents, net_revenue_cents, refunds_count, refunded_cents,
      free_orders_count, paid_orders_count, average_order_value_cents,
      conversion_rate_percent, is_demo
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8,
      $9, $10, $11, $12,
      $13, $14, $15,
      $16, $17
    )
    RETURNING *`,
    [
      input.period_type ?? "DAILY",
      input.period_start,
      input.product_id ?? null,
      input.offer_id ?? null,
      input.total_visitors ?? 0,
      input.checkout_views ?? 0,
      input.checkout_starts ?? 0,
      input.checkout_completions ?? 0,
      input.gross_revenue_cents ?? 0,
      input.net_revenue_cents ?? 0,
      input.refunds_count ?? 0,
      input.refunded_cents ?? 0,
      input.free_orders_count ?? 0,
      input.paid_orders_count ?? 0,
      input.average_order_value_cents ?? 0,
      input.conversion_rate_percent ?? 0,
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function listSalesMetrics(options: {
  productId?: string;
  offerId?: string;
  includeDemo?: boolean;
  limit?: number;
} = {}): Promise<SalesMetric[]> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (options.productId) {
    params.push(options.productId);
    conditions.push(`product_id = $${params.length}`);
  }
  if (options.offerId) {
    params.push(options.offerId);
    conditions.push(`offer_id = $${params.length}`);
  }
  if (options.includeDemo === false) {
    conditions.push(`is_demo = false`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options.limit ?? 30;

  return queryMany<SalesMetric>(
    `SELECT * FROM sales_metrics ${whereClause} ORDER BY period_start DESC LIMIT ${limit}`,
    params
  );
}

export async function createSalesAttribution(input: CreateSalesAttributionInput): Promise<SalesAttribution> {
  const row = await queryOne<SalesAttribution>(
    `INSERT INTO sales_attribution (
      order_id, customer_id, channel_id, campaign_id,
      utm_source, utm_medium, utm_campaign, utm_term,
      utm_content, referrer_url, landing_page_url, touchpoint_type,
      revenue_attributed_cents
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8,
      $9, $10, $11, $12,
      $13
    )
    RETURNING *`,
    [
      input.order_id,
      input.customer_id,
      input.channel_id ?? null,
      input.campaign_id ?? null,
      input.utm_source ?? null,
      input.utm_medium ?? null,
      input.utm_campaign ?? null,
      input.utm_term ?? null,
      input.utm_content ?? null,
      input.referrer_url ?? null,
      input.landing_page_url ?? null,
      input.touchpoint_type ?? "LAST_TOUCH",
      input.revenue_attributed_cents ?? 0,
    ]
  );
  return row!;
}

export async function listSalesAttributions(options: {
  orderId?: string;
  campaignId?: string;
  limit?: number;
} = {}): Promise<SalesAttribution[]> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (options.orderId) {
    params.push(options.orderId);
    conditions.push(`order_id = $${params.length}`);
  }
  if (options.campaignId) {
    params.push(options.campaignId);
    conditions.push(`campaign_id = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options.limit ?? 50;

  return queryMany<SalesAttribution>(
    `SELECT * FROM sales_attribution ${whereClause} ORDER BY created_at DESC LIMIT ${limit}`,
    params
  );
}

// ============================================================
// 11. SALES JOBS & EVENTS
// ============================================================

export async function createSalesJob(input: CreateSalesJobInput): Promise<SalesJob> {
  const row = await queryOne<SalesJob>(
    `INSERT INTO sales_jobs (
      job_type, status, payload, scheduled_at
    ) VALUES (
      $1, $2, $3, $4
    )
    RETURNING *`,
    [
      input.job_type,
      input.status ?? "PENDING",
      serializeJson(input.payload ?? {}),
      input.scheduled_at ?? null,
    ]
  );
  return row!;
}

export async function getPendingSalesJobs(limit = 10): Promise<SalesJob[]> {
  return queryMany<SalesJob>(
    `SELECT * FROM sales_jobs 
     WHERE status = 'PENDING' AND (scheduled_at IS NULL OR scheduled_at <= NOW())
     ORDER BY created_at ASC LIMIT $1`,
    [limit]
  );
}

export async function updateSalesJob(id: string, input: UpdateSalesJobInput): Promise<SalesJob | null> {
  const fields: string[] = [];
  const params: any[] = [id];

  if (input.status !== undefined) {
    params.push(input.status);
    fields.push(`status = $${params.length}`);
  }
  if (input.result !== undefined) {
    params.push(serializeJson(input.result));
    fields.push(`result = $${params.length}`);
  }
  if (input.error_message !== undefined) {
    params.push(input.error_message);
    fields.push(`error_message = $${params.length}`);
  }
  if (input.attempts !== undefined) {
    params.push(input.attempts);
    fields.push(`attempts = $${params.length}`);
  }
  if (input.started_at !== undefined) {
    params.push(input.started_at);
    fields.push(`started_at = $${params.length}`);
  }
  if (input.completed_at !== undefined) {
    params.push(input.completed_at);
    fields.push(`completed_at = $${params.length}`);
  }

  if (fields.length === 0) {
    return queryOne<SalesJob>(`SELECT * FROM sales_jobs WHERE id = $1`, [id]);
  }

  return queryOne<SalesJob>(
    `UPDATE sales_jobs SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );
}

export async function createSalesEvent(input: CreateSalesEventInput): Promise<SalesEvent> {
  const row = await queryOne<SalesEvent>(
    `INSERT INTO sales_events (
      event_name, offer_id, order_id, customer_id,
      properties, user_agent, ip_address_hash
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7
    )
    RETURNING *`,
    [
      input.event_name,
      input.offer_id ?? null,
      input.order_id ?? null,
      input.customer_id ?? null,
      serializeJson(input.properties ?? {}),
      input.user_agent ?? null,
      input.ip_address_hash ?? null,
    ]
  );
  return row!;
}

export async function listSalesEvents(options: {
  offerId?: string;
  orderId?: string;
  eventName?: string;
  limit?: number;
} = {}): Promise<SalesEvent[]> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (options.offerId) {
    params.push(options.offerId);
    conditions.push(`offer_id = $${params.length}`);
  }
  if (options.orderId) {
    params.push(options.orderId);
    conditions.push(`order_id = $${params.length}`);
  }
  if (options.eventName) {
    params.push(options.eventName);
    conditions.push(`event_name = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options.limit ?? 50;

  return queryMany<SalesEvent>(
    `SELECT * FROM sales_events ${whereClause} ORDER BY created_at DESC LIMIT ${limit}`,
    params
  );
}
