import { z } from "zod";

// Product Types - Phase 6 enums with legacy backward compatibility
export const ProductType = z.enum([
  // Phase 6 Product Types
  "FREE_TOOL",
  "MICRO_SAAS",
  "DOWNLOADABLE_PRODUCT",
  "TEMPLATE",
  "AUTOMATION",
  "CONCIERGE_SERVICE",
  "DEVELOPER_TOOL",
  // Legacy Product Types (backward compatibility)
  "ebook",
  "course",
  "template",
  "tool",
  "saas",
  "api",
  "other",
]);
export type ProductType = z.infer<typeof ProductType>;

// Legacy statuses
export const CreationStatus = z.enum(["idea", "designing", "building", "testing", "ready", "failed"]);
export type CreationStatus = z.infer<typeof CreationStatus>;

export const PublishingStatus = z.enum(["draft", "review", "published", "archived"]);
export type PublishingStatus = z.infer<typeof PublishingStatus>;

export const DeliveryMethod = z.enum(["download", "email", "access_link", "api", "other"]);
export type DeliveryMethod = z.infer<typeof DeliveryMethod>;

// Phase 6 Product Status Lifecycle
export const ProductStatus = z.enum([
  "DRAFT",
  "BUILDING",
  "READY_FOR_REVIEW",
  "READY",
  "LIVE",
  "PAUSED",
  "ARCHIVED",
  "FAILED",
]);
export type ProductStatus = z.infer<typeof ProductStatus>;

// Phase 6 Build Status Lifecycle
export const BuildStatus = z.enum([
  "NOT_STARTED",
  "PLANNING",
  "GENERATING",
  "TESTING",
  "PACKAGING",
  "READY",
  "FAILED",
]);
export type BuildStatus = z.infer<typeof BuildStatus>;

// Phase 6 Cost Classification
export const CostClassification = z.enum([
  "ZERO_COST",
  "PAID_GUARD_BLOCKED",
  "PAID_APPROVED",
]);
export type CostClassification = z.infer<typeof CostClassification>;

// Phase 6 Artifact Types
export const ArtifactType = z.enum([
  "SOURCE_CODE",
  "README",
  "DOCUMENTATION",
  "CONFIGURATION",
  "TEST_SUITE",
  "DEPLOYMENT_INSTRUCTIONS",
  "SPECIFICATION",
  "BUILD_PLAN",
  "OTHER",
]);
export type ArtifactType = z.infer<typeof ArtifactType>;

// Phase 6 Job Status
export const BuildJobStatus = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);
export type BuildJobStatus = z.infer<typeof BuildJobStatus>;

// Build Task & Build Plan schemas
export const ProductBuildTaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["SCHEMA", "REPOSITORY", "API", "UI", "TEST", "DOCUMENTATION", "PACKAGING"]),
  target_file: z.string(),
  dependencies: z.array(z.string()).default([]),
  status: z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED"]).default("PENDING"),
  description: z.string().optional(),
  generated_code: z.string().optional(),
  error: z.string().optional(),
});
export type ProductBuildTask = z.infer<typeof ProductBuildTaskSchema>;

export const ProductBuildPlanSchema = z.object({
  product_id: z.string().uuid().optional(),
  product_slug: z.string(),
  estimated_tasks_count: z.number().int().nonnegative(),
  tasks: z.array(ProductBuildTaskSchema),
  zero_cost_verified: z.boolean().default(true),
  created_at: z.string().optional(),
});
export type ProductBuildPlan = z.infer<typeof ProductBuildPlanSchema>;

// Main Product Schema
export const ProductSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().default(""),
  opportunity_id: z.string().uuid().nullable().optional(),
  experiment_id: z.string().uuid().nullable().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  problem: z.string().nullable().optional(),
  solution: z.string().nullable().optional(),
  value_proposition: z.string().nullable().optional(),
  product_type: ProductType,
  status: ProductStatus.default("DRAFT"),
  build_status: BuildStatus.default("NOT_STARTED"),
  estimated_cost_inr: z.number().default(0),
  actual_cost_inr: z.number().default(0),
  cost_classification: CostClassification.default("ZERO_COST"),
  build_plan: z.any().nullable().optional(),
  tech_stack: z.array(z.string()).nullable().optional(),
  version: z.string().default("1.0.0"),
  learning_data: z.record(z.unknown()).nullable().optional(),
  creation_status: CreationStatus.optional(),
  publishing_status: PublishingStatus.optional(),
  price: z.number().nonnegative().optional(),
  currency: z.string().default("INR"),
  sales_count: z.number().int().nonnegative().default(0),
  revenue: z.number().nonnegative().default(0),
  delivery_method: DeliveryMethod.nullable().optional(),
  product_url: z.string().nullable().optional(),
  is_demo: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Product = z.infer<typeof ProductSchema>;

export const CreateProductSchema = z.object({
  name: z.string().min(1).max(500),
  slug: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  problem: z.string().optional(),
  solution: z.string().optional(),
  value_proposition: z.string().optional(),
  opportunity_id: z.string().uuid().optional().nullable(),
  experiment_id: z.string().uuid().optional().nullable(),
  product_type: ProductType,
  status: ProductStatus.optional(),
  build_status: BuildStatus.optional(),
  estimated_cost_inr: z.number().nonnegative().optional(),
  actual_cost_inr: z.number().nonnegative().optional(),
  cost_classification: CostClassification.optional(),
  build_plan: z.any().optional().nullable(),
  tech_stack: z.array(z.string()).optional().nullable(),
  version: z.string().optional(),
  learning_data: z.record(z.unknown()).optional().nullable(),
  creation_status: CreationStatus.optional(),
  publishing_status: PublishingStatus.optional(),
  price: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  delivery_method: DeliveryMethod.optional(),
  product_url: z.string().url().optional().or(z.literal("")),
  is_demo: z.boolean().optional(),
});
export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial();
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

// Product Version Schema
export const ProductVersionSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  version: z.string(),
  spec_hash: z.string(),
  build_plan_hash: z.string(),
  specification: z.record(z.unknown()).nullable().optional(),
  build_plan: z.record(z.unknown()).nullable().optional(),
  changelog: z.string().nullable().optional(),
  created_by: z.string().default("autonomous_product_builder"),
  created_at: z.string(),
});
export type ProductVersion = z.infer<typeof ProductVersionSchema>;

export const CreateProductVersionSchema = z.object({
  product_id: z.string().uuid(),
  version: z.string(),
  spec_hash: z.string(),
  build_plan_hash: z.string(),
  specification: z.record(z.unknown()).optional().nullable(),
  build_plan: z.record(z.unknown()).optional().nullable(),
  changelog: z.string().optional().nullable(),
  created_by: z.string().optional(),
});
export type CreateProductVersionInput = z.infer<typeof CreateProductVersionSchema>;

// Product Artifact Schema
export const ProductArtifactSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  version_id: z.string().uuid().nullable().optional(),
  artifact_type: ArtifactType,
  file_path: z.string(),
  content: z.string().nullable().optional(),
  checksum: z.string().nullable().optional(),
  size_bytes: z.number().int().nonnegative().default(0),
  created_at: z.string(),
});
export type ProductArtifact = z.infer<typeof ProductArtifactSchema>;

export const CreateProductArtifactSchema = z.object({
  product_id: z.string().uuid(),
  version_id: z.string().uuid().optional().nullable(),
  artifact_type: ArtifactType,
  file_path: z.string(),
  content: z.string().optional().nullable(),
  checksum: z.string().optional().nullable(),
  size_bytes: z.number().int().nonnegative().optional(),
});
export type CreateProductArtifactInput = z.infer<typeof CreateProductArtifactSchema>;

// Product Build Job Schema
export const ProductBuildJobSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  status: BuildJobStatus.default("PENDING"),
  current_step: z.string().nullable().optional(),
  total_steps: z.number().int().nonnegative().default(0),
  completed_steps: z.number().int().nonnegative().default(0),
  error_message: z.string().nullable().optional(),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  created_at: z.string(),
});
export type ProductBuildJob = z.infer<typeof ProductBuildJobSchema>;

export const CreateProductBuildJobSchema = z.object({
  product_id: z.string().uuid(),
  status: BuildJobStatus.optional(),
  current_step: z.string().optional().nullable(),
  total_steps: z.number().int().nonnegative().optional(),
  completed_steps: z.number().int().nonnegative().optional(),
  error_message: z.string().optional().nullable(),
  started_at: z.string().optional().nullable(),
  completed_at: z.string().optional().nullable(),
});
export type CreateProductBuildJobInput = z.infer<typeof CreateProductBuildJobSchema>;

export const UpdateProductBuildJobSchema = z.object({
  status: BuildJobStatus.optional(),
  current_step: z.string().optional().nullable(),
  completed_steps: z.number().int().nonnegative().optional(),
  error_message: z.string().optional().nullable(),
  started_at: z.string().optional().nullable(),
  completed_at: z.string().optional().nullable(),
});
export type UpdateProductBuildJobInput = z.infer<typeof UpdateProductBuildJobSchema>;

// Product Build Event Schema
export const ProductBuildEventSchema = z.object({
  id: z.string().uuid(),
  job_id: z.string().uuid(),
  product_id: z.string().uuid(),
  step_name: z.string(),
  status: z.enum(["STARTED", "SUCCESS", "FAILED", "SKIPPED"]),
  details: z.record(z.unknown()).nullable().optional(),
  duration_ms: z.number().int().nonnegative().nullable().optional(),
  created_at: z.string(),
});
export type ProductBuildEvent = z.infer<typeof ProductBuildEventSchema>;

export const CreateProductBuildEventSchema = z.object({
  job_id: z.string().uuid(),
  product_id: z.string().uuid(),
  step_name: z.string(),
  status: z.enum(["STARTED", "SUCCESS", "FAILED", "SKIPPED"]),
  details: z.record(z.unknown()).optional().nullable(),
  duration_ms: z.number().int().nonnegative().optional().nullable(),
});
export type CreateProductBuildEventInput = z.infer<typeof CreateProductBuildEventSchema>;
