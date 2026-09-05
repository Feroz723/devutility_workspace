import { queryOne, queryMany, query } from "../client";
import type {
  CustomerProfile,
  CustomerSession,
  CustomerEvent,
  CustomerActivation,
  CustomerGoal,
  CustomerMilestone,
  CustomerHealth,
  CustomerFeedback,
  CustomerSupportRequest,
  CustomerSupportMessage,
  CustomerIntervention,
  CustomerOnboarding,
  CustomerRetention,
  CustomerChurn,
  CustomerSuccessJob,
  CustomerSuccessEvent,
  JourneyStage,
  CustomerEventType,
  ActivationStatus,
  GoalCompletionStatus,
  CustomerHealthStatus,
  FeedbackType,
  SupportCategory,
  SupportSeverity,
  SupportStatus,
  InterventionType,
  InterventionStatus,
  ChurnStatus,
  CSJobType,
  CSJobStatus,
} from "@/types/customer-success";

function serializeJson(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  return typeof val === "string" ? val : JSON.stringify(val);
}

// ============================================================
// 1. CUSTOMER PROFILES
// ============================================================

export interface CreateOrUpdateCustomerProfileInput {
  customer_id: string;
  journey_stage?: JourneyStage;
  unsubscribed?: boolean;
  communication_opt_in?: boolean;
  daily_message_limit?: number;
  weekly_message_limit?: number;
  preferred_channel?: string;
  timezone?: string | null;
  metadata?: Record<string, unknown>;
  is_demo?: boolean;
}

export async function upsertCustomerProfile(
  input: CreateOrUpdateCustomerProfileInput
): Promise<CustomerProfile> {
  const row = await queryOne<CustomerProfile>(
    `INSERT INTO customer_profiles (
      customer_id, journey_stage, unsubscribed, communication_opt_in,
      daily_message_limit, weekly_message_limit, preferred_channel, timezone,
      metadata, is_demo, updated_at
    ) VALUES (
      $1, COALESCE($2, 'CUSTOMER'), COALESCE($3, false), COALESCE($4, true),
      COALESCE($5, 2), COALESCE($6, 5), COALESCE($7, 'EMAIL'), $8,
      COALESCE($9::jsonb, '{}'::jsonb), COALESCE($10, false), NOW()
    )
    ON CONFLICT (customer_id) DO UPDATE SET
      journey_stage = COALESCE(EXCLUDED.journey_stage, customer_profiles.journey_stage),
      unsubscribed = COALESCE(EXCLUDED.unsubscribed, customer_profiles.unsubscribed),
      communication_opt_in = COALESCE(EXCLUDED.communication_opt_in, customer_profiles.communication_opt_in),
      daily_message_limit = COALESCE(EXCLUDED.daily_message_limit, customer_profiles.daily_message_limit),
      weekly_message_limit = COALESCE(EXCLUDED.weekly_message_limit, customer_profiles.weekly_message_limit),
      preferred_channel = COALESCE(EXCLUDED.preferred_channel, customer_profiles.preferred_channel),
      timezone = COALESCE(EXCLUDED.timezone, customer_profiles.timezone),
      metadata = customer_profiles.metadata || EXCLUDED.metadata,
      updated_at = NOW()
    RETURNING *`,
    [
      input.customer_id,
      input.journey_stage ?? null,
      input.unsubscribed !== undefined ? input.unsubscribed : null,
      input.communication_opt_in !== undefined ? input.communication_opt_in : null,
      input.daily_message_limit ?? null,
      input.weekly_message_limit ?? null,
      input.preferred_channel ?? null,
      input.timezone ?? null,
      serializeJson(input.metadata),
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getCustomerProfileByCustomerId(
  customerId: string
): Promise<CustomerProfile | null> {
  return queryOne<CustomerProfile>(
    `SELECT * FROM customer_profiles WHERE customer_id = $1`,
    [customerId]
  );
}

export async function listCustomerProfiles(options?: {
  journey_stage?: JourneyStage;
  is_demo?: boolean;
  limit?: number;
  offset?: number;
}): Promise<CustomerProfile[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.journey_stage) {
    params.push(options.journey_stage);
    conditions.push(`journey_stage = $${params.length}`);
  }
  if (options?.is_demo !== undefined) {
    params.push(options.is_demo);
    conditions.push(`is_demo = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;
  params.push(limit, offset);

  return queryMany<CustomerProfile>(
    `SELECT * FROM customer_profiles ${whereClause} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
}

// ============================================================
// 2. CUSTOMER SESSIONS
// ============================================================

export interface CreateCustomerSessionInput {
  customer_id: string;
  product_id?: string | null;
  session_token: string;
  started_at?: string;
  device_type?: string | null;
  browser?: string | null;
  ip_address_hash?: string | null;
  is_demo?: boolean;
}

export async function createCustomerSession(
  input: CreateCustomerSessionInput
): Promise<CustomerSession> {
  const row = await queryOne<CustomerSession>(
    `INSERT INTO customer_sessions (
      customer_id, product_id, session_token, started_at,
      device_type, browser, ip_address_hash, is_demo
    ) VALUES ($1, $2, $3, COALESCE($4, NOW()), $5, $6, $7, COALESCE($8, false))
    RETURNING *`,
    [
      input.customer_id,
      input.product_id ?? null,
      input.session_token,
      input.started_at ?? null,
      input.device_type ?? null,
      input.browser ?? null,
      input.ip_address_hash ?? null,
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function endCustomerSession(
  sessionToken: string,
  updates: {
    duration_seconds?: number;
    page_views_count?: number;
    actions_count?: number;
  }
): Promise<CustomerSession | null> {
  return queryOne<CustomerSession>(
    `UPDATE customer_sessions SET
      ended_at = NOW(),
      duration_seconds = COALESCE($2, duration_seconds),
      page_views_count = COALESCE($3, page_views_count),
      actions_count = COALESCE($4, actions_count)
    WHERE session_token = $1
    RETURNING *`,
    [
      sessionToken,
      updates.duration_seconds ?? null,
      updates.page_views_count ?? null,
      updates.actions_count ?? null,
    ]
  );
}

export async function listCustomerSessions(options?: {
  customer_id?: string;
  product_id?: string;
  is_demo?: boolean;
  limit?: number;
}): Promise<CustomerSession[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.customer_id) {
    params.push(options.customer_id);
    conditions.push(`customer_id = $${params.length}`);
  }
  if (options?.product_id) {
    params.push(options.product_id);
    conditions.push(`product_id = $${params.length}`);
  }
  if (options?.is_demo !== undefined) {
    params.push(options.is_demo);
    conditions.push(`is_demo = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options?.limit ?? 100;
  params.push(limit);

  return queryMany<CustomerSession>(
    `SELECT * FROM customer_sessions ${whereClause} ORDER BY started_at DESC LIMIT $${params.length}`,
    params
  );
}

// ============================================================
// 3. CUSTOMER EVENTS
// ============================================================

export interface CreateCustomerEventInput {
  customer_id: string;
  product_id?: string | null;
  session_id?: string | null;
  event_type: CustomerEventType;
  event_name: string;
  properties?: Record<string, unknown>;
  source?: string;
  confidence?: number;
  is_demo?: boolean;
}

export async function createCustomerEvent(
  input: CreateCustomerEventInput
): Promise<CustomerEvent> {
  const row = await queryOne<CustomerEvent>(
    `INSERT INTO customer_events (
      customer_id, product_id, session_id, event_type,
      event_name, properties, source, confidence, is_demo
    ) VALUES ($1, $2, $3, $4, $5, COALESCE($6::jsonb, '{}'::jsonb), COALESCE($7, 'IN_APP'), COALESCE($8, 100), COALESCE($9, false))
    RETURNING *`,
    [
      input.customer_id,
      input.product_id ?? null,
      input.session_id ?? null,
      input.event_type,
      input.event_name,
      serializeJson(input.properties),
      input.source ?? "IN_APP",
      input.confidence ?? 100,
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function listCustomerEvents(options?: {
  customer_id?: string;
  product_id?: string;
  event_type?: CustomerEventType;
  is_demo?: boolean;
  limit?: number;
  offset?: number;
}): Promise<CustomerEvent[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.customer_id) {
    params.push(options.customer_id);
    conditions.push(`customer_id = $${params.length}`);
  }
  if (options?.product_id) {
    params.push(options.product_id);
    conditions.push(`product_id = $${params.length}`);
  }
  if (options?.event_type) {
    params.push(options.event_type);
    conditions.push(`event_type = $${params.length}`);
  }
  if (options?.is_demo !== undefined) {
    params.push(options.is_demo);
    conditions.push(`is_demo = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;
  params.push(limit, offset);

  return queryMany<CustomerEvent>(
    `SELECT * FROM customer_events ${whereClause} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
}

// ============================================================
// 4. CUSTOMER ACTIVATIONS
// ============================================================

export interface UpsertCustomerActivationInput {
  customer_id: string;
  product_id: string;
  status?: ActivationStatus;
  activation_started_at?: string | null;
  activation_completed_at?: string | null;
  time_to_value_seconds?: number | null;
  first_action_name?: string | null;
  first_value_name?: string | null;
  milestones_total?: number;
  milestones_completed?: number;
  details?: Record<string, unknown>;
  is_demo?: boolean;
}

export async function upsertCustomerActivation(
  input: UpsertCustomerActivationInput
): Promise<CustomerActivation> {
  const row = await queryOne<CustomerActivation>(
    `INSERT INTO customer_activations (
      customer_id, product_id, status, activation_started_at,
      activation_completed_at, time_to_value_seconds, first_action_name,
      first_value_name, milestones_total, milestones_completed, details, is_demo, updated_at
    ) VALUES (
      $1, $2, COALESCE($3, 'NOT_STARTED'), $4, $5, $6, $7, $8,
      COALESCE($9, 0), COALESCE($10, 0), COALESCE($11::jsonb, '{}'::jsonb), COALESCE($12, false), NOW()
    )
    ON CONFLICT (customer_id, product_id) DO UPDATE SET
      status = COALESCE(EXCLUDED.status, customer_activations.status),
      activation_started_at = COALESCE(EXCLUDED.activation_started_at, customer_activations.activation_started_at),
      activation_completed_at = COALESCE(EXCLUDED.activation_completed_at, customer_activations.activation_completed_at),
      time_to_value_seconds = COALESCE(EXCLUDED.time_to_value_seconds, customer_activations.time_to_value_seconds),
      first_action_name = COALESCE(EXCLUDED.first_action_name, customer_activations.first_action_name),
      first_value_name = COALESCE(EXCLUDED.first_value_name, customer_activations.first_value_name),
      milestones_total = COALESCE(EXCLUDED.milestones_total, customer_activations.milestones_total),
      milestones_completed = COALESCE(EXCLUDED.milestones_completed, customer_activations.milestones_completed),
      details = customer_activations.details || EXCLUDED.details,
      updated_at = NOW()
    RETURNING *`,
    [
      input.customer_id,
      input.product_id,
      input.status ?? null,
      input.activation_started_at ?? null,
      input.activation_completed_at ?? null,
      input.time_to_value_seconds ?? null,
      input.first_action_name ?? null,
      input.first_value_name ?? null,
      input.milestones_total ?? null,
      input.milestones_completed ?? null,
      serializeJson(input.details),
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getCustomerActivation(
  customerId: string,
  productId: string
): Promise<CustomerActivation | null> {
  return queryOne<CustomerActivation>(
    `SELECT * FROM customer_activations WHERE customer_id = $1 AND product_id = $2`,
    [customerId, productId]
  );
}

export async function listCustomerActivations(options?: {
  product_id?: string;
  status?: ActivationStatus;
  is_demo?: boolean;
  limit?: number;
}): Promise<CustomerActivation[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.product_id) {
    params.push(options.product_id);
    conditions.push(`product_id = $${params.length}`);
  }
  if (options?.status) {
    params.push(options.status);
    conditions.push(`status = $${params.length}`);
  }
  if (options?.is_demo !== undefined) {
    params.push(options.is_demo);
    conditions.push(`is_demo = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options?.limit ?? 100;
  params.push(limit);

  return queryMany<CustomerActivation>(
    `SELECT * FROM customer_activations ${whereClause} ORDER BY updated_at DESC LIMIT $${params.length}`,
    params
  );
}

// ============================================================
// 5. CUSTOMER GOALS & MILESTONES
// ============================================================

export interface CreateCustomerGoalInput {
  customer_id: string;
  product_id: string;
  title: string;
  description?: string | null;
  expected_outcome?: string | null;
  completion_status?: GoalCompletionStatus;
  progress_percent?: number;
  target_date?: string | null;
  metadata?: Record<string, unknown>;
  is_demo?: boolean;
}

export async function createCustomerGoal(
  input: CreateCustomerGoalInput
): Promise<CustomerGoal> {
  const row = await queryOne<CustomerGoal>(
    `INSERT INTO customer_goals (
      customer_id, product_id, title, description, expected_outcome,
      completion_status, progress_percent, target_date, metadata, is_demo
    ) VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'IN_PROGRESS'), COALESCE($7, 0), $8, COALESCE($9::jsonb, '{}'::jsonb), COALESCE($10, false))
    RETURNING *`,
    [
      input.customer_id,
      input.product_id,
      input.title,
      input.description ?? null,
      input.expected_outcome ?? null,
      input.completion_status ?? null,
      input.progress_percent ?? null,
      input.target_date ?? null,
      serializeJson(input.metadata),
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function updateCustomerGoal(
  goalId: string,
  updates: Partial<CustomerGoal>
): Promise<CustomerGoal | null> {
  const fields: string[] = [];
  const params: unknown[] = [goalId];

  if (updates.completion_status !== undefined) {
    params.push(updates.completion_status);
    fields.push(`completion_status = $${params.length}`);
  }
  if (updates.progress_percent !== undefined) {
    params.push(updates.progress_percent);
    fields.push(`progress_percent = $${params.length}`);
  }
  if (updates.achieved_at !== undefined) {
    params.push(updates.achieved_at);
    fields.push(`achieved_at = $${params.length}`);
  }
  if (updates.metadata !== undefined) {
    params.push(serializeJson(updates.metadata));
    fields.push(`metadata = $${params.length}::jsonb`);
  }

  fields.push(`updated_at = NOW()`);

  return queryOne<CustomerGoal>(
    `UPDATE customer_goals SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );
}

export async function listCustomerGoals(options?: {
  customer_id?: string;
  product_id?: string;
  completion_status?: GoalCompletionStatus;
  is_demo?: boolean;
}): Promise<CustomerGoal[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.customer_id) {
    params.push(options.customer_id);
    conditions.push(`customer_id = $${params.length}`);
  }
  if (options?.product_id) {
    params.push(options.product_id);
    conditions.push(`product_id = $${params.length}`);
  }
  if (options?.completion_status) {
    params.push(options.completion_status);
    conditions.push(`completion_status = $${params.length}`);
  }
  if (options?.is_demo !== undefined) {
    params.push(options.is_demo);
    conditions.push(`is_demo = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return queryMany<CustomerGoal>(
    `SELECT * FROM customer_goals ${whereClause} ORDER BY created_at DESC`,
    params
  );
}

export interface CreateCustomerMilestoneInput {
  goal_id: string;
  customer_id: string;
  name: string;
  sequence_order?: number;
  is_completed?: boolean;
  evidence?: Record<string, unknown>;
}

export async function createCustomerMilestone(
  input: CreateCustomerMilestoneInput
): Promise<CustomerMilestone> {
  const row = await queryOne<CustomerMilestone>(
    `INSERT INTO customer_milestones (
      goal_id, customer_id, name, sequence_order, is_completed, evidence
    ) VALUES ($1, $2, $3, COALESCE($4, 1), COALESCE($5, false), COALESCE($6::jsonb, '{}'::jsonb))
    RETURNING *`,
    [
      input.goal_id,
      input.customer_id,
      input.name,
      input.sequence_order ?? 1,
      input.is_completed ?? false,
      serializeJson(input.evidence),
    ]
  );
  return row!;
}

export async function updateCustomerMilestone(
  milestoneId: string,
  isCompleted: boolean,
  evidence?: Record<string, unknown>
): Promise<CustomerMilestone | null> {
  return queryOne<CustomerMilestone>(
    `UPDATE customer_milestones SET
      is_completed = $2,
      completed_at = CASE WHEN $2 = true THEN NOW() ELSE NULL END,
      evidence = CASE WHEN $3::jsonb IS NOT NULL THEN customer_milestones.evidence || $3::jsonb ELSE customer_milestones.evidence END
    WHERE id = $1
    RETURNING *`,
    [milestoneId, isCompleted, serializeJson(evidence)]
  );
}

export async function listCustomerMilestones(goalId: string): Promise<CustomerMilestone[]> {
  return queryMany<CustomerMilestone>(
    `SELECT * FROM customer_milestones WHERE goal_id = $1 ORDER BY sequence_order ASC`,
    [goalId]
  );
}

// ============================================================
// 6. CUSTOMER HEALTH
// ============================================================

export interface UpsertCustomerHealthInput {
  customer_id: string;
  product_id?: string | null;
  health_score: number;
  status: CustomerHealthStatus;
  recency_score?: number;
  frequency_score?: number;
  activation_score?: number;
  support_score?: number;
  factors?: Record<string, unknown>;
  signals?: unknown[];
  is_demo?: boolean;
}

export async function upsertCustomerHealth(
  input: UpsertCustomerHealthInput
): Promise<CustomerHealth> {
  const row = await queryOne<CustomerHealth>(
    `INSERT INTO customer_health (
      customer_id, product_id, health_score, status, recency_score,
      frequency_score, activation_score, support_score, factors,
      signals, last_evaluated_at, is_demo, updated_at
    ) VALUES (
      $1, $2, $3, $4, COALESCE($5, 50), COALESCE($6, 50), COALESCE($7, 50), COALESCE($8, 50),
      COALESCE($9::jsonb, '{}'::jsonb), COALESCE($10::jsonb, '[]'::jsonb), NOW(), COALESCE($11, false), NOW()
    )
    ON CONFLICT (customer_id) DO UPDATE SET
      product_id = COALESCE(EXCLUDED.product_id, customer_health.product_id),
      health_score = EXCLUDED.health_score,
      status = EXCLUDED.status,
      recency_score = EXCLUDED.recency_score,
      frequency_score = EXCLUDED.frequency_score,
      activation_score = EXCLUDED.activation_score,
      support_score = EXCLUDED.support_score,
      factors = EXCLUDED.factors,
      signals = EXCLUDED.signals,
      last_evaluated_at = NOW(),
      updated_at = NOW()
    RETURNING *`,
    [
      input.customer_id,
      input.product_id ?? null,
      input.health_score,
      input.status,
      input.recency_score ?? null,
      input.frequency_score ?? null,
      input.activation_score ?? null,
      input.support_score ?? null,
      serializeJson(input.factors),
      serializeJson(input.signals),
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getCustomerHealthByCustomerId(
  customerId: string
): Promise<CustomerHealth | null> {
  return queryOne<CustomerHealth>(
    `SELECT * FROM customer_health WHERE customer_id = $1`,
    [customerId]
  );
}

export async function listCustomerHealth(options?: {
  status?: CustomerHealthStatus;
  is_demo?: boolean;
  limit?: number;
}): Promise<CustomerHealth[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.status) {
    params.push(options.status);
    conditions.push(`status = $${params.length}`);
  }
  if (options?.is_demo !== undefined) {
    params.push(options.is_demo);
    conditions.push(`is_demo = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options?.limit ?? 100;
  params.push(limit);

  return queryMany<CustomerHealth>(
    `SELECT * FROM customer_health ${whereClause} ORDER BY health_score ASC LIMIT $${params.length}`,
    params
  );
}

// ============================================================
// 7. CUSTOMER FEEDBACK
// ============================================================

export interface CreateCustomerFeedbackInput {
  customer_id: string;
  product_id?: string | null;
  feedback_type: FeedbackType;
  score?: number | null;
  comment?: string | null;
  topic?: string | null;
  sentiment?: string | null;
  source?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
  is_demo?: boolean;
}

export async function createCustomerFeedback(
  input: CreateCustomerFeedbackInput
): Promise<CustomerFeedback> {
  const row = await queryOne<CustomerFeedback>(
    `INSERT INTO customer_feedback (
      customer_id, product_id, feedback_type, score, comment,
      topic, sentiment, source, confidence, metadata, is_demo
    ) VALUES (
      $1, $2, $3, $4, $5, $6, COALESCE($7, 'NEUTRAL'),
      COALESCE($8, 'IN_APP'), COALESCE($9, 100), COALESCE($10::jsonb, '{}'::jsonb), COALESCE($11, false)
    )
    RETURNING *`,
    [
      input.customer_id,
      input.product_id ?? null,
      input.feedback_type,
      input.score ?? null,
      input.comment ?? null,
      input.topic ?? null,
      input.sentiment ?? null,
      input.source ?? null,
      input.confidence ?? null,
      serializeJson(input.metadata),
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function listCustomerFeedback(options?: {
  customer_id?: string;
  product_id?: string;
  feedback_type?: FeedbackType;
  sentiment?: string;
  is_demo?: boolean;
  limit?: number;
}): Promise<CustomerFeedback[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.customer_id) {
    params.push(options.customer_id);
    conditions.push(`customer_id = $${params.length}`);
  }
  if (options?.product_id) {
    params.push(options.product_id);
    conditions.push(`product_id = $${params.length}`);
  }
  if (options?.feedback_type) {
    params.push(options.feedback_type);
    conditions.push(`feedback_type = $${params.length}`);
  }
  if (options?.sentiment) {
    params.push(options.sentiment);
    conditions.push(`sentiment = $${params.length}`);
  }
  if (options?.is_demo !== undefined) {
    params.push(options.is_demo);
    conditions.push(`is_demo = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options?.limit ?? 100;
  params.push(limit);

  return queryMany<CustomerFeedback>(
    `SELECT * FROM customer_feedback ${whereClause} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  );
}

// ============================================================
// 8. CUSTOMER SUPPORT REQUESTS & MESSAGES
// ============================================================

export interface CreateCustomerSupportRequestInput {
  ticket_number: string;
  customer_id: string;
  product_id?: string | null;
  subject: string;
  description: string;
  category?: SupportCategory;
  severity?: SupportSeverity;
  status?: SupportStatus;
  assigned_to?: string | null;
  ai_suggested_category?: string | null;
  ai_suggested_response?: string | null;
  ai_confidence?: number | null;
  is_demo?: boolean;
}

export async function createCustomerSupportRequest(
  input: CreateCustomerSupportRequestInput
): Promise<CustomerSupportRequest> {
  const row = await queryOne<CustomerSupportRequest>(
    `INSERT INTO customer_support_requests (
      ticket_number, customer_id, product_id, subject, description,
      category, severity, status, assigned_to, ai_suggested_category,
      ai_suggested_response, ai_confidence, is_demo
    ) VALUES (
      $1, $2, $3, $4, $5, COALESCE($6, 'USAGE'), COALESCE($7, 'MEDIUM'),
      COALESCE($8, 'OPEN'), $9, $10, $11, $12, COALESCE($13, false)
    )
    RETURNING *`,
    [
      input.ticket_number,
      input.customer_id,
      input.product_id ?? null,
      input.subject,
      input.description,
      input.category ?? null,
      input.severity ?? null,
      input.status ?? null,
      input.assigned_to ?? null,
      input.ai_suggested_category ?? null,
      input.ai_suggested_response ?? null,
      input.ai_confidence ?? null,
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function updateCustomerSupportRequest(
  requestId: string,
  updates: Partial<CustomerSupportRequest>
): Promise<CustomerSupportRequest | null> {
  const fields: string[] = [];
  const params: unknown[] = [requestId];

  if (updates.status !== undefined) {
    params.push(updates.status);
    fields.push(`status = $${params.length}`);
  }
  if (updates.severity !== undefined) {
    params.push(updates.severity);
    fields.push(`severity = $${params.length}`);
  }
  if (updates.assigned_to !== undefined) {
    params.push(updates.assigned_to);
    fields.push(`assigned_to = $${params.length}`);
  }
  if (updates.resolution !== undefined) {
    params.push(updates.resolution);
    fields.push(`resolution = $${params.length}`);
  }
  if (updates.resolved_at !== undefined) {
    params.push(updates.resolved_at);
    fields.push(`resolved_at = $${params.length}`);
  }
  if (updates.resolution_time_seconds !== undefined) {
    params.push(updates.resolution_time_seconds);
    fields.push(`resolution_time_seconds = $${params.length}`);
  }
  if (updates.ai_suggested_category !== undefined) {
    params.push(updates.ai_suggested_category);
    fields.push(`ai_suggested_category = $${params.length}`);
  }
  if (updates.ai_suggested_response !== undefined) {
    params.push(updates.ai_suggested_response);
    fields.push(`ai_suggested_response = $${params.length}`);
  }
  if (updates.ai_confidence !== undefined) {
    params.push(updates.ai_confidence);
    fields.push(`ai_confidence = $${params.length}`);
  }

  fields.push(`updated_at = NOW()`);

  return queryOne<CustomerSupportRequest>(
    `UPDATE customer_support_requests SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );
}

export async function getCustomerSupportRequestById(
  id: string
): Promise<CustomerSupportRequest | null> {
  return queryOne<CustomerSupportRequest>(
    `SELECT * FROM customer_support_requests WHERE id = $1`,
    [id]
  );
}

export async function listCustomerSupportRequests(options?: {
  customer_id?: string;
  product_id?: string;
  category?: SupportCategory;
  status?: SupportStatus;
  severity?: SupportSeverity;
  is_demo?: boolean;
  limit?: number;
}): Promise<CustomerSupportRequest[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.customer_id) {
    params.push(options.customer_id);
    conditions.push(`customer_id = $${params.length}`);
  }
  if (options?.product_id) {
    params.push(options.product_id);
    conditions.push(`product_id = $${params.length}`);
  }
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
  if (options?.is_demo !== undefined) {
    params.push(options.is_demo);
    conditions.push(`is_demo = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options?.limit ?? 100;
  params.push(limit);

  return queryMany<CustomerSupportRequest>(
    `SELECT * FROM customer_support_requests ${whereClause} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  );
}

export interface CreateCustomerSupportMessageInput {
  support_request_id: string;
  sender_type: "CUSTOMER" | "AGENT" | "AI_ASSISTANT" | "SYSTEM";
  sender_name?: string | null;
  body: string;
  attachments?: unknown[];
}

export async function createCustomerSupportMessage(
  input: CreateCustomerSupportMessageInput
): Promise<CustomerSupportMessage> {
  const row = await queryOne<CustomerSupportMessage>(
    `INSERT INTO customer_support_messages (
      support_request_id, sender_type, sender_name, body, attachments
    ) VALUES ($1, $2, $3, $4, COALESCE($5::jsonb, '[]'::jsonb))
    RETURNING *`,
    [
      input.support_request_id,
      input.sender_type,
      input.sender_name ?? null,
      input.body,
      serializeJson(input.attachments),
    ]
  );
  return row!;
}

export async function listCustomerSupportMessages(
  supportRequestId: string
): Promise<CustomerSupportMessage[]> {
  return queryMany<CustomerSupportMessage>(
    `SELECT * FROM customer_support_messages WHERE support_request_id = $1 ORDER BY created_at ASC`,
    [supportRequestId]
  );
}

// ============================================================
// 9. CUSTOMER INTERVENTIONS
// ============================================================

export interface CreateCustomerInterventionInput {
  customer_id: string;
  product_id?: string | null;
  intervention_type: InterventionType;
  reason: string;
  evidence?: Record<string, unknown>;
  recommended_action: string;
  urgency?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  channel?: "EMAIL" | "IN_APP" | "MANUAL";
  requires_approval?: boolean;
  status?: InterventionStatus;
  is_demo?: boolean;
}

export async function createCustomerIntervention(
  input: CreateCustomerInterventionInput
): Promise<CustomerIntervention> {
  const row = await queryOne<CustomerIntervention>(
    `INSERT INTO customer_interventions (
      customer_id, product_id, intervention_type, reason, evidence,
      recommended_action, urgency, channel, requires_approval, status, is_demo
    ) VALUES (
      $1, $2, $3, $4, COALESCE($5::jsonb, '{}'::jsonb),
      $6, COALESCE($7, 'MEDIUM'), COALESCE($8, 'EMAIL'),
      COALESCE($9, true), COALESCE($10, 'PROPOSED'), COALESCE($11, false)
    )
    RETURNING *`,
    [
      input.customer_id,
      input.product_id ?? null,
      input.intervention_type,
      input.reason,
      serializeJson(input.evidence),
      input.recommended_action,
      input.urgency ?? null,
      input.channel ?? null,
      input.requires_approval !== undefined ? input.requires_approval : null,
      input.status ?? null,
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function updateCustomerIntervention(
  interventionId: string,
  updates: Partial<CustomerIntervention>
): Promise<CustomerIntervention | null> {
  const fields: string[] = [];
  const params: unknown[] = [interventionId];

  if (updates.status !== undefined) {
    params.push(updates.status);
    fields.push(`status = $${params.length}`);
  }
  if (updates.approved_at !== undefined) {
    params.push(updates.approved_at);
    fields.push(`approved_at = $${params.length}`);
  }
  if (updates.approved_by !== undefined) {
    params.push(updates.approved_by);
    fields.push(`approved_by = $${params.length}`);
  }
  if (updates.executed_at !== undefined) {
    params.push(updates.executed_at);
    fields.push(`executed_at = $${params.length}`);
  }
  if (updates.execution_result !== undefined) {
    params.push(serializeJson(updates.execution_result));
    fields.push(`execution_result = $${params.length}::jsonb`);
  }

  fields.push(`updated_at = NOW()`);

  return queryOne<CustomerIntervention>(
    `UPDATE customer_interventions SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );
}

export async function getCustomerInterventionById(
  id: string
): Promise<CustomerIntervention | null> {
  return queryOne<CustomerIntervention>(
    `SELECT * FROM customer_interventions WHERE id = $1`,
    [id]
  );
}

export async function listCustomerInterventions(options?: {
  customer_id?: string;
  status?: InterventionStatus;
  urgency?: string;
  is_demo?: boolean;
  limit?: number;
}): Promise<CustomerIntervention[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.customer_id) {
    params.push(options.customer_id);
    conditions.push(`customer_id = $${params.length}`);
  }
  if (options?.status) {
    params.push(options.status);
    conditions.push(`status = $${params.length}`);
  }
  if (options?.urgency) {
    params.push(options.urgency);
    conditions.push(`urgency = $${params.length}`);
  }
  if (options?.is_demo !== undefined) {
    params.push(options.is_demo);
    conditions.push(`is_demo = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options?.limit ?? 100;
  params.push(limit);

  return queryMany<CustomerIntervention>(
    `SELECT * FROM customer_interventions ${whereClause} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  );
}

// ============================================================
// 10. CUSTOMER ONBOARDING
// ============================================================

export interface UpsertCustomerOnboardingInput {
  customer_id: string;
  product_id: string;
  steps: unknown[];
  current_step_index?: number;
  is_completed?: boolean;
  completed_at?: string | null;
  is_demo?: boolean;
}

export async function upsertCustomerOnboarding(
  input: UpsertCustomerOnboardingInput
): Promise<CustomerOnboarding> {
  const row = await queryOne<CustomerOnboarding>(
    `INSERT INTO customer_onboarding (
      customer_id, product_id, steps, current_step_index,
      is_completed, completed_at, is_demo, updated_at
    ) VALUES (
      $1, $2, COALESCE($3::jsonb, '[]'::jsonb), COALESCE($4, 0),
      COALESCE($5, false), $6, COALESCE($7, false), NOW()
    )
    ON CONFLICT (customer_id, product_id) DO UPDATE SET
      steps = EXCLUDED.steps,
      current_step_index = EXCLUDED.current_step_index,
      is_completed = EXCLUDED.is_completed,
      completed_at = EXCLUDED.completed_at,
      updated_at = NOW()
    RETURNING *`,
    [
      input.customer_id,
      input.product_id,
      serializeJson(input.steps),
      input.current_step_index ?? 0,
      input.is_completed ?? false,
      input.completed_at ?? null,
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getCustomerOnboarding(
  customerId: string,
  productId: string
): Promise<CustomerOnboarding | null> {
  return queryOne<CustomerOnboarding>(
    `SELECT * FROM customer_onboarding WHERE customer_id = $1 AND product_id = $2`,
    [customerId, productId]
  );
}

export async function listCustomerOnboarding(options?: {
  product_id?: string;
  is_completed?: boolean;
  is_demo?: boolean;
}): Promise<CustomerOnboarding[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.product_id) {
    params.push(options.product_id);
    conditions.push(`product_id = $${params.length}`);
  }
  if (options?.is_completed !== undefined) {
    params.push(options.is_completed);
    conditions.push(`is_completed = $${params.length}`);
  }
  if (options?.is_demo !== undefined) {
    params.push(options.is_demo);
    conditions.push(`is_demo = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return queryMany<CustomerOnboarding>(
    `SELECT * FROM customer_onboarding ${whereClause} ORDER BY updated_at DESC`,
    params
  );
}

// ============================================================
// 11. CUSTOMER RETENTION
// ============================================================

export interface UpsertCustomerRetentionInput {
  cohort_date: string;
  product_id?: string | null;
  cohort_size?: number;
  day_1_retained?: number;
  day_7_retained?: number;
  day_14_retained?: number;
  day_30_retained?: number;
  weekly_active_customers?: number;
  monthly_active_customers?: number;
  repeat_usage_rate_percent?: number;
  has_sufficient_data?: boolean;
  is_demo?: boolean;
}

export async function upsertCustomerRetention(
  input: UpsertCustomerRetentionInput
): Promise<CustomerRetention> {
  const row = await queryOne<CustomerRetention>(
    `INSERT INTO customer_retention (
      cohort_date, product_id, cohort_size, day_1_retained,
      day_7_retained, day_14_retained, day_30_retained,
      weekly_active_customers, monthly_active_customers,
      repeat_usage_rate_percent, has_sufficient_data, is_demo
    ) VALUES (
      $1::date, $2, COALESCE($3, 0), COALESCE($4, 0),
      COALESCE($5, 0), COALESCE($6, 0), COALESCE($7, 0),
      COALESCE($8, 0), COALESCE($9, 0),
      COALESCE($10, 0), COALESCE($11, false), COALESCE($12, false)
    )
    ON CONFLICT (cohort_date, product_id) DO UPDATE SET
      cohort_size = EXCLUDED.cohort_size,
      day_1_retained = EXCLUDED.day_1_retained,
      day_7_retained = EXCLUDED.day_7_retained,
      day_14_retained = EXCLUDED.day_14_retained,
      day_30_retained = EXCLUDED.day_30_retained,
      weekly_active_customers = EXCLUDED.weekly_active_customers,
      monthly_active_customers = EXCLUDED.monthly_active_customers,
      repeat_usage_rate_percent = EXCLUDED.repeat_usage_rate_percent,
      has_sufficient_data = EXCLUDED.has_sufficient_data
    RETURNING *`,
    [
      input.cohort_date,
      input.product_id ?? null,
      input.cohort_size ?? 0,
      input.day_1_retained ?? 0,
      input.day_7_retained ?? 0,
      input.day_14_retained ?? 0,
      input.day_30_retained ?? 0,
      input.weekly_active_customers ?? 0,
      input.monthly_active_customers ?? 0,
      input.repeat_usage_rate_percent ?? 0,
      input.has_sufficient_data ?? false,
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function listCustomerRetention(options?: {
  product_id?: string;
  is_demo?: boolean;
  limit?: number;
}): Promise<CustomerRetention[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.product_id) {
    params.push(options.product_id);
    conditions.push(`product_id = $${params.length}`);
  }
  if (options?.is_demo !== undefined) {
    params.push(options.is_demo);
    conditions.push(`is_demo = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options?.limit ?? 30;
  params.push(limit);

  return queryMany<CustomerRetention>(
    `SELECT * FROM customer_retention ${whereClause} ORDER BY cohort_date DESC LIMIT $${params.length}`,
    params
  );
}

// ============================================================
// 12. CUSTOMER CHURN
// ============================================================

export interface UpsertCustomerChurnInput {
  customer_id: string;
  product_id?: string | null;
  churn_status?: ChurnStatus;
  risk_score?: number;
  primary_reason?: string | null;
  signals?: unknown[];
  confirmed_at?: string | null;
  is_demo?: boolean;
}

export async function upsertCustomerChurn(
  input: UpsertCustomerChurnInput
): Promise<CustomerChurn> {
  const row = await queryOne<CustomerChurn>(
    `INSERT INTO customer_churn (
      customer_id, product_id, churn_status, risk_score,
      primary_reason, signals, confirmed_at, is_demo, updated_at
    ) VALUES (
      $1, $2, COALESCE($3, 'CHURN_RISK'), COALESCE($4, 50),
      $5, COALESCE($6::jsonb, '[]'::jsonb), $7, COALESCE($8, false), NOW()
    )
    ON CONFLICT (customer_id, product_id) DO UPDATE SET
      churn_status = EXCLUDED.churn_status,
      risk_score = EXCLUDED.risk_score,
      primary_reason = COALESCE(EXCLUDED.primary_reason, customer_churn.primary_reason),
      signals = EXCLUDED.signals,
      confirmed_at = COALESCE(EXCLUDED.confirmed_at, customer_churn.confirmed_at),
      updated_at = NOW()
    RETURNING *`,
    [
      input.customer_id,
      input.product_id ?? null,
      input.churn_status ?? null,
      input.risk_score ?? null,
      input.primary_reason ?? null,
      serializeJson(input.signals),
      input.confirmed_at ?? null,
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getCustomerChurn(
  customerId: string,
  productId: string
): Promise<CustomerChurn | null> {
  return queryOne<CustomerChurn>(
    `SELECT * FROM customer_churn WHERE customer_id = $1 AND product_id = $2`,
    [customerId, productId]
  );
}

export async function listCustomerChurn(options?: {
  churn_status?: ChurnStatus;
  product_id?: string;
  is_demo?: boolean;
  limit?: number;
}): Promise<CustomerChurn[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.churn_status) {
    params.push(options.churn_status);
    conditions.push(`churn_status = $${params.length}`);
  }
  if (options?.product_id) {
    params.push(options.product_id);
    conditions.push(`product_id = $${params.length}`);
  }
  if (options?.is_demo !== undefined) {
    params.push(options.is_demo);
    conditions.push(`is_demo = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options?.limit ?? 100;
  params.push(limit);

  return queryMany<CustomerChurn>(
    `SELECT * FROM customer_churn ${whereClause} ORDER BY risk_score DESC LIMIT $${params.length}`,
    params
  );
}

// ============================================================
// 13. CUSTOMER SUCCESS JOBS & EVENTS
// ============================================================

export interface CreateCustomerSuccessJobInput {
  job_type: CSJobType;
  status?: CSJobStatus;
  payload?: Record<string, unknown>;
  scheduled_at?: string | null;
}

export async function createCustomerSuccessJob(
  input: CreateCustomerSuccessJobInput
): Promise<CustomerSuccessJob> {
  const row = await queryOne<CustomerSuccessJob>(
    `INSERT INTO customer_success_jobs (
      job_type, status, payload, scheduled_at
    ) VALUES ($1, COALESCE($2, 'PENDING'), COALESCE($3::jsonb, '{}'::jsonb), $4)
    RETURNING *`,
    [
      input.job_type,
      input.status ?? null,
      serializeJson(input.payload),
      input.scheduled_at ?? null,
    ]
  );
  return row!;
}

export async function updateCustomerSuccessJob(
  jobId: string,
  updates: {
    status?: CSJobStatus;
    result?: Record<string, unknown> | null;
    error_message?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
  }
): Promise<CustomerSuccessJob | null> {
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

  return queryOne<CustomerSuccessJob>(
    `UPDATE customer_success_jobs SET ${fields.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );
}

export async function listCustomerSuccessJobs(options?: {
  job_type?: CSJobType;
  status?: CSJobStatus;
  limit?: number;
}): Promise<CustomerSuccessJob[]> {
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

  return queryMany<CustomerSuccessJob>(
    `SELECT * FROM customer_success_jobs ${whereClause} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  );
}

export interface CreateCustomerSuccessEventInput {
  event_type: string;
  customer_id?: string | null;
  product_id?: string | null;
  details?: Record<string, unknown>;
}

export async function createCustomerSuccessEvent(
  input: CreateCustomerSuccessEventInput
): Promise<CustomerSuccessEvent> {
  const row = await queryOne<CustomerSuccessEvent>(
    `INSERT INTO customer_success_events (
      event_type, customer_id, product_id, details
    ) VALUES ($1, $2, $3, COALESCE($4::jsonb, '{}'::jsonb))
    RETURNING *`,
    [
      input.event_type,
      input.customer_id ?? null,
      input.product_id ?? null,
      serializeJson(input.details),
    ]
  );
  return row!;
}

export async function listCustomerSuccessEvents(options?: {
  event_type?: string;
  customer_id?: string;
  limit?: number;
}): Promise<CustomerSuccessEvent[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.event_type) {
    params.push(options.event_type);
    conditions.push(`event_type = $${params.length}`);
  }
  if (options?.customer_id) {
    params.push(options.customer_id);
    conditions.push(`customer_id = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options?.limit ?? 100;
  params.push(limit);

  return queryMany<CustomerSuccessEvent>(
    `SELECT * FROM customer_success_events ${whereClause} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  );
}
