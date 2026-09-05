import { queryOne, queryMany, query } from "../client";
import type {
  BusinessSnapshot,
  BusinessMetric,
  UnitEconomics,
  ProductPerformance,
  ChannelPerformance,
  OfferPerformance,
  CustomerCohort,
  PortfolioDecision,
  DecisionRecommendation,
  DecisionEvidence,
  BusinessForecast,
  ResourceAllocation,
  ResourceCategory,
  BusinessGoal,

  BusinessRisk,
  BusinessLearning,
  BusinessJob,
  BusinessEvent,
  ProductPerformanceTier,
  ChannelPerformanceTier,
  OfferPerformanceTier,
  DecisionStatus,
  PortfolioDecisionType,
  DecisionSubjectType,
  CostStatus,
  IntelligenceConfidence,
  BIJobType,
  BIJobStatus,
  RiskCategory,
  RiskSeverity,
  RiskStatus,
} from "@/types/intelligence";

function serializeJson(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  return typeof val === "string" ? val : JSON.stringify(val);
}

// ============================================================
// 1. BUSINESS SNAPSHOTS
// ============================================================

export interface CreateBusinessSnapshotInput {
  snapshot_date: string;
  active_opportunities_count?: number;
  active_experiments_count?: number;
  active_products_count?: number;
  active_campaigns_count?: number;
  total_visitors_count?: number;
  total_leads_count?: number;
  total_signups_count?: number;
  total_customers_count?: number;
  activated_customers_count?: number;
  total_revenue_inr?: number;
  total_refunds_inr?: number;
  net_revenue_inr?: number;
  active_retention_rate_percent?: number;
  confirmed_churn_count?: number;
  open_support_tickets_count?: number;
  summary_metrics?: Record<string, unknown>;
  is_demo?: boolean;
}

export async function createBusinessSnapshot(
  input: CreateBusinessSnapshotInput
): Promise<BusinessSnapshot> {
  const row = await queryOne<BusinessSnapshot>(
    `INSERT INTO business_snapshots (
      snapshot_date, active_opportunities_count, active_experiments_count,
      active_products_count, active_campaigns_count, total_visitors_count,
      total_leads_count, total_signups_count, total_customers_count,
      activated_customers_count, total_revenue_inr, total_refunds_inr,
      net_revenue_inr, active_retention_rate_percent, confirmed_churn_count,
      open_support_tickets_count, summary_metrics, is_demo
    ) VALUES (
      $1::date, COALESCE($2, 0), COALESCE($3, 0), COALESCE($4, 0), COALESCE($5, 0),
      COALESCE($6, 0), COALESCE($7, 0), COALESCE($8, 0), COALESCE($9, 0),
      COALESCE($10, 0), COALESCE($11, 0), COALESCE($12, 0), COALESCE($13, 0),
      COALESCE($14, 0), COALESCE($15, 0), COALESCE($16, 0),
      COALESCE($17::jsonb, '{}'::jsonb), COALESCE($18, false)
    )
    ON CONFLICT (snapshot_date, is_demo) DO UPDATE SET
      active_opportunities_count = EXCLUDED.active_opportunities_count,
      active_experiments_count = EXCLUDED.active_experiments_count,
      active_products_count = EXCLUDED.active_products_count,
      active_campaigns_count = EXCLUDED.active_campaigns_count,
      total_visitors_count = EXCLUDED.total_visitors_count,
      total_leads_count = EXCLUDED.total_leads_count,
      total_signups_count = EXCLUDED.total_signups_count,
      total_customers_count = EXCLUDED.total_customers_count,
      activated_customers_count = EXCLUDED.activated_customers_count,
      total_revenue_inr = EXCLUDED.total_revenue_inr,
      total_refunds_inr = EXCLUDED.total_refunds_inr,
      net_revenue_inr = EXCLUDED.net_revenue_inr,
      active_retention_rate_percent = EXCLUDED.active_retention_rate_percent,
      confirmed_churn_count = EXCLUDED.confirmed_churn_count,
      open_support_tickets_count = EXCLUDED.open_support_tickets_count,
      summary_metrics = EXCLUDED.summary_metrics
    RETURNING *`,
    [
      input.snapshot_date,
      input.active_opportunities_count ?? 0,
      input.active_experiments_count ?? 0,
      input.active_products_count ?? 0,
      input.active_campaigns_count ?? 0,
      input.total_visitors_count ?? 0,
      input.total_leads_count ?? 0,
      input.total_signups_count ?? 0,
      input.total_customers_count ?? 0,
      input.activated_customers_count ?? 0,
      input.total_revenue_inr ?? 0,
      input.total_refunds_inr ?? 0,
      input.net_revenue_inr ?? 0,
      input.active_retention_rate_percent ?? 0,
      input.confirmed_churn_count ?? 0,
      input.open_support_tickets_count ?? 0,
      serializeJson(input.summary_metrics),
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getLatestBusinessSnapshot(options?: {
  is_demo?: boolean;
}): Promise<BusinessSnapshot | null> {
  const isDemo = options?.is_demo ?? false;
  return queryOne<BusinessSnapshot>(
    `SELECT * FROM business_snapshots WHERE is_demo = $1 ORDER BY snapshot_date DESC LIMIT 1`,
    [isDemo]
  );
}

export async function listBusinessSnapshots(options?: {
  is_demo?: boolean;
  limit?: number;
}): Promise<BusinessSnapshot[]> {
  const isDemo = options?.is_demo ?? false;
  const limit = options?.limit ?? 30;
  return queryMany<BusinessSnapshot>(
    `SELECT * FROM business_snapshots WHERE is_demo = $1 ORDER BY snapshot_date DESC LIMIT $2`,
    [isDemo, limit]
  );
}

// ============================================================
// 2. BUSINESS METRICS
// ============================================================

export interface CreateBusinessMetricInput {
  metric_name: string;
  metric_category?: string;
  metric_value?: number | null;
  metric_unit?: string | null;
  has_sufficient_data?: boolean;
  sample_size?: number;
  confidence?: string;
  source_phase: string;
  dimensions?: Record<string, unknown>;
  recorded_at?: string;
  is_demo?: boolean;
}

export async function createBusinessMetric(
  input: CreateBusinessMetricInput
): Promise<BusinessMetric> {
  const row = await queryOne<BusinessMetric>(
    `INSERT INTO business_metrics (
      metric_name, metric_category, metric_value, metric_unit,
      has_sufficient_data, sample_size, confidence, source_phase,
      dimensions, recorded_at, is_demo
    ) VALUES (
      $1, COALESCE($2, 'GENERAL'), $3, $4,
      COALESCE($5, false), COALESCE($6, 0), COALESCE($7, 'INSUFFICIENT_DATA'),
      $8, COALESCE($9::jsonb, '{}'::jsonb), COALESCE($10, NOW()), COALESCE($11, false)
    )
    RETURNING *`,
    [
      input.metric_name,
      input.metric_category ?? "GENERAL",
      input.metric_value ?? null,
      input.metric_unit ?? null,
      input.has_sufficient_data ?? false,
      input.sample_size ?? 0,
      input.confidence ?? "INSUFFICIENT_DATA",
      input.source_phase,
      serializeJson(input.dimensions),
      input.recorded_at ?? null,
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function listBusinessMetrics(options?: {
  metric_category?: string;
  metric_name?: string;
  is_demo?: boolean;
  limit?: number;
}): Promise<BusinessMetric[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.metric_category) {
    params.push(options.metric_category);
    conditions.push(`metric_category = $${params.length}`);
  }
  if (options?.metric_name) {
    params.push(options.metric_name);
    conditions.push(`metric_name = $${params.length}`);
  }
  const isDemo = options?.is_demo ?? false;
  params.push(isDemo);
  conditions.push(`is_demo = $${params.length}`);

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const limit = options?.limit ?? 50;
  params.push(limit);

  return queryMany<BusinessMetric>(
    `SELECT * FROM business_metrics ${whereClause} ORDER BY recorded_at DESC LIMIT $${params.length}`,
    params
  );
}

// ============================================================
// 3. UNIT ECONOMICS
// ============================================================

export interface UpsertUnitEconomicsInput {
  product_id?: string | null;
  revenue_inr?: number;
  cost_inr?: number;
  cost_status?: CostStatus;
  gross_margin_percent?: number | null;
  customer_acquisition_cost_inr?: number | null;
  customer_lifetime_value_inr?: number | null;
  payback_period_days?: number | null;
  revenue_per_user_inr?: number | null;
  confidence?: IntelligenceConfidence;
  has_sufficient_data?: boolean;
  metadata?: Record<string, unknown>;
  is_demo?: boolean;
}

export async function upsertUnitEconomics(
  input: UpsertUnitEconomicsInput
): Promise<UnitEconomics> {
  const row = await queryOne<UnitEconomics>(
    `INSERT INTO unit_economics (
      product_id, revenue_inr, cost_inr, cost_status, gross_margin_percent,
      customer_acquisition_cost_inr, customer_lifetime_value_inr,
      payback_period_days, revenue_per_user_inr, confidence,
      has_sufficient_data, metadata, is_demo, updated_at
    ) VALUES (
      $1, COALESCE($2, 0), COALESCE($3, 0), COALESCE($4, 'RECORDED_ZERO_COST'),
      $5, $6, $7, $8, $9, COALESCE($10, 'INSUFFICIENT_DATA'),
      COALESCE($11, false), COALESCE($12::jsonb, '{}'::jsonb), COALESCE($13, false), NOW()
    )
    RETURNING *`,
    [
      input.product_id ?? null,
      input.revenue_inr ?? 0,
      input.cost_inr ?? 0,
      input.cost_status ?? "RECORDED_ZERO_COST",
      input.gross_margin_percent ?? null,
      input.customer_acquisition_cost_inr ?? null,
      input.customer_lifetime_value_inr ?? null,
      input.payback_period_days ?? null,
      input.revenue_per_user_inr ?? null,
      input.confidence ?? "INSUFFICIENT_DATA",
      input.has_sufficient_data ?? false,
      serializeJson(input.metadata),
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function listUnitEconomics(options?: {
  product_id?: string;
  is_demo?: boolean;
}): Promise<UnitEconomics[]> {
  const isDemo = options?.is_demo ?? false;
  if (options?.product_id) {
    return queryMany<UnitEconomics>(
      `SELECT * FROM unit_economics WHERE product_id = $1 AND is_demo = $2 ORDER BY updated_at DESC`,
      [options.product_id, isDemo]
    );
  }
  return queryMany<UnitEconomics>(
    `SELECT * FROM unit_economics WHERE is_demo = $1 ORDER BY updated_at DESC`,
    [isDemo]
  );
}

export async function getUnitEconomics(productId?: string | null, isDemo: boolean = false): Promise<UnitEconomics | null> {
  if (productId) {
    return queryOne<UnitEconomics>(
      `SELECT * FROM unit_economics WHERE product_id = $1 AND is_demo = $2 ORDER BY updated_at DESC LIMIT 1`,
      [productId, isDemo]
    );
  }
  return queryOne<UnitEconomics>(
    `SELECT * FROM unit_economics WHERE product_id IS NULL AND is_demo = $1 ORDER BY updated_at DESC LIMIT 1`,
    [isDemo]
  );
}

// ============================================================
// 4. PRODUCT PERFORMANCE

// ============================================================

export interface UpsertProductPerformanceInput {
  product_id: string;
  performance_tier?: ProductPerformanceTier;
  traffic_count?: number;
  users_count?: number;
  customers_count?: number;
  activation_rate_percent?: number;
  revenue_inr?: number;
  refund_rate_percent?: number;
  retention_rate_percent?: number;
  churn_rate_percent?: number;
  support_burden_score?: number;
  feature_requests_count?: number;
  customer_outcomes_score?: number;
  evaluation_summary?: string | null;
  evidence?: Record<string, unknown>;
  is_demo?: boolean;
}

export async function upsertProductPerformance(
  input: UpsertProductPerformanceInput
): Promise<ProductPerformance> {
  const row = await queryOne<ProductPerformance>(
    `INSERT INTO product_performance (
      product_id, performance_tier, traffic_count, users_count, customers_count,
      activation_rate_percent, revenue_inr, refund_rate_percent, retention_rate_percent,
      churn_rate_percent, support_burden_score, feature_requests_count,
      customer_outcomes_score, evaluation_summary, evidence, is_demo, updated_at
    ) VALUES (
      $1, COALESCE($2, 'INSUFFICIENT_DATA'), COALESCE($3, 0), COALESCE($4, 0), COALESCE($5, 0),
      COALESCE($6, 0), COALESCE($7, 0), COALESCE($8, 0), COALESCE($9, 0),
      COALESCE($10, 0), COALESCE($11, 0), COALESCE($12, 0),
      COALESCE($13, 0), $14, COALESCE($15::jsonb, '{}'::jsonb), COALESCE($16, false), NOW()
    )
    ON CONFLICT (product_id) DO UPDATE SET
      performance_tier = EXCLUDED.performance_tier,
      traffic_count = EXCLUDED.traffic_count,
      users_count = EXCLUDED.users_count,
      customers_count = EXCLUDED.customers_count,
      activation_rate_percent = EXCLUDED.activation_rate_percent,
      revenue_inr = EXCLUDED.revenue_inr,
      refund_rate_percent = EXCLUDED.refund_rate_percent,
      retention_rate_percent = EXCLUDED.retention_rate_percent,
      churn_rate_percent = EXCLUDED.churn_rate_percent,
      support_burden_score = EXCLUDED.support_burden_score,
      feature_requests_count = EXCLUDED.feature_requests_count,
      customer_outcomes_score = EXCLUDED.customer_outcomes_score,
      evaluation_summary = EXCLUDED.evaluation_summary,
      evidence = EXCLUDED.evidence,
      updated_at = NOW()
    RETURNING *`,
    [
      input.product_id,
      input.performance_tier ?? "INSUFFICIENT_DATA",
      input.traffic_count ?? 0,
      input.users_count ?? 0,
      input.customers_count ?? 0,
      input.activation_rate_percent ?? 0,
      input.revenue_inr ?? 0,
      input.refund_rate_percent ?? 0,
      input.retention_rate_percent ?? 0,
      input.churn_rate_percent ?? 0,
      input.support_burden_score ?? 0,
      input.feature_requests_count ?? 0,
      input.customer_outcomes_score ?? 0,
      input.evaluation_summary ?? null,
      serializeJson(input.evidence),
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getProductPerformance(productId: string): Promise<ProductPerformance | null> {
  return queryOne<ProductPerformance>(
    `SELECT * FROM product_performance WHERE product_id = $1`,
    [productId]
  );
}

export async function listProductPerformance(options?: {
  performance_tier?: ProductPerformanceTier;
  is_demo?: boolean;
}): Promise<ProductPerformance[]> {
  const isDemo = options?.is_demo ?? false;
  if (options?.performance_tier) {
    return queryMany<ProductPerformance>(
      `SELECT * FROM product_performance WHERE performance_tier = $1 AND is_demo = $2 ORDER BY revenue_inr DESC`,
      [options.performance_tier, isDemo]
    );
  }
  return queryMany<ProductPerformance>(
    `SELECT * FROM product_performance WHERE is_demo = $1 ORDER BY revenue_inr DESC`,
    [isDemo]
  );
}

// ============================================================
// 5. CHANNEL PERFORMANCE
// ============================================================

export interface UpsertChannelPerformanceInput {
  channel_type: string;
  campaign_id?: string | null;
  performance_tier?: ChannelPerformanceTier;
  traffic_count?: number;
  qualified_leads_count?: number;
  signups_count?: number;
  customers_count?: number;
  revenue_inr?: number;
  conversion_rate_percent?: number;
  effort_score?: number;
  cost_inr?: number;
  retention_quality_score?: number;
  notes?: string | null;
  is_demo?: boolean;
}

export async function upsertChannelPerformance(
  input: UpsertChannelPerformanceInput
): Promise<ChannelPerformance> {
  const row = await queryOne<ChannelPerformance>(
    `INSERT INTO channel_performance (
      channel_type, campaign_id, performance_tier, traffic_count,
      qualified_leads_count, signups_count, customers_count, revenue_inr,
      conversion_rate_percent, effort_score, cost_inr, retention_quality_score,
      notes, is_demo, updated_at
    ) VALUES (
      $1, $2, COALESCE($3, 'INSUFFICIENT_DATA'), COALESCE($4, 0),
      COALESCE($5, 0), COALESCE($6, 0), COALESCE($7, 0), COALESCE($8, 0),
      COALESCE($9, 0), COALESCE($10, 5), COALESCE($11, 0), COALESCE($12, 50),
      $13, COALESCE($14, false), NOW()
    )
    ON CONFLICT (channel_type, campaign_id) DO UPDATE SET
      performance_tier = EXCLUDED.performance_tier,
      traffic_count = EXCLUDED.traffic_count,
      qualified_leads_count = EXCLUDED.qualified_leads_count,
      signups_count = EXCLUDED.signups_count,
      customers_count = EXCLUDED.customers_count,
      revenue_inr = EXCLUDED.revenue_inr,
      conversion_rate_percent = EXCLUDED.conversion_rate_percent,
      effort_score = EXCLUDED.effort_score,
      cost_inr = EXCLUDED.cost_inr,
      retention_quality_score = EXCLUDED.retention_quality_score,
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING *`,
    [
      input.channel_type,
      input.campaign_id ?? null,
      input.performance_tier ?? "INSUFFICIENT_DATA",
      input.traffic_count ?? 0,
      input.qualified_leads_count ?? 0,
      input.signups_count ?? 0,
      input.customers_count ?? 0,
      input.revenue_inr ?? 0,
      input.conversion_rate_percent ?? 0,
      input.effort_score ?? 5,
      input.cost_inr ?? 0,
      input.retention_quality_score ?? 50,
      input.notes ?? null,
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function listChannelPerformance(options?: {
  channel_type?: string;
  performance_tier?: ChannelPerformanceTier;
  is_demo?: boolean;
}): Promise<ChannelPerformance[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.channel_type) {
    params.push(options.channel_type);
    conditions.push(`channel_type = $${params.length}`);
  }
  if (options?.performance_tier) {
    params.push(options.performance_tier);
    conditions.push(`performance_tier = $${params.length}`);
  }
  const isDemo = options?.is_demo ?? false;
  params.push(isDemo);
  conditions.push(`is_demo = $${params.length}`);

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  return queryMany<ChannelPerformance>(
    `SELECT * FROM channel_performance ${whereClause} ORDER BY revenue_inr DESC`,
    params
  );
}

export async function getChannelPerformance(channelType: string, isDemo: boolean = false): Promise<ChannelPerformance | null> {
  return queryOne<ChannelPerformance>(
    `SELECT * FROM channel_performance WHERE channel_type = $1 AND is_demo = $2 ORDER BY updated_at DESC LIMIT 1`,
    [channelType, isDemo]
  );
}

// ============================================================
// 6. OFFER PERFORMANCE

// ============================================================

export interface UpsertOfferPerformanceInput {
  offer_id: string;
  performance_tier?: OfferPerformanceTier;
  views_count?: number;
  checkouts_started_count?: number;
  payments_completed_count?: number;
  conversion_rate_percent?: number;
  refunds_count?: number;
  refund_rate_percent?: number;
  average_order_value_inr?: number;
  total_revenue_inr?: number;
  repeat_purchases_count?: number;
  recommendations?: string | null;
  is_demo?: boolean;
}

export async function upsertOfferPerformance(
  input: UpsertOfferPerformanceInput
): Promise<OfferPerformance> {
  const row = await queryOne<OfferPerformance>(
    `INSERT INTO offer_performance (
      offer_id, performance_tier, views_count, checkouts_started_count,
      payments_completed_count, conversion_rate_percent, refunds_count,
      refund_rate_percent, average_order_value_inr, total_revenue_inr,
      repeat_purchases_count, recommendations, is_demo, updated_at
    ) VALUES (
      $1, COALESCE($2, 'PROMISING'), COALESCE($3, 0), COALESCE($4, 0),
      COALESCE($5, 0), COALESCE($6, 0), COALESCE($7, 0),
      COALESCE($8, 0), COALESCE($9, 0), COALESCE($10, 0),
      COALESCE($11, 0), $12, COALESCE($13, false), NOW()
    )
    ON CONFLICT (offer_id) DO UPDATE SET
      performance_tier = EXCLUDED.performance_tier,
      views_count = EXCLUDED.views_count,
      checkouts_started_count = EXCLUDED.checkouts_started_count,
      payments_completed_count = EXCLUDED.payments_completed_count,
      conversion_rate_percent = EXCLUDED.conversion_rate_percent,
      refunds_count = EXCLUDED.refunds_count,
      refund_rate_percent = EXCLUDED.refund_rate_percent,
      average_order_value_inr = EXCLUDED.average_order_value_inr,
      total_revenue_inr = EXCLUDED.total_revenue_inr,
      repeat_purchases_count = EXCLUDED.repeat_purchases_count,
      recommendations = EXCLUDED.recommendations,
      updated_at = NOW()
    RETURNING *`,
    [
      input.offer_id,
      input.performance_tier ?? "PROMISING",
      input.views_count ?? 0,
      input.checkouts_started_count ?? 0,
      input.payments_completed_count ?? 0,
      input.conversion_rate_percent ?? 0,
      input.refunds_count ?? 0,
      input.refund_rate_percent ?? 0,
      input.average_order_value_inr ?? 0,
      input.total_revenue_inr ?? 0,
      input.repeat_purchases_count ?? 0,
      input.recommendations ?? null,
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getOfferPerformance(offerId: string): Promise<OfferPerformance | null> {
  return queryOne<OfferPerformance>(
    `SELECT * FROM offer_performance WHERE offer_id = $1`,
    [offerId]
  );
}

export async function listOfferPerformance(options?: {
  performance_tier?: OfferPerformanceTier;
  is_demo?: boolean;
}): Promise<OfferPerformance[]> {
  const isDemo = options?.is_demo ?? false;
  if (options?.performance_tier) {
    return queryMany<OfferPerformance>(
      `SELECT * FROM offer_performance WHERE performance_tier = $1 AND is_demo = $2 ORDER BY total_revenue_inr DESC`,
      [options.performance_tier, isDemo]
    );
  }
  return queryMany<OfferPerformance>(
    `SELECT * FROM offer_performance WHERE is_demo = $1 ORDER BY total_revenue_inr DESC`,
    [isDemo]
  );
}

// ============================================================
// 7. CUSTOMER COHORTS
// ============================================================

export interface UpsertCustomerCohortInput {
  cohort_name: string;
  cohort_type: string;
  dimension_value: string;
  cohort_size?: number;
  activated_count?: number;
  retained_30d_count?: number;
  churned_count?: number;
  total_revenue_inr?: number;
  support_tickets_count?: number;
  has_sufficient_data?: boolean;
  metadata?: Record<string, unknown>;
  is_demo?: boolean;
}

export async function upsertCustomerCohort(
  input: UpsertCustomerCohortInput
): Promise<CustomerCohort> {
  const row = await queryOne<CustomerCohort>(
    `INSERT INTO customer_cohorts (
      cohort_name, cohort_type, dimension_value, cohort_size,
      activated_count, retained_30d_count, churned_count,
      total_revenue_inr, support_tickets_count, has_sufficient_data,
      metadata, is_demo, updated_at
    ) VALUES (
      $1, $2, $3, COALESCE($4, 0),
      COALESCE($5, 0), COALESCE($6, 0), COALESCE($7, 0),
      COALESCE($8, 0), COALESCE($9, 0), COALESCE($10, false),
      COALESCE($11::jsonb, '{}'::jsonb), COALESCE($12, false), NOW()
    )
    RETURNING *`,
    [
      input.cohort_name,
      input.cohort_type,
      input.dimension_value,
      input.cohort_size ?? 0,
      input.activated_count ?? 0,
      input.retained_30d_count ?? 0,
      input.churned_count ?? 0,
      input.total_revenue_inr ?? 0,
      input.support_tickets_count ?? 0,
      input.has_sufficient_data ?? false,
      serializeJson(input.metadata),
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function listCustomerCohorts(options?: {
  cohort_type?: string;
  is_demo?: boolean;
}): Promise<CustomerCohort[]> {
  const isDemo = options?.is_demo ?? false;
  if (options?.cohort_type) {
    return queryMany<CustomerCohort>(
      `SELECT * FROM customer_cohorts WHERE cohort_type = $1 AND is_demo = $2 ORDER BY cohort_size DESC`,
      [options.cohort_type, isDemo]
    );
  }
  return queryMany<CustomerCohort>(
    `SELECT * FROM customer_cohorts WHERE is_demo = $1 ORDER BY cohort_size DESC`,
    [isDemo]
  );
}

// ============================================================
// 8. PORTFOLIO DECISIONS
// ============================================================

export interface CreatePortfolioDecisionInput {
  subject_type: DecisionSubjectType;
  subject_id?: string | null;
  subject_name: string;
  decision: PortfolioDecisionType;
  status?: DecisionStatus;
  confidence?: IntelligenceConfidence;
  reasons?: string[];
  metrics_summary?: Record<string, unknown>;
  risks?: string[];
  recommended_next_action: string;
  requires_approval?: boolean;
  is_demo?: boolean;
}

export async function createPortfolioDecision(
  input: CreatePortfolioDecisionInput
): Promise<PortfolioDecision> {
  const row = await queryOne<PortfolioDecision>(
    `INSERT INTO portfolio_decisions (
      subject_type, subject_id, subject_name, decision, status,
      confidence, reasons, metrics_summary, risks, recommended_next_action,
      requires_approval, is_demo, updated_at
    ) VALUES (
      $1, $2, $3, $4, COALESCE($5, 'PROPOSED'),
      COALESCE($6, 'MEDIUM'), COALESCE($7, '{}'),
      COALESCE($8::jsonb, '{}'::jsonb), COALESCE($9, '{}'),
      $10, COALESCE($11, true), COALESCE($12, false), NOW()
    )
    RETURNING *`,
    [
      input.subject_type,
      input.subject_id ?? null,
      input.subject_name,
      input.decision,
      input.status ?? "PROPOSED",
      input.confidence ?? "MEDIUM",
      input.reasons ?? [],
      serializeJson(input.metrics_summary),
      input.risks ?? [],
      input.recommended_next_action,
      input.requires_approval !== undefined ? input.requires_approval : true,
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function updatePortfolioDecision(
  decisionId: string,
  updates: Partial<PortfolioDecision>
): Promise<PortfolioDecision | null> {
  const fields: string[] = [];
  const params: unknown[] = [decisionId];

  if (updates.status !== undefined) {
    params.push(updates.status);
    fields.push(`status = $${params.length}`);
  }
  if (updates.approved_by !== undefined) {
    params.push(updates.approved_by);
    fields.push(`approved_by = $${params.length}`);
  }
  if (updates.approved_at !== undefined) {
    params.push(updates.approved_at);
    fields.push(`approved_at = $${params.length}`);
  }
  if (updates.execution_status !== undefined) {
    params.push(updates.execution_status);
    fields.push(`execution_status = $${params.length}`);
  }
  if (updates.execution_result !== undefined) {
    params.push(serializeJson(updates.execution_result));
    fields.push(`execution_result = $${params.length}::jsonb`);
  }

  fields.push(`updated_at = NOW()`);

  return queryOne<PortfolioDecision>(
    `UPDATE portfolio_decisions SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );
}

export async function getPortfolioDecisionById(id: string): Promise<PortfolioDecision | null> {
  return queryOne<PortfolioDecision>(
    `SELECT * FROM portfolio_decisions WHERE id = $1`,
    [id]
  );
}

export async function listPortfolioDecisions(options?: {
  decision?: PortfolioDecisionType;
  status?: DecisionStatus;
  subject_type?: DecisionSubjectType;
  is_demo?: boolean;
  limit?: number;
}): Promise<PortfolioDecision[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.decision) {
    params.push(options.decision);
    conditions.push(`decision = $${params.length}`);
  }
  if (options?.status) {
    params.push(options.status);
    conditions.push(`status = $${params.length}`);
  }
  if (options?.subject_type) {
    params.push(options.subject_type);
    conditions.push(`subject_type = $${params.length}`);
  }
  const isDemo = options?.is_demo ?? false;
  params.push(isDemo);
  conditions.push(`is_demo = $${params.length}`);

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const limit = options?.limit ?? 50;
  params.push(limit);

  return queryMany<PortfolioDecision>(
    `SELECT * FROM portfolio_decisions ${whereClause} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  );
}

// ============================================================
// 9. DECISION RECOMMENDATIONS & EVIDENCE
// ============================================================

export interface CreateDecisionRecommendationInput {
  decision_id: string;
  action_type: string;
  title: string;
  description: string;
  priority?: string;
  expected_impact?: string | null;
  effort_estimate?: string;
  cost_estimate_inr?: number;
  requires_approval?: boolean;
  is_demo?: boolean;
}

export async function createDecisionRecommendation(
  input: CreateDecisionRecommendationInput
): Promise<DecisionRecommendation> {
  const row = await queryOne<DecisionRecommendation>(
    `INSERT INTO decision_recommendations (
      decision_id, action_type, title, description, priority,
      expected_impact, effort_estimate, cost_estimate_inr,
      requires_approval, is_demo
    ) VALUES ($1, $2, $3, $4, COALESCE($5, 'MEDIUM'), $6, COALESCE($7, 'LOW'), COALESCE($8, 0), COALESCE($9, true), COALESCE($10, false))
    RETURNING *`,
    [
      input.decision_id,
      input.action_type,
      input.title,
      input.description,
      input.priority ?? "MEDIUM",
      input.expected_impact ?? null,
      input.effort_estimate ?? "LOW",
      input.cost_estimate_inr ?? 0,
      input.requires_approval !== undefined ? input.requires_approval : true,
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function listDecisionRecommendations(decisionId: string): Promise<DecisionRecommendation[]> {
  return queryMany<DecisionRecommendation>(
    `SELECT * FROM decision_recommendations WHERE decision_id = $1 ORDER BY created_at ASC`,
    [decisionId]
  );
}

export interface CreateDecisionEvidenceInput {
  decision_id: string;
  evidence_type: string;
  metric_name: string;
  metric_value: string;
  sample_size?: number;
  source_reference?: string | null;
  confidence?: number;
}

export async function createDecisionEvidence(
  input: CreateDecisionEvidenceInput
): Promise<DecisionEvidence> {
  const row = await queryOne<DecisionEvidence>(
    `INSERT INTO decision_evidence (
      decision_id, evidence_type, metric_name, metric_value,
      sample_size, source_reference, confidence
    ) VALUES ($1, $2, $3, $4, COALESCE($5, 1), $6, COALESCE($7, 100))
    RETURNING *`,
    [
      input.decision_id,
      input.evidence_type,
      input.metric_name,
      input.metric_value,
      input.sample_size ?? 1,
      input.source_reference ?? null,
      input.confidence ?? 100,
    ]
  );
  return row!;
}

export async function listDecisionEvidence(decisionId: string): Promise<DecisionEvidence[]> {
  return queryMany<DecisionEvidence>(
    `SELECT * FROM decision_evidence WHERE decision_id = $1 ORDER BY created_at ASC`,
    [decisionId]
  );
}

// ============================================================
// 10. BUSINESS FORECASTS
// ============================================================

export interface CreateBusinessForecastInput {
  forecast_type: string;
  target_metric: string;
  forecast_value?: number | null;
  projected_change_percent?: number | null;
  confidence?: IntelligenceConfidence;
  data_window_days?: number;
  assumptions?: string[];
  has_sufficient_data?: boolean;
  is_demo?: boolean;
}

export async function createBusinessForecast(
  input: CreateBusinessForecastInput
): Promise<BusinessForecast> {
  const row = await queryOne<BusinessForecast>(
    `INSERT INTO business_forecasts (
      forecast_type, target_metric, forecast_value, projected_change_percent,
      confidence, data_window_days, assumptions, has_sufficient_data, is_demo
    ) VALUES (
      $1, $2, $3, $4, COALESCE($5, 'INSUFFICIENT_DATA'),
      COALESCE($6, 30), COALESCE($7, '{}'), COALESCE($8, false), COALESCE($9, false)
    )
    RETURNING *`,
    [
      input.forecast_type,
      input.target_metric,
      input.forecast_value ?? null,
      input.projected_change_percent ?? null,
      input.confidence ?? "INSUFFICIENT_DATA",
      input.data_window_days ?? 30,
      input.assumptions ?? [],
      input.has_sufficient_data ?? false,
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function listBusinessForecasts(options?: {
  forecast_type?: string;
  is_demo?: boolean;
}): Promise<BusinessForecast[]> {
  const isDemo = options?.is_demo ?? false;
  if (options?.forecast_type) {
    return queryMany<BusinessForecast>(
      `SELECT * FROM business_forecasts WHERE forecast_type = $1 AND is_demo = $2 ORDER BY created_at DESC`,
      [options.forecast_type, isDemo]
    );
  }
  return queryMany<BusinessForecast>(
    `SELECT * FROM business_forecasts WHERE is_demo = $1 ORDER BY created_at DESC`,
    [isDemo]
  );
}

// ============================================================
// 11. RESOURCE ALLOCATIONS
// ============================================================

export interface UpsertResourceAllocationInput {
  category: ResourceCategory;
  allocation_percentage?: number;
  time_hours_per_week?: number;
  compute_capacity_level?: string;
  attention_priority?: number;
  justification: string;
  cost_inr?: number;
  status?: string;
  is_demo?: boolean;
}

export async function upsertResourceAllocation(
  input: UpsertResourceAllocationInput
): Promise<ResourceAllocation> {
  const row = await queryOne<ResourceAllocation>(
    `INSERT INTO resource_allocations (
      category, allocation_percentage, time_hours_per_week, compute_capacity_level,
      attention_priority, justification, cost_inr, status, is_demo, updated_at
    ) VALUES (
      $1, COALESCE($2, 20), COALESCE($3, 0), COALESCE($4, 'STANDARD'),
      COALESCE($5, 1), $6, 0, COALESCE($7, 'ACTIVE'), COALESCE($8, false), NOW()
    )
    RETURNING *`,
    [
      input.category,
      input.allocation_percentage ?? 20,
      input.time_hours_per_week ?? 0,
      input.compute_capacity_level ?? "STANDARD",
      input.attention_priority ?? 1,
      input.justification,
      input.status ?? "ACTIVE",
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function listResourceAllocations(options?: {
  is_demo?: boolean;
}): Promise<ResourceAllocation[]> {
  const isDemo = options?.is_demo ?? false;
  return queryMany<ResourceAllocation>(
    `SELECT * FROM resource_allocations WHERE is_demo = $1 ORDER BY attention_priority ASC`,
    [isDemo]
  );
}

// ============================================================
// 12. BUSINESS GOALS
// ============================================================

export interface CreateBusinessGoalInput {
  name: string;
  target_value: number;
  current_value?: number;
  unit?: string;
  deadline?: string | null;
  status?: string;
  metadata?: Record<string, unknown>;
  is_demo?: boolean;
}

export async function createBusinessGoal(
  input: CreateBusinessGoalInput
): Promise<BusinessGoal> {
  const row = await queryOne<BusinessGoal>(
    `INSERT INTO business_goals (
      name, target_value, current_value, unit, deadline,
      status, metadata, is_demo, updated_at
    ) VALUES ($1, $2, COALESCE($3, 0), COALESCE($4, 'CUSTOMERS'), $5, COALESCE($6, 'ACTIVE'), COALESCE($7::jsonb, '{}'::jsonb), COALESCE($8, false), NOW())
    RETURNING *`,
    [
      input.name,
      input.target_value,
      input.current_value ?? 0,
      input.unit ?? "CUSTOMERS",
      input.deadline ?? null,
      input.status ?? "ACTIVE",
      serializeJson(input.metadata),
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function updateBusinessGoal(
  goalId: string,
  updates: Partial<BusinessGoal>
): Promise<BusinessGoal | null> {
  const fields: string[] = [];
  const params: unknown[] = [goalId];

  if (updates.current_value !== undefined) {
    params.push(updates.current_value);
    fields.push(`current_value = $${params.length}`);
  }
  if (updates.status !== undefined) {
    params.push(updates.status);
    fields.push(`status = $${params.length}`);
  }

  fields.push(`updated_at = NOW()`);

  return queryOne<BusinessGoal>(
    `UPDATE business_goals SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );
}

export async function listBusinessGoals(options?: {
  status?: string;
  is_demo?: boolean;
}): Promise<BusinessGoal[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.status) {
    params.push(options.status);
    conditions.push(`status = $${params.length}`);
  }
  const isDemo = options?.is_demo ?? false;
  params.push(isDemo);
  conditions.push(`is_demo = $${params.length}`);

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  return queryMany<BusinessGoal>(
    `SELECT * FROM business_goals ${whereClause} ORDER BY created_at DESC`,
    params
  );
}

// ============================================================
// 13. BUSINESS RISKS
// ============================================================

export interface CreateBusinessRiskInput {
  category: RiskCategory;
  title: string;
  description: string;
  severity?: RiskSeverity;
  probability?: string;
  evidence?: string | null;
  mitigation: string;
  owner?: string;
  status?: RiskStatus;
  is_demo?: boolean;
}

export async function createBusinessRisk(
  input: CreateBusinessRiskInput
): Promise<BusinessRisk> {
  const row = await queryOne<BusinessRisk>(
    `INSERT INTO business_risks (
      category, title, description, severity, probability,
      evidence, mitigation, owner, status, is_demo, updated_at
    ) VALUES (
      $1, $2, $3, COALESCE($4, 'MEDIUM'), COALESCE($5, 'MEDIUM'),
      $6, $7, COALESCE($8, 'system'), COALESCE($9, 'OPEN'), COALESCE($10, false), NOW()
    )
    RETURNING *`,
    [
      input.category,
      input.title,
      input.description,
      input.severity ?? "MEDIUM",
      input.probability ?? "MEDIUM",
      input.evidence ?? null,
      input.mitigation,
      input.owner ?? "system",
      input.status ?? "OPEN",
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function updateBusinessRisk(
  riskId: string,
  updates: Partial<BusinessRisk>
): Promise<BusinessRisk | null> {
  const fields: string[] = [];
  const params: unknown[] = [riskId];

  if (updates.status !== undefined) {
    params.push(updates.status);
    fields.push(`status = $${params.length}`);
  }
  if (updates.severity !== undefined) {
    params.push(updates.severity);
    fields.push(`severity = $${params.length}`);
  }
  if (updates.mitigation !== undefined) {
    params.push(updates.mitigation);
    fields.push(`mitigation = $${params.length}`);
  }

  fields.push(`updated_at = NOW()`);

  return queryOne<BusinessRisk>(
    `UPDATE business_risks SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );
}

export async function listBusinessRisks(options?: {
  category?: RiskCategory;
  status?: RiskStatus;
  severity?: RiskSeverity;
  is_demo?: boolean;
}): Promise<BusinessRisk[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.category) {
    params.push(options.category);
    conditions.push(`category = $${params.length}`);
  }
  if (options?.status) {
    params.push(options.status);
    conditions.push(`status = $${params.length}`);
  }
  if (options?.severity) {
    params.push(options.severity);
    conditions.push(`severity = $${params.length}`);
  }
  const isDemo = options?.is_demo ?? false;
  params.push(isDemo);
  conditions.push(`is_demo = $${params.length}`);

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  return queryMany<BusinessRisk>(
    `SELECT * FROM business_risks ${whereClause} ORDER BY created_at DESC`,
    params
  );
}

// ============================================================
// 14. BUSINESS LEARNING
// ============================================================

export interface CreateBusinessLearningInput {
  source_phase: string;
  category: string;
  title: string;
  summary: string;
  why: string;
  evidence: string;
  confidence?: string;
  recommended_action: string;
  tags?: string[];
  is_demo?: boolean;
}

export async function createBusinessLearning(
  input: CreateBusinessLearningInput
): Promise<BusinessLearning> {
  const row = await queryOne<BusinessLearning>(
    `INSERT INTO business_learning (
      source_phase, category, title, summary, why, evidence,
      confidence, recommended_action, tags, is_demo
    ) VALUES (
      $1, $2, $3, $4, $5, $6, COALESCE($7, 'MEDIUM'), $8,
      COALESCE($9, '{}'), COALESCE($10, false)
    )
    RETURNING *`,
    [
      input.source_phase,
      input.category,
      input.title,
      input.summary,
      input.why,
      input.evidence,
      input.confidence ?? "MEDIUM",
      input.recommended_action,
      input.tags ?? [],
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function listBusinessLearning(options?: {
  category?: string;
  source_phase?: string;
  is_demo?: boolean;
}): Promise<BusinessLearning[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.category) {
    params.push(options.category);
    conditions.push(`category = $${params.length}`);
  }
  if (options?.source_phase) {
    params.push(options.source_phase);
    conditions.push(`source_phase = $${params.length}`);
  }
  const isDemo = options?.is_demo ?? false;
  params.push(isDemo);
  conditions.push(`is_demo = $${params.length}`);

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  return queryMany<BusinessLearning>(
    `SELECT * FROM business_learning ${whereClause} ORDER BY created_at DESC`,
    params
  );
}

// ============================================================
// 15. BUSINESS JOBS & EVENTS
// ============================================================

export interface CreateBusinessJobInput {
  job_type: BIJobType;
  status?: BIJobStatus;
  payload?: Record<string, unknown>;
}

export async function createBusinessJob(
  input: CreateBusinessJobInput
): Promise<BusinessJob> {
  const row = await queryOne<BusinessJob>(
    `INSERT INTO business_jobs (
      job_type, status, payload
    ) VALUES ($1, COALESCE($2, 'PENDING'), COALESCE($3::jsonb, '{}'::jsonb))
    RETURNING *`,
    [
      input.job_type,
      input.status ?? "PENDING",
      serializeJson(input.payload),
    ]
  );
  return row!;
}

export async function updateBusinessJob(
  jobId: string,
  updates: {
    status?: BIJobStatus;
    result?: Record<string, unknown> | null;
    error_message?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
  }
): Promise<BusinessJob | null> {
  const fields: string[] = [];
  const params: unknown[] = [jobId];

  if (updates.status !== undefined) {
    params.push(updates.status);
    fields.push(`status = $${params.length}`);
  }
  if (updates.result !== undefined) {
    params.push(serializeJson(updates.result));
    fields.push(`result = $${params.length}::jsonb`);
  }
  if (updates.error_message !== undefined) {
    params.push(updates.error_message);
    fields.push(`error_message = $${params.length}`);
  }
  if (updates.started_at !== undefined) {
    params.push(updates.started_at);
    fields.push(`started_at = $${params.length}`);
  }
  if (updates.completed_at !== undefined) {
    params.push(updates.completed_at);
    fields.push(`completed_at = $${params.length}`);
  }

  return queryOne<BusinessJob>(
    `UPDATE business_jobs SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );
}

export async function listBusinessJobs(options?: {
  job_type?: BIJobType;
  status?: BIJobStatus;
  limit?: number;
}): Promise<BusinessJob[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.job_type) {
    params.push(options.job_type);
    conditions.push(`job_type = $${params.length}`);
  }
  if (options?.status) {
    params.push(options.status);
    conditions.push(`status = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options?.limit ?? 50;
  params.push(limit);

  return queryMany<BusinessJob>(
    `SELECT * FROM business_jobs ${whereClause} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  );
}

export interface CreateBusinessEventInput {
  event_type: string;
  entity_type: string;
  entity_id?: string | null;
  details?: Record<string, unknown>;
}

export async function createBusinessEvent(
  input: CreateBusinessEventInput
): Promise<BusinessEvent> {
  const row = await queryOne<BusinessEvent>(
    `INSERT INTO business_events (
      event_type, entity_type, entity_id, details
    ) VALUES ($1, $2, $3, COALESCE($4::jsonb, '{}'::jsonb))
    RETURNING *`,
    [
      input.event_type,
      input.entity_type,
      input.entity_id ?? null,
      serializeJson(input.details),
    ]
  );
  return row!;
}

export async function listBusinessEvents(options?: {
  event_type?: string;
  entity_type?: string;
  limit?: number;
}): Promise<BusinessEvent[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.event_type) {
    params.push(options.event_type);
    conditions.push(`event_type = $${params.length}`);
  }
  if (options?.entity_type) {
    params.push(options.entity_type);
    conditions.push(`entity_type = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options?.limit ?? 100;
  params.push(limit);

  return queryMany<BusinessEvent>(
    `SELECT * FROM business_events ${whereClause} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  );
}

// ============================================================
// AGGREGATED REPOSITORY OBJECT
// ============================================================

export const intelligenceRepo = {
  createSnapshot: createBusinessSnapshot,
  getLatestSnapshot: getLatestBusinessSnapshot,
  listSnapshots: listBusinessSnapshots,

  createMetric: createBusinessMetric,
  listMetrics: listBusinessMetrics,

  upsertUnitEconomics,
  getUnitEconomics,
  listUnitEconomics,

  upsertProductPerformance,
  getProductPerformance,
  listProductPerformances: listProductPerformance,

  upsertChannelPerformance,
  getChannelPerformance,
  listChannelPerformances: listChannelPerformance,

  upsertOfferPerformance,
  getOfferPerformance,
  listOfferPerformances: listOfferPerformance,

  saveCohort: upsertCustomerCohort,
  listCohorts: listCustomerCohorts,

  saveDecision: createPortfolioDecision,
  getDecisionById: getPortfolioDecisionById,
  updateDecision: updatePortfolioDecision,
  listDecisions: listPortfolioDecisions,

  saveDecisionRecommendation: createDecisionRecommendation,
  listRecommendations: listDecisionRecommendations,

  saveDecisionEvidence: createDecisionEvidence,
  listEvidence: listDecisionEvidence,

  saveForecast: createBusinessForecast,
  listForecasts: listBusinessForecasts,

  saveResourceAllocation: upsertResourceAllocation,
  listResourceAllocations,

  saveGoal: async (goal: BusinessGoal) => {
    return createBusinessGoal({
      name: goal.name,
      target_value: goal.target_value,
      current_value: goal.current_value,
      unit: goal.unit,
      deadline: goal.deadline,
      status: goal.status,
      metadata: goal.metadata,
      is_demo: goal.is_demo,
    });
  },
  updateGoal: updateBusinessGoal,
  getGoals: listBusinessGoals,

  saveRisk: async (risk: BusinessRisk) => {
    return createBusinessRisk({
      category: risk.category,
      title: risk.title,
      description: risk.description,
      severity: risk.severity,
      probability: risk.probability,
      evidence: risk.evidence,
      mitigation: risk.mitigation,
      owner: risk.owner,
      status: risk.status,
      is_demo: risk.is_demo,
    });
  },
  updateRisk: updateBusinessRisk,
  listRisks: listBusinessRisks,

  saveLearning: async (learning: BusinessLearning) => {
    return createBusinessLearning({
      source_phase: learning.source_phase,
      category: learning.category,
      title: learning.title,
      summary: learning.summary,
      why: learning.why,
      evidence: learning.evidence,
      confidence: learning.confidence,
      recommended_action: learning.recommended_action,
      tags: learning.tags,
      is_demo: learning.is_demo,
    });
  },
  listLearnings: listBusinessLearning,


  saveJob: async (job: BusinessJob) => {
    return createBusinessJob({
      job_type: job.job_type,
      status: job.status,
      payload: job.payload,
    });
  },
  updateJobStatus: async (
    jobId: string,
    status: BIJobStatus,
    result?: Record<string, unknown> | null,
    errorMessage?: string | null
  ) => {
    return updateBusinessJob(jobId, {
      status,
      result,
      error_message: errorMessage,
      completed_at: status === "COMPLETED" || status === "FAILED" ? new Date().toISOString() : undefined,
    });
  },
  listJobs: listBusinessJobs,

  logEvent: async (
    eventType: string,
    entityType: string,
    entityId?: string | null,
    details?: Record<string, unknown>
  ) => {
    return createBusinessEvent({
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      details,
    });
  },
  listEvents: listBusinessEvents,
};

