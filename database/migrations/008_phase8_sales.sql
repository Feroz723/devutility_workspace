-- =====================================================
-- Autonomous Business OS — Phase 8 Database Migration
-- Autonomous Sales, Checkout & Delivery Engine
-- =====================================================

-- 1. Offers table
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  headline TEXT NOT NULL,
  description TEXT NOT NULL,
  target_customer TEXT,
  value_proposition TEXT NOT NULL,
  pricing_model TEXT NOT NULL DEFAULT 'FREE' CHECK (pricing_model IN ('FREE', 'ONE_TIME', 'SUBSCRIPTION', 'PAY_WHAT_YOU_WANT')),
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  billing_period TEXT CHECK (billing_period IN ('MONTHLY', 'YEARLY', 'LIFETIME', 'ONE_OFF')),
  trial_period_days INTEGER NOT NULL DEFAULT 0,
  guarantee_terms TEXT,
  delivery_method TEXT NOT NULL DEFAULT 'DIGITAL_DOWNLOAD' CHECK (delivery_method IN (
    'DIGITAL_DOWNLOAD', 'PRODUCT_ACCESS', 'LICENSE_KEY', 'EMAIL_DELIVERY', 'MANUAL_DELIVERY', 'LINK_DELIVERY', 'ACCOUNT_ACCESS'
  )),
  refund_policy TEXT NOT NULL DEFAULT 'STANDARD_14_DAYS',
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'READY_FOR_REVIEW', 'APPROVED', 'LIVE', 'PAUSED', 'ARCHIVED')),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offers_product ON offers(product_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_is_demo ON offers(is_demo);
CREATE INDEX IF NOT EXISTS idx_offers_slug ON offers(slug);

-- 2. Offer Prices (Multi-currency support)
CREATE TABLE IF NOT EXISTS offer_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'INR',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  classification TEXT NOT NULL DEFAULT 'RECOMMENDED_PRICE' CHECK (classification IN ('VALIDATED_PRICE', 'RECOMMENDED_PRICE', 'HUMAN_DEFINED_PRICE')),
  is_primary BOOLEAN NOT NULL DEFAULT true,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_prices_offer ON offer_prices(offer_id);

-- 3. Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  provider_customer_ids JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'LEAD' CHECK (status IN ('LEAD', 'CUSTOMER', 'ACTIVE', 'INACTIVE', 'REFUNDED', 'BLOCKED')),
  source TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_is_demo ON customers(is_demo);

-- 4. Checkout Sessions
CREATE TABLE IF NOT EXISTS checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'MANUAL_PAYMENT' CHECK (provider IN ('STRIPE', 'RAZORPAY', 'PAYPAL', 'MANUAL_PAYMENT')),
  provider_session_id TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN (
    'CREATED', 'PENDING', 'PROCESSING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED'
  )),
  expires_at TIMESTAMPTZ NOT NULL,
  attribution JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_offer ON checkout_sessions(offer_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_status ON checkout_sessions(status);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_is_demo ON checkout_sessions(is_demo);

-- 5. Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  checkout_session_id UUID REFERENCES checkout_sessions(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
  fulfillment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (fulfillment_status IN ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'PAYMENT_PENDING', 'PAID', 'FULFILLING', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'FAILED', 'REFUNDED'
  )),
  attribution JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_offer ON orders(offer_id);
CREATE INDEX IF NOT EXISTS idx_orders_product ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_is_demo ON orders(is_demo);

-- 6. Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- 7. Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  checkout_session_id UUID REFERENCES checkout_sessions(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('STRIPE', 'RAZORPAY', 'PAYPAL', 'MANUAL_PAYMENT')),
  external_id TEXT UNIQUE,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_external ON payments(external_id);
CREATE INDEX IF NOT EXISTS idx_payments_is_demo ON payments(is_demo);

-- 8. Payment Events (Append-only immutable audit of webhooks)
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_id TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  verified BOOLEAN NOT NULL DEFAULT false,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_payment ON payment_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_event_id ON payment_events(event_id);

-- 9. Customer Entitlements
CREATE TABLE IF NOT EXISTS customer_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('ACTIVE', 'EXPIRED', 'REVOKED', 'PENDING')),
  access_data JSONB DEFAULT '{}'::jsonb,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entitlements_customer ON customer_entitlements(customer_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_product ON customer_entitlements(product_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_status ON customer_entitlements(status);

-- 10. Deliveries
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN (
    'DIGITAL_DOWNLOAD', 'PRODUCT_ACCESS', 'LICENSE_KEY', 'EMAIL_DELIVERY', 'MANUAL_DELIVERY', 'LINK_DELIVERY', 'ACCOUNT_ACCESS'
  )),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'RETRYING')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  delivery_payload JSONB DEFAULT '{}'::jsonb,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_order ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_customer ON deliveries(customer_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);

-- 11. Delivery Items
CREATE TABLE IF NOT EXISTS delivery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  artifact_id UUID REFERENCES product_artifacts(id) ON DELETE SET NULL,
  item_type TEXT NOT NULL,
  title TEXT NOT NULL,
  download_url TEXT,
  secure_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_items_delivery ON delivery_items(delivery_id);

-- 12. Refunds
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN (
    'REQUESTED', 'APPROVED', 'PROCESSING', 'REFUNDED', 'FAILED', 'REJECTED'
  )),
  external_refund_id TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment ON refunds(payment_id);

-- 13. Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL CHECK (provider IN ('STRIPE', 'RAZORPAY', 'PAYPAL', 'MANUAL_PAYMENT')),
  external_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'PAUSED')),
  billing_period TEXT NOT NULL CHECK (billing_period IN ('MONTHLY', 'YEARLY')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- 14. Sales Metrics
CREATE TABLE IF NOT EXISTS sales_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  dimensions JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_metrics_offer ON sales_metrics(offer_id);
CREATE INDEX IF NOT EXISTS idx_sales_metrics_name ON sales_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_sales_metrics_is_demo ON sales_metrics(is_demo);

-- 15. Sales Attribution
CREATE TABLE IF NOT EXISTS sales_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  checkout_session_id UUID REFERENCES checkout_sessions(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES distribution_campaigns(id) ON DELETE SET NULL,
  channel_type TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  revenue_inr NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_attribution_order ON sales_attribution(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_attribution_campaign ON sales_attribution(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sales_attribution_is_demo ON sales_attribution(is_demo);

-- 16. Sales Jobs
CREATE TABLE IF NOT EXISTS sales_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL CHECK (job_type IN (
    'OFFER_PREPARATION', 'CHECKOUT_CLEANUP', 'WEBHOOK_PROCESSING', 'DELIVERY_RETRY', 'CUSTOMER_ACTIVATION', 'METRICS_COLLECTION', 'REFUND_SYNC', 'SUBSCRIPTION_SYNC', 'ANALYSIS'
  )),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  payload JSONB DEFAULT '{}'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_jobs_status ON sales_jobs(status);

-- 17. Sales Events (Timeline step events for audit)
CREATE TABLE IF NOT EXISTS sales_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES sales_jobs(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_events_order ON sales_events(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_events_job ON sales_events(job_id);
