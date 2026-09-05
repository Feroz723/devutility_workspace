import { queryOne, queryMany, query } from "../client";
import type {
  DistributionChannel,
  CreateDistributionChannelInput,
  UpdateDistributionChannelInput,
  DistributionStrategy,
  CreateDistributionStrategyInput,
  DistributionCampaign,
  CreateDistributionCampaignInput,
  UpdateDistributionCampaignInput,
  DistributionAsset,
  CreateDistributionAssetInput,
  UpdateDistributionAssetInput,
  DistributionQueueItem,
  CreateDistributionQueueItemInput,
  UpdateDistributionQueueItemInput,
  DistributionPublication,
  CreateDistributionPublicationInput,
  DistributionMetric,
  CreateDistributionMetricInput,
  DistributionLead,
  CreateDistributionLeadInput,
  UpdateDistributionLeadInput,
  DistributionAttribution,
  CreateDistributionAttributionInput,
  DistributionJob,
  CreateDistributionJobInput,
  UpdateDistributionJobInput,
  DistributionEvent,
  CreateDistributionEventInput,
} from "@/types/distribution";

function serializeJson(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  return typeof val === "string" ? val : JSON.stringify(val);
}

// ============================================================
// 1. DISTRIBUTION CHANNELS
// ============================================================

export async function createChannel(input: CreateDistributionChannelInput): Promise<DistributionChannel> {
  const row = await queryOne<DistributionChannel>(
    `INSERT INTO distribution_channels (
      name, channel_type, platform, status, config,
      connection_status, automation_capability, credentials_required,
      manual_setup_required, approval_required, cost_inr,
      daily_action_limit, hourly_action_limit, policy_constraints,
      supported_content_types, connection_details, is_demo
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8,
      $9, $10, $11,
      $12, $13, $14,
      $15, $16, $17
    )
    RETURNING *`,
    [
      input.name,
      input.channel_type,
      input.platform,
      input.status ?? "planned",
      serializeJson(input.config ?? {}),
      input.connection_status ?? "NOT_CONNECTED",
      input.automation_capability ?? "MANUAL",
      input.credentials_required ?? true,
      input.manual_setup_required ?? true,
      input.approval_required ?? true,
      input.cost_inr ?? 0,
      input.daily_action_limit ?? 5,
      input.hourly_action_limit ?? 2,
      serializeJson(input.policy_constraints ?? {}),
      serializeJson(input.supported_content_types ?? []),
      serializeJson(input.connection_details ?? {}),
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getChannelById(id: string): Promise<DistributionChannel | null> {
  return queryOne<DistributionChannel>("SELECT * FROM distribution_channels WHERE id = $1", [id]);
}

export async function getChannelByPlatform(platform: string): Promise<DistributionChannel | null> {
  return queryOne<DistributionChannel>("SELECT * FROM distribution_channels WHERE platform = $1 LIMIT 1", [platform]);
}

export async function getChannelByType(channelType: string): Promise<DistributionChannel | null> {
  return queryOne<DistributionChannel>("SELECT * FROM distribution_channels WHERE channel_type = $1 LIMIT 1", [channelType]);
}


export async function updateChannel(id: string, input: UpdateDistributionChannelInput): Promise<DistributionChannel | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (["config", "policy_constraints", "supported_content_types", "connection_details"].includes(key)) {
      sets.push(`${key} = $${idx++}`);
      params.push(serializeJson(value));
    } else {
      sets.push(`${key} = $${idx++}`);
      params.push(value);
    }
  }

  if (sets.length === 0) return getChannelById(id);

  sets.push("updated_at = now()");
  params.push(id);

  return queryOne<DistributionChannel>(
    `UPDATE distribution_channels SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
    params
  );
}

export async function listChannels(options?: {
  channel_type?: string;
  connection_status?: string;
  is_demo?: boolean;
}): Promise<DistributionChannel[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (options?.channel_type) {
    conditions.push(`channel_type = $${idx++}`);
    params.push(options.channel_type);
  }
  if (options?.connection_status) {
    conditions.push(`connection_status = $${idx++}`);
    params.push(options.connection_status);
  }
  if (options?.is_demo !== undefined) {
    conditions.push(`is_demo = $${idx++}`);
    params.push(options.is_demo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return queryMany<DistributionChannel>(
    `SELECT * FROM distribution_channels ${where} ORDER BY name ASC`,
    params
  );
}

// Initial default seed channels
export async function seedInitialChannelsIfEmpty(): Promise<void> {
  const existing = await queryOne<{ count: string }>("SELECT COUNT(*) as count FROM distribution_channels");
  if (parseInt(existing?.count ?? "0", 10) > 0) return;

  const defaultChannels: CreateDistributionChannelInput[] = [
    {
      name: "Owned Web Platform & Landing Pages",
      channel_type: "OWNED_WEBSITE",
      platform: "owned_website",
      status: "active",
      connection_status: "CONNECTED",
      automation_capability: "FULL_AUTO",
      credentials_required: false,
      manual_setup_required: false,
      approval_required: false,
      cost_inr: 0,
      daily_action_limit: 50,
      hourly_action_limit: 10,
      supported_content_types: ["SEO_LANDING_PAGE", "DOCUMENTATION", "FAQ", "CHANGELOG"],
    },
    {
      name: "Search Engine Optimization (SEO & Sitemaps)",
      channel_type: "SEO",
      platform: "seo",
      status: "active",
      connection_status: "CONNECTED",
      automation_capability: "FULL_AUTO",
      credentials_required: false,
      manual_setup_required: false,
      approval_required: false,
      cost_inr: 0,
      daily_action_limit: 20,
      hourly_action_limit: 5,
      supported_content_types: ["SEO_LANDING_PAGE", "PROBLEM_SOLUTION_ARTICLE", "FAQ"],
    },
    {
      name: "GitHub Open Source & Repositories",
      channel_type: "GITHUB",
      platform: "github",
      status: "planned",
      connection_status: process.env.GITHUB_TOKEN ? "CONNECTED" : "NOT_CONNECTED",
      automation_capability: "ASSISTED",
      credentials_required: true,
      manual_setup_required: true,
      approval_required: true,
      cost_inr: 0,
      daily_action_limit: 10,
      hourly_action_limit: 3,
      supported_content_types: ["GITHUB_README", "CHANGELOG", "EDUCATIONAL_ARTICLE"],
    },
    {
      name: "GitHub Discussions Community",
      channel_type: "GITHUB_DISCUSSIONS",
      platform: "github_discussions",
      status: "planned",
      connection_status: process.env.GITHUB_TOKEN ? "CONNECTED" : "NOT_CONNECTED",
      automation_capability: "ASSISTED",
      credentials_required: true,
      manual_setup_required: true,
      approval_required: true,
      cost_inr: 0,
      daily_action_limit: 5,
      hourly_action_limit: 2,
      supported_content_types: ["COMMUNITY_POST", "PRODUCT_ANNOUNCEMENT"],
    },
    {
      name: "Reddit Targeted Communities",
      channel_type: "REDDIT",
      platform: "reddit",
      status: "planned",
      connection_status: process.env.REDDIT_CLIENT_ID ? "CONNECTED" : "NOT_CONNECTED",
      automation_capability: "MANUAL",
      credentials_required: true,
      manual_setup_required: true,
      approval_required: true,
      cost_inr: 0,
      daily_action_limit: 3,
      hourly_action_limit: 1,
      supported_content_types: ["COMMUNITY_POST", "PROBLEM_SOLUTION_ARTICLE"],
    },
    {
      name: "Hacker News Show HN",
      channel_type: "HACKER_NEWS",
      platform: "hacker_news",
      status: "planned",
      connection_status: "NOT_CONNECTED",
      automation_capability: "MANUAL",
      credentials_required: true,
      manual_setup_required: true,
      approval_required: true,
      cost_inr: 0,
      daily_action_limit: 2,
      hourly_action_limit: 1,
      supported_content_types: ["PRODUCT_ANNOUNCEMENT", "EDUCATIONAL_ARTICLE"],
    },
    {
      name: "Free Product Directories",
      channel_type: "PRODUCT_DIRECTORY",
      platform: "product_directories",
      status: "planned",
      connection_status: "NOT_CONNECTED",
      automation_capability: "MANUAL",
      credentials_required: true,
      manual_setup_required: true,
      approval_required: true,
      cost_inr: 0,
      daily_action_limit: 5,
      hourly_action_limit: 2,
      supported_content_types: ["DIRECTORY_LISTING", "FAQ"],
    },
    {
      name: "Direct Email & Outreach (Strict Permission)",
      channel_type: "EMAIL",
      platform: "email_outreach",
      status: "planned",
      connection_status: "NOT_CONNECTED",
      automation_capability: "MANUAL",
      credentials_required: true,
      manual_setup_required: true,
      approval_required: true,
      cost_inr: 0,
      daily_action_limit: 10,
      hourly_action_limit: 2,
      supported_content_types: ["EMAIL_DRAFT"],
    },
    {
      name: "LinkedIn Professional Articles & Posts",
      channel_type: "LINKEDIN",
      platform: "linkedin",
      status: "planned",
      connection_status: "NOT_CONNECTED",
      automation_capability: "MANUAL",
      credentials_required: true,
      manual_setup_required: true,
      approval_required: true,
      cost_inr: 0,
      daily_action_limit: 3,
      hourly_action_limit: 1,
      supported_content_types: ["SOCIAL_POST", "EDUCATIONAL_ARTICLE"],
    },
    {
      name: "X (Twitter) Developer & Tech Community",
      channel_type: "X",
      platform: "x",
      status: "planned",
      connection_status: "NOT_CONNECTED",
      automation_capability: "MANUAL",
      credentials_required: true,
      manual_setup_required: true,
      approval_required: true,
      cost_inr: 0,
      daily_action_limit: 5,
      hourly_action_limit: 2,
      supported_content_types: ["SOCIAL_POST", "TUTORIAL"],
    },
    {
      name: "Instagram Technical Guides",
      channel_type: "INSTAGRAM",
      platform: "instagram",
      status: "planned",
      connection_status: "NOT_CONNECTED",
      automation_capability: "MANUAL",
      credentials_required: true,
      manual_setup_required: true,
      approval_required: true,
      cost_inr: 0,
      daily_action_limit: 2,
      hourly_action_limit: 1,
      supported_content_types: ["SOCIAL_POST"],
    },
    {
      name: "YouTube Educational Demos",
      channel_type: "YOUTUBE",
      platform: "youtube",
      status: "planned",
      connection_status: "NOT_CONNECTED",
      automation_capability: "MANUAL",
      credentials_required: true,
      manual_setup_required: true,
      approval_required: true,
      cost_inr: 0,
      daily_action_limit: 2,
      hourly_action_limit: 1,
      supported_content_types: ["VIDEO_SCRIPT", "YOUTUBE_DESCRIPTION"],
    },
  ];

  for (const ch of defaultChannels) {
    await createChannel(ch).catch(() => null);
  }
}

// ============================================================
// 2. DISTRIBUTION STRATEGIES
// ============================================================

export async function createStrategy(input: CreateDistributionStrategyInput): Promise<DistributionStrategy> {
  const row = await queryOne<DistributionStrategy>(
    `INSERT INTO distribution_strategies (
      product_id, target_audience, value_hook, ranked_channels,
      estimated_cost_inr, frequency_rules, is_demo
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      input.product_id,
      input.target_audience,
      input.value_hook,
      serializeJson(input.ranked_channels ?? []),
      input.estimated_cost_inr ?? 0,
      serializeJson(input.frequency_rules ?? {}),
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getStrategyById(id: string): Promise<DistributionStrategy | null> {
  return queryOne<DistributionStrategy>("SELECT * FROM distribution_strategies WHERE id = $1", [id]);
}

export async function getStrategyByProductId(productId: string): Promise<DistributionStrategy | null> {
  return queryOne<DistributionStrategy>(
    "SELECT * FROM distribution_strategies WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1",
    [productId]
  );
}

export async function listStrategies(options?: { product_id?: string; is_demo?: boolean }): Promise<DistributionStrategy[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (options?.product_id) {
    conditions.push(`product_id = $${idx++}`);
    params.push(options.product_id);
  }
  if (options?.is_demo !== undefined) {
    conditions.push(`is_demo = $${idx++}`);
    params.push(options.is_demo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return queryMany<DistributionStrategy>(
    `SELECT * FROM distribution_strategies ${where} ORDER BY created_at DESC`,
    params
  );
}

// ============================================================
// 3. DISTRIBUTION CAMPAIGNS
// ============================================================

export async function createCampaign(input: CreateDistributionCampaignInput): Promise<DistributionCampaign> {
  const slug = input.slug || input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const row = await queryOne<DistributionCampaign>(
    `INSERT INTO distribution_campaigns (
      product_id, strategy_id, primary_channel_id, name, slug,
      status, budget_inr, target_metrics, actual_metrics, learnings, is_demo
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      input.product_id,
      input.strategy_id ?? null,
      input.primary_channel_id ?? null,
      input.name,
      slug,
      input.status ?? "DRAFT",
      input.budget_inr ?? 0,
      serializeJson(input.target_metrics ?? {}),
      serializeJson(input.actual_metrics ?? {}),
      serializeJson(input.learnings ?? {}),
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getCampaignById(id: string): Promise<DistributionCampaign | null> {
  return queryOne<DistributionCampaign>("SELECT * FROM distribution_campaigns WHERE id = $1", [id]);
}

export async function updateCampaign(id: string, input: UpdateDistributionCampaignInput): Promise<DistributionCampaign | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (["target_metrics", "actual_metrics", "learnings"].includes(key)) {
      sets.push(`${key} = $${idx++}`);
      params.push(serializeJson(value));
    } else {
      sets.push(`${key} = $${idx++}`);
      params.push(value);
    }
  }

  if (sets.length === 0) return getCampaignById(id);

  sets.push("updated_at = now()");
  params.push(id);

  return queryOne<DistributionCampaign>(
    `UPDATE distribution_campaigns SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
    params
  );
}

export async function listCampaigns(options?: {
  product_id?: string;
  status?: string;
  is_demo?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ campaigns: DistributionCampaign[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (options?.product_id) {
    conditions.push(`product_id = $${idx++}`);
    params.push(options.product_id);
  }
  if (options?.status) {
    conditions.push(`status = $${idx++}`);
    params.push(options.status);
  }
  if (options?.is_demo !== undefined) {
    conditions.push(`is_demo = $${idx++}`);
    params.push(options.is_demo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const countRes = await queryOne<{ count: string }>(`SELECT COUNT(*) as count FROM distribution_campaigns ${where}`, params);
  const total = parseInt(countRes?.count ?? "0", 10);

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const campaigns = await queryMany<DistributionCampaign>(
    `SELECT * FROM distribution_campaigns ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return { campaigns, total };
}

// ============================================================
// 4. DISTRIBUTION ASSETS
// ============================================================

export async function createAsset(input: CreateDistributionAssetInput): Promise<DistributionAsset> {
  const row = await queryOne<DistributionAsset>(
    `INSERT INTO distribution_assets (
      product_id, campaign_id, channel_type, content_type,
      title, body, metadata, fact_claims, inference_notes,
      marketing_copy, approval_status, tracking_url, canonical_url, is_demo
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *`,
    [
      input.product_id,
      input.campaign_id ?? null,
      input.channel_type,
      input.content_type,
      input.title ?? null,
      input.body,
      serializeJson(input.metadata ?? {}),
      serializeJson(input.fact_claims ?? []),
      serializeJson(input.inference_notes ?? []),
      serializeJson(input.marketing_copy ?? []),
      input.approval_status ?? "DRAFT",
      input.tracking_url ?? null,
      input.canonical_url ?? null,
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getAssetById(id: string): Promise<DistributionAsset | null> {
  return queryOne<DistributionAsset>("SELECT * FROM distribution_assets WHERE id = $1", [id]);
}

export async function updateAsset(id: string, input: UpdateDistributionAssetInput): Promise<DistributionAsset | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (["metadata", "fact_claims", "inference_notes", "marketing_copy"].includes(key)) {
      sets.push(`${key} = $${idx++}`);
      params.push(serializeJson(value));
    } else {
      sets.push(`${key} = $${idx++}`);
      params.push(value);
    }
  }

  if (sets.length === 0) return getAssetById(id);

  sets.push("updated_at = now()");
  params.push(id);

  return queryOne<DistributionAsset>(
    `UPDATE distribution_assets SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
    params
  );
}

export async function listAssets(options?: {
  campaign_id?: string;
  product_id?: string;
  channel_type?: string;
  approval_status?: string;
  is_demo?: boolean;
}): Promise<DistributionAsset[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (options?.campaign_id) {
    conditions.push(`campaign_id = $${idx++}`);
    params.push(options.campaign_id);
  }
  if (options?.product_id) {
    conditions.push(`product_id = $${idx++}`);
    params.push(options.product_id);
  }
  if (options?.channel_type) {
    conditions.push(`channel_type = $${idx++}`);
    params.push(options.channel_type);
  }
  if (options?.approval_status) {
    conditions.push(`approval_status = $${idx++}`);
    params.push(options.approval_status);
  }
  if (options?.is_demo !== undefined) {
    conditions.push(`is_demo = $${idx++}`);
    params.push(options.is_demo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return queryMany<DistributionAsset>(
    `SELECT * FROM distribution_assets ${where} ORDER BY created_at DESC`,
    params
  );
}

// ============================================================
// 5. DISTRIBUTION QUEUE
// ============================================================

export async function createQueueItem(input: CreateDistributionQueueItemInput): Promise<DistributionQueueItem> {
  const row = await queryOne<DistributionQueueItem>(
    `INSERT INTO distribution_queue (
      campaign_id, channel_id, asset_id, status, priority,
      scheduled_at, idempotency_key, manual_action_required, is_demo
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      input.campaign_id,
      input.channel_id,
      input.asset_id,
      input.status ?? "DRAFT",
      input.priority ?? 5,
      input.scheduled_at ?? null,
      input.idempotency_key,
      input.manual_action_required ?? null,
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getQueueItemById(id: string): Promise<DistributionQueueItem | null> {
  return queryOne<DistributionQueueItem>("SELECT * FROM distribution_queue WHERE id = $1", [id]);
}

export async function getQueueItemByIdempotencyKey(key: string): Promise<DistributionQueueItem | null> {
  return queryOne<DistributionQueueItem>("SELECT * FROM distribution_queue WHERE idempotency_key = $1 LIMIT 1", [key]);
}

export async function updateQueueItem(id: string, input: UpdateDistributionQueueItemInput): Promise<DistributionQueueItem | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    sets.push(`${key} = $${idx++}`);
    params.push(value);
  }

  if (sets.length === 0) return getQueueItemById(id);

  sets.push("updated_at = now()");
  params.push(id);

  return queryOne<DistributionQueueItem>(
    `UPDATE distribution_queue SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
    params
  );
}

export async function listQueueItems(options?: {
  campaign_id?: string;
  channel_id?: string;
  status?: string;
  is_demo?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ items: DistributionQueueItem[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (options?.campaign_id) {
    conditions.push(`campaign_id = $${idx++}`);
    params.push(options.campaign_id);
  }
  if (options?.channel_id) {
    conditions.push(`channel_id = $${idx++}`);
    params.push(options.channel_id);
  }
  if (options?.status) {
    conditions.push(`status = $${idx++}`);
    params.push(options.status);
  }
  if (options?.is_demo !== undefined) {
    conditions.push(`is_demo = $${idx++}`);
    params.push(options.is_demo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const countRes = await queryOne<{ count: string }>(`SELECT COUNT(*) as count FROM distribution_queue ${where}`, params);
  const total = parseInt(countRes?.count ?? "0", 10);

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const items = await queryMany<DistributionQueueItem>(
    `SELECT * FROM distribution_queue ${where} ORDER BY priority ASC, created_at ASC LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return { items, total };
}

// ============================================================
// 6. DISTRIBUTION PUBLICATIONS
// ============================================================

export async function createPublication(input: CreateDistributionPublicationInput): Promise<DistributionPublication> {
  const row = await queryOne<DistributionPublication>(
    `INSERT INTO distribution_publications (
      queue_id, campaign_id, channel_id, asset_id,
      external_publication_id, external_url, status,
      published_at, metadata, is_demo
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, now()), $9, $10)
    RETURNING *`,
    [
      input.queue_id,
      input.campaign_id,
      input.channel_id,
      input.asset_id,
      input.external_publication_id ?? null,
      input.external_url ?? null,
      input.status ?? "PUBLISHED",
      input.published_at ?? null,
      serializeJson(input.metadata ?? {}),
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getPublicationById(id: string): Promise<DistributionPublication | null> {
  return queryOne<DistributionPublication>("SELECT * FROM distribution_publications WHERE id = $1", [id]);
}

export async function listPublications(options?: {
  campaign_id?: string;
  channel_id?: string;
  is_demo?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ publications: DistributionPublication[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (options?.campaign_id) {
    conditions.push(`campaign_id = $${idx++}`);
    params.push(options.campaign_id);
  }
  if (options?.channel_id) {
    conditions.push(`channel_id = $${idx++}`);
    params.push(options.channel_id);
  }
  if (options?.is_demo !== undefined) {
    conditions.push(`is_demo = $${idx++}`);
    params.push(options.is_demo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const countRes = await queryOne<{ count: string }>(`SELECT COUNT(*) as count FROM distribution_publications ${where}`, params);
  const total = parseInt(countRes?.count ?? "0", 10);

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const publications = await queryMany<DistributionPublication>(
    `SELECT * FROM distribution_publications ${where} ORDER BY published_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return { publications, total };
}

// ============================================================
// 7. DISTRIBUTION METRICS
// ============================================================

export async function recordDistributionMetric(input: CreateDistributionMetricInput): Promise<DistributionMetric> {
  const row = await queryOne<DistributionMetric>(
    `INSERT INTO distribution_metrics (
      publication_id, campaign_id, channel_id, metric_name,
      metric_value, source, confidence, recorded_at, raw_payload, is_demo
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, now()), $9, $10)
    RETURNING *`,
    [
      input.publication_id ?? null,
      input.campaign_id,
      input.channel_id,
      input.metric_name,
      input.metric_value,
      input.source,
      input.confidence ?? 100,
      input.recorded_at ?? null,
      serializeJson(input.raw_payload ?? {}),
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function listDistributionMetrics(options?: {
  campaign_id?: string;
  channel_id?: string;
  publication_id?: string;
  metric_name?: string;
  is_demo?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ metrics: DistributionMetric[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (options?.campaign_id) {
    conditions.push(`campaign_id = $${idx++}`);
    params.push(options.campaign_id);
  }
  if (options?.channel_id) {
    conditions.push(`channel_id = $${idx++}`);
    params.push(options.channel_id);
  }
  if (options?.publication_id) {
    conditions.push(`publication_id = $${idx++}`);
    params.push(options.publication_id);
  }
  if (options?.metric_name) {
    conditions.push(`metric_name = $${idx++}`);
    params.push(options.metric_name);
  }
  if (options?.is_demo !== undefined) {
    conditions.push(`is_demo = $${idx++}`);
    params.push(options.is_demo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const countRes = await queryOne<{ count: string }>(`SELECT COUNT(*) as count FROM distribution_metrics ${where}`, params);
  const total = parseInt(countRes?.count ?? "0", 10);

  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;

  const metrics = await queryMany<DistributionMetric>(
    `SELECT * FROM distribution_metrics ${where} ORDER BY recorded_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return { metrics, total };
}

export async function getAggregatedCampaignMetrics(campaignId: string, isDemo: boolean = false): Promise<Record<string, number>> {
  const rows = await queryMany<{ metric_name: string; total_val: string }>(
    `SELECT metric_name, SUM(metric_value) as total_val
     FROM distribution_metrics
     WHERE campaign_id = $1 AND is_demo = $2
     GROUP BY metric_name`,
    [campaignId, isDemo]
  );

  const result: Record<string, number> = {};
  for (const r of rows) {
    result[r.metric_name] = parseFloat(r.total_val) || 0;
  }
  return result;
}

// ============================================================
// 8. DISTRIBUTION LEADS
// ============================================================

export async function createLead(input: CreateDistributionLeadInput): Promise<DistributionLead> {
  const row = await queryOne<DistributionLead>(
    `INSERT INTO distribution_leads (
      campaign_id, channel_id, publication_id, email,
      name, company, source, qualification_score, status, notes, is_demo
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      input.campaign_id,
      input.channel_id ?? null,
      input.publication_id ?? null,
      input.email ?? null,
      input.name ?? null,
      input.company ?? null,
      input.source,
      input.qualification_score ?? 50,
      input.status ?? "NEW",
      input.notes ?? null,
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getLeadById(id: string): Promise<DistributionLead | null> {
  return queryOne<DistributionLead>("SELECT * FROM distribution_leads WHERE id = $1", [id]);
}

export async function updateLead(id: string, input: UpdateDistributionLeadInput): Promise<DistributionLead | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    sets.push(`${key} = $${idx++}`);
    params.push(value);
  }

  if (sets.length === 0) return getLeadById(id);

  sets.push("updated_at = now()");
  params.push(id);

  return queryOne<DistributionLead>(
    `UPDATE distribution_leads SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
    params
  );
}

export async function listLeads(options?: {
  campaign_id?: string;
  channel_id?: string;
  status?: string;
  is_demo?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ leads: DistributionLead[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (options?.campaign_id) {
    conditions.push(`campaign_id = $${idx++}`);
    params.push(options.campaign_id);
  }
  if (options?.channel_id) {
    conditions.push(`channel_id = $${idx++}`);
    params.push(options.channel_id);
  }
  if (options?.status) {
    conditions.push(`status = $${idx++}`);
    params.push(options.status);
  }
  if (options?.is_demo !== undefined) {
    conditions.push(`is_demo = $${idx++}`);
    params.push(options.is_demo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const countRes = await queryOne<{ count: string }>(`SELECT COUNT(*) as count FROM distribution_leads ${where}`, params);
  const total = parseInt(countRes?.count ?? "0", 10);

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const leads = await queryMany<DistributionLead>(
    `SELECT * FROM distribution_leads ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return { leads, total };
}

// ============================================================
// 9. DISTRIBUTION ATTRIBUTION
// ============================================================

export async function createAttribution(input: CreateDistributionAttributionInput): Promise<DistributionAttribution> {
  const row = await queryOne<DistributionAttribution>(
    `INSERT INTO distribution_attribution (
      tracking_token, utm_source, utm_medium, utm_campaign,
      utm_content, utm_term, campaign_id, channel_id,
      asset_id, publication_id, is_demo
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      input.tracking_token,
      input.utm_source ?? null,
      input.utm_medium ?? null,
      input.utm_campaign ?? null,
      input.utm_content ?? null,
      input.utm_term ?? null,
      input.campaign_id ?? null,
      input.channel_id ?? null,
      input.asset_id ?? null,
      input.publication_id ?? null,
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getAttributionByToken(token: string): Promise<DistributionAttribution | null> {
  return queryOne<DistributionAttribution>(
    "SELECT * FROM distribution_attribution WHERE tracking_token = $1 LIMIT 1",
    [token]
  );
}

export async function recordAttributionVisit(
  token: string,
  type: "visit" | "click" | "signup" | "conversion" = "visit"
): Promise<DistributionAttribution | null> {
  let column = "visits_count";
  if (type === "click") column = "clicks_count";
  if (type === "signup") column = "signups_count";
  if (type === "conversion") column = "conversions_count";

  return queryOne<DistributionAttribution>(
    `UPDATE distribution_attribution
     SET ${column} = ${column} + 1, last_visit_at = now()
     WHERE tracking_token = $1
     RETURNING *`,
    [token]
  );
}

export async function listAttributions(options?: {
  campaign_id?: string;
  is_demo?: boolean;
}): Promise<DistributionAttribution[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (options?.campaign_id) {
    conditions.push(`campaign_id = $${idx++}`);
    params.push(options.campaign_id);
  }
  if (options?.is_demo !== undefined) {
    conditions.push(`is_demo = $${idx++}`);
    params.push(options.is_demo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return queryMany<DistributionAttribution>(
    `SELECT * FROM distribution_attribution ${where} ORDER BY created_at DESC`,
    params
  );
}

// ============================================================
// 10. DISTRIBUTION JOBS & EVENTS
// ============================================================

export async function createDistributionJob(input: CreateDistributionJobInput): Promise<DistributionJob> {
  const row = await queryOne<DistributionJob>(
    `INSERT INTO distribution_jobs (
      campaign_id, job_type, status, started_at, completed_at, error, logs, is_demo
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      input.campaign_id,
      input.job_type,
      input.status ?? "PENDING",
      input.started_at ?? null,
      input.completed_at ?? null,
      input.error ?? null,
      serializeJson(input.logs ?? []),
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getDistributionJobById(id: string): Promise<DistributionJob | null> {
  return queryOne<DistributionJob>("SELECT * FROM distribution_jobs WHERE id = $1", [id]);
}

export async function updateDistributionJob(id: string, input: UpdateDistributionJobInput): Promise<DistributionJob | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (key === "logs") {
      sets.push(`${key} = $${idx++}`);
      params.push(serializeJson(value));
    } else {
      sets.push(`${key} = $${idx++}`);
      params.push(value);
    }
  }

  if (sets.length === 0) return getDistributionJobById(id);

  params.push(id);
  return queryOne<DistributionJob>(
    `UPDATE distribution_jobs SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
    params
  );
}

export async function createDistributionEvent(input: CreateDistributionEventInput): Promise<DistributionEvent> {
  const row = await queryOne<DistributionEvent>(
    `INSERT INTO distribution_events (
      job_id, campaign_id, event_type, details, duration_ms
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [
      input.job_id ?? null,
      input.campaign_id,
      input.event_type,
      serializeJson(input.details ?? {}),
      input.duration_ms ?? null,
    ]
  );
  return row!;
}

export async function listDistributionEvents(campaignId: string): Promise<DistributionEvent[]> {
  return queryMany<DistributionEvent>(
    `SELECT * FROM distribution_events WHERE campaign_id = $1 ORDER BY created_at ASC`,
    [campaignId]
  );
}

export const distributionRepo = {
  createChannel,
  getChannel: getChannelById,
  getChannelById,
  getChannelByType,
  getChannelByPlatform,
  listChannels,
  updateChannel,
  seedInitialChannelsIfEmpty,

  createStrategy,
  getStrategy: getStrategyById,
  getStrategyById,
  getStrategyByProductId,
  listStrategies,

  createCampaign,
  getCampaign: getCampaignById,
  getCampaignById,
  listCampaigns,
  updateCampaign,

  createAsset,
  getAsset: getAssetById,
  getAssetById,
  listAssets,
  updateAsset,

  createQueueItem,
  getQueueItem: getQueueItemById,
  getQueueItemById,
  listQueueItems,
  updateQueueItem,

  createPublication,
  getPublication: getPublicationById,
  getPublicationById,
  listPublications,

  createMetric: recordDistributionMetric,
  listMetrics: listDistributionMetrics,

  createLead,
  getLead: getLeadById,
  getLeadById,
  listLeads,
  updateLead,

  createAttribution,
  getAttributionByToken,
  recordAttributionVisit,
  listAttributions,

  createJob: createDistributionJob,
  getJob: getDistributionJobById,
  updateJob: updateDistributionJob,

  createEvent: createDistributionEvent,
  listEvents: listDistributionEvents,
};


