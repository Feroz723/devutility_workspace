import { queryOne, queryMany } from "../client";
import type {
  Product,
  CreateProductInput,
  UpdateProductInput,
  ProductVersion,
  CreateProductVersionInput,
  ProductArtifact,
  CreateProductArtifactInput,
  ProductBuildJob,
  CreateProductBuildJobInput,
  UpdateProductBuildJobInput,
  ProductBuildEvent,
  CreateProductBuildEventInput,
} from "@/types/product";

// Helper to serialize JSON or arrays
function serializeJson(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  return typeof val === "string" ? val : JSON.stringify(val);
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  // Generate slug if not provided
  const slug = input.slug || input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const row = await queryOne<Product>(
    `INSERT INTO products (
      name, slug, description, problem, solution, value_proposition,
      opportunity_id, experiment_id, product_type,
      status, build_status, estimated_cost_inr, actual_cost_inr, cost_classification,
      build_plan, tech_stack, version, learning_data,
      creation_status, publishing_status, price, currency,
      delivery_method, product_url, is_demo
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9,
      $10, $11, $12, $13, $14,
      $15, $16, $17, $18,
      $19, $20, $21, $22,
      $23, $24, $25
    )
    RETURNING *`,
    [
      input.name,
      slug,
      input.description ?? null,
      input.problem ?? null,
      input.solution ?? null,
      input.value_proposition ?? null,
      input.opportunity_id ?? null,
      input.experiment_id ?? null,
      input.product_type,
      input.status ?? "DRAFT",
      input.build_status ?? "NOT_STARTED",
      input.estimated_cost_inr ?? 0,
      input.actual_cost_inr ?? 0,
      input.cost_classification ?? "ZERO_COST",
      serializeJson(input.build_plan),
      serializeJson(input.tech_stack),
      typeof input.version === "number"
        ? input.version
        : parseInt(String(input.version ?? "1").replace(/[^0-9]/g, "")) || 1,
      serializeJson(input.learning_data),
      input.creation_status ?? "idea",
      input.publishing_status ?? "draft",
      input.price ?? 0,
      input.currency ?? "INR",
      input.delivery_method ?? null,
      input.product_url || null,
      input.is_demo ?? false,
    ]
  );
  return row!;
}

export async function getProductById(id: string): Promise<Product | null> {
  return queryOne<Product>("SELECT * FROM products WHERE id = $1", [id]);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return queryOne<Product>("SELECT * FROM products WHERE slug = $1", [slug]);
}

export async function getProductByExperimentId(experimentId: string): Promise<Product | null> {
  return queryOne<Product>("SELECT * FROM products WHERE experiment_id = $1 LIMIT 1", [experimentId]);
}

export async function updateProduct(id: string, input: UpdateProductInput): Promise<Product | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (key === "build_plan" || key === "learning_data" || key === "tech_stack") {
      sets.push(`${key} = $${idx++}`);
      params.push(serializeJson(value));
    } else if (key === "product_url") {
      sets.push(`${key} = $${idx++}`);
      params.push(value || null);
    } else if (key === "version") {
      sets.push(`${key} = $${idx++}`);
      const vInt = typeof value === "number" ? value : parseInt(String(value).replace(/[^0-9]/g, "")) || 1;
      params.push(vInt);
    } else {
      sets.push(`${key} = $${idx++}`);
      params.push(value);
    }
  }

  if (sets.length === 0) return getProductById(id);

  sets.push("updated_at = now()");
  params.push(id);

  return queryOne<Product>(
    `UPDATE products SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
    params
  );
}

export async function listProducts(options?: {
  opportunity_id?: string;
  experiment_id?: string;
  status?: string;
  build_status?: string;
  product_type?: string;
  is_demo?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ products: Product[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (options?.opportunity_id) {
    conditions.push(`opportunity_id = $${paramIdx++}`);
    params.push(options.opportunity_id);
  }
  if (options?.experiment_id) {
    conditions.push(`experiment_id = $${paramIdx++}`);
    params.push(options.experiment_id);
  }
  if (options?.status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(options.status);
  }
  if (options?.build_status) {
    conditions.push(`build_status = $${paramIdx++}`);
    params.push(options.build_status);
  }
  if (options?.product_type) {
    conditions.push(`product_type = $${paramIdx++}`);
    params.push(options.product_type);
  }
  if (options?.is_demo !== undefined) {
    conditions.push(`is_demo = $${paramIdx++}`);
    params.push(options.is_demo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM products ${where}`,
    params
  );
  const total = parseInt(countResult?.count ?? "0", 10);

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const products = await queryMany<Product>(
    `SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, limit, offset]
  );

  return { products, total };
}

// ----------------------------------------------------
// PRODUCT VERSIONS REPO
// ----------------------------------------------------

export async function createProductVersion(input: CreateProductVersionInput): Promise<ProductVersion> {
  const row = await queryOne<ProductVersion>(
    `INSERT INTO product_versions (
      product_id, version, spec_hash, build_plan_hash,
      specification, build_plan, changelog, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      input.product_id,
      input.version,
      input.spec_hash,
      input.build_plan_hash,
      serializeJson(input.specification),
      serializeJson(input.build_plan),
      input.changelog ?? null,
      input.created_by ?? "autonomous_product_builder",
    ]
  );
  return row!;
}

export async function listProductVersions(productId: string): Promise<ProductVersion[]> {
  return queryMany<ProductVersion>(
    `SELECT * FROM product_versions WHERE product_id = $1 ORDER BY created_at DESC`,
    [productId]
  );
}

export async function getLatestProductVersion(productId: string): Promise<ProductVersion | null> {
  return queryOne<ProductVersion>(
    `SELECT * FROM product_versions WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [productId]
  );
}

// ----------------------------------------------------
// PRODUCT ARTIFACTS REPO
// ----------------------------------------------------

export async function createProductArtifact(input: CreateProductArtifactInput): Promise<ProductArtifact> {
  const row = await queryOne<ProductArtifact>(
    `INSERT INTO product_artifacts (
      product_id, version_id, artifact_type, file_path,
      content, checksum, size_bytes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      input.product_id,
      input.version_id ?? null,
      input.artifact_type,
      input.file_path,
      input.content ?? null,
      input.checksum ?? null,
      input.size_bytes ?? (input.content ? Buffer.byteLength(input.content, "utf8") : 0),
    ]
  );
  return row!;
}

export async function listProductArtifacts(productId: string, versionId?: string): Promise<ProductArtifact[]> {
  if (versionId) {
    return queryMany<ProductArtifact>(
      `SELECT * FROM product_artifacts WHERE product_id = $1 AND version_id = $2 ORDER BY created_at ASC`,
      [productId, versionId]
    );
  }
  return queryMany<ProductArtifact>(
    `SELECT * FROM product_artifacts WHERE product_id = $1 ORDER BY created_at ASC`,
    [productId]
  );
}

export async function getProductArtifactById(id: string): Promise<ProductArtifact | null> {
  return queryOne<ProductArtifact>("SELECT * FROM products_artifacts WHERE id = $1", [id]).catch(() =>
    queryOne<ProductArtifact>("SELECT * FROM product_artifacts WHERE id = $1", [id])
  );
}

// ----------------------------------------------------
// PRODUCT BUILD JOBS REPO
// ----------------------------------------------------

export async function createProductBuildJob(input: CreateProductBuildJobInput): Promise<ProductBuildJob> {
  const row = await queryOne<ProductBuildJob>(
    `INSERT INTO product_build_jobs (
      product_id, status, current_step, total_steps, completed_steps,
      error_message, started_at, completed_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      input.product_id,
      input.status ?? "PENDING",
      input.current_step ?? null,
      input.total_steps ?? 0,
      input.completed_steps ?? 0,
      input.error_message ?? null,
      input.started_at ?? null,
      input.completed_at ?? null,
    ]
  );
  return row!;
}

export async function updateProductBuildJob(id: string, input: UpdateProductBuildJobInput): Promise<ProductBuildJob | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    sets.push(`${key} = $${idx++}`);
    params.push(value);
  }

  if (sets.length === 0) {
    return queryOne<ProductBuildJob>("SELECT * FROM product_build_jobs WHERE id = $1", [id]);
  }

  params.push(id);
  return queryOne<ProductBuildJob>(
    `UPDATE product_build_jobs SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
    params
  );
}

export async function getLatestBuildJobByProductId(productId: string): Promise<ProductBuildJob | null> {
  return queryOne<ProductBuildJob>(
    `SELECT * FROM product_build_jobs WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [productId]
  );
}

export async function getBuildJobById(id: string): Promise<ProductBuildJob | null> {
  return queryOne<ProductBuildJob>("SELECT * FROM product_build_jobs WHERE id = $1", [id]);
}

// ----------------------------------------------------
// PRODUCT BUILD EVENTS REPO
// ----------------------------------------------------

export async function createProductBuildEvent(input: CreateProductBuildEventInput): Promise<ProductBuildEvent> {
  const row = await queryOne<ProductBuildEvent>(
    `INSERT INTO product_build_events (
      job_id, product_id, step_name, status, details, duration_ms
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [
      input.job_id,
      input.product_id,
      input.step_name,
      input.status,
      serializeJson(input.details),
      input.duration_ms ?? null,
    ]
  );
  return row!;
}

export async function listProductBuildEvents(jobId: string): Promise<ProductBuildEvent[]> {
  return queryMany<ProductBuildEvent>(
    `SELECT * FROM product_build_events WHERE job_id = $1 ORDER BY created_at ASC`,
    [jobId]
  );
}

export const productRepo = {
  create: createProduct,
  findById: getProductById,
  findBySlug: getProductBySlug,
  findByExperimentId: getProductByExperimentId,
  update: updateProduct,
  list: listProducts,
  createVersion: createProductVersion,
  listVersions: listProductVersions,
  createArtifact: createProductArtifact,
  listArtifacts: listProductArtifacts,
  createBuildJob: createProductBuildJob,
  updateBuildJob: updateProductBuildJob,
  getLatestBuildJobByProductId,
  getBuildJobById,
  createBuildEvent: createProductBuildEvent,
  listBuildEvents: listProductBuildEvents,
};

