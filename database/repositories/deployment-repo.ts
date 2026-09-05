import { queryOne, queryMany } from "../client";
import type {
  ProductDeployment,
  CreateDeploymentInput,
  UpdateDeploymentInput,
} from "@/types/deployment";

function serializeJson(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  return typeof val === "string" ? val : JSON.stringify(val);
}

export async function createDeployment(
  input: CreateDeploymentInput
): Promise<ProductDeployment> {
  const row = await queryOne<ProductDeployment>(
    `INSERT INTO product_deployments (
      product_id, version, provider, status, public_url,
      deployment_id, is_verified, verification_details,
      error_message, is_demo
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8,
      $9, $10
    )
    RETURNING *`,
    [
      input.product_id,
      input.version,
      input.provider,
      input.status ?? "PLANNED",
      input.public_url ?? null,
      input.deployment_id ?? null,
      input.is_verified ?? false,
      serializeJson(input.verification_details ?? {}),
      input.error_message ?? null,
      input.is_demo ?? false,
    ]
  );
  if (!row) throw new Error("Failed to create product deployment record");
  return row;
}

export async function updateDeployment(
  id: string,
  input: UpdateDeploymentInput
): Promise<ProductDeployment | null> {
  const sets: string[] = ["updated_at = NOW()"];
  const values: any[] = [id];
  let paramIdx = 2;

  if (input.status !== undefined) {
    sets.push(`status = $${paramIdx++}`);
    values.push(input.status);
  }
  if (input.public_url !== undefined) {
    sets.push(`public_url = $${paramIdx++}`);
    values.push(input.public_url);
  }
  if (input.deployment_id !== undefined) {
    sets.push(`deployment_id = $${paramIdx++}`);
    values.push(input.deployment_id);
  }
  if (input.is_verified !== undefined) {
    sets.push(`is_verified = $${paramIdx++}`);
    values.push(input.is_verified);
  }
  if (input.verification_details !== undefined) {
    sets.push(`verification_details = $${paramIdx++}`);
    values.push(serializeJson(input.verification_details));
  }
  if (input.verified_at !== undefined) {
    sets.push(`verified_at = $${paramIdx++}`);
    values.push(input.verified_at);
  }
  if (input.error_message !== undefined) {
    sets.push(`error_message = $${paramIdx++}`);
    values.push(input.error_message);
  }

  return await queryOne<ProductDeployment>(
    `UPDATE product_deployments
     SET ${sets.join(", ")}
     WHERE id = $1
     RETURNING *`,
    values
  );
}

export async function getDeploymentById(
  id: string
): Promise<ProductDeployment | null> {
  return await queryOne<ProductDeployment>(
    `SELECT * FROM product_deployments WHERE id = $1`,
    [id]
  );
}

export async function getLatestDeploymentForProduct(
  productId: string,
  opts: { isDemo?: boolean } = {}
): Promise<ProductDeployment | null> {
  const isDemo = opts.isDemo ?? false;
  return await queryOne<ProductDeployment>(
    `SELECT * FROM product_deployments 
     WHERE product_id = $1 AND is_demo = $2
     ORDER BY created_at DESC 
     LIMIT 1`,
    [productId, isDemo]
  );
}

export async function listDeploymentsForProduct(
  productId: string,
  opts: { isDemo?: boolean; limit?: number } = {}
): Promise<ProductDeployment[]> {
  const isDemo = opts.isDemo ?? false;
  const limit = opts.limit ?? 20;
  return await queryMany<ProductDeployment>(
    `SELECT * FROM product_deployments
     WHERE product_id = $1 AND is_demo = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [productId, isDemo, limit]
  );
}

export async function listAllDeployments(
  opts: { isDemo?: boolean; limit?: number } = {}
): Promise<ProductDeployment[]> {
  const isDemo = opts.isDemo ?? false;
  const limit = opts.limit ?? 50;
  return await queryMany<ProductDeployment>(
    `SELECT d.*, p.name as product_name, p.slug as product_slug
     FROM product_deployments d
     JOIN products p ON d.product_id = p.id
     WHERE d.is_demo = $1
     ORDER BY d.created_at DESC
     LIMIT $2`,
    [isDemo, limit]
  );
}
