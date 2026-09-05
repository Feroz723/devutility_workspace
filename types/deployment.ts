import { z } from "zod";

export const DeploymentProviderSchema = z.enum([
  "SELF_HOSTED",
  "GITHUB_PAGES",
  "CLOUDFLARE_PAGES",
]);
export type DeploymentProvider = z.infer<typeof DeploymentProviderSchema>;

export const DeploymentStatusSchema = z.enum([
  "PLANNED",
  "READY",
  "DEPLOYING",
  "DEPLOYED",
  "FAILED",
  "NOT_CONNECTED",
  "REQUIRES_MANUAL_SETUP",
]);
export type DeploymentStatus = z.infer<typeof DeploymentStatusSchema>;

export const ProductDeploymentSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  version: z.string(),
  provider: DeploymentProviderSchema,
  status: DeploymentStatusSchema,
  public_url: z.string().nullable().optional(),
  deployment_id: z.string().nullable().optional(),
  is_verified: z.boolean().default(false),
  verification_details: z.record(z.any()).default({}),
  verified_at: z.date().or(z.string()).nullable().optional(),
  error_message: z.string().nullable().optional(),
  is_demo: z.boolean().default(false),
  created_at: z.date().or(z.string()).optional(),
  updated_at: z.date().or(z.string()).optional(),
});
export type ProductDeployment = z.infer<typeof ProductDeploymentSchema>;

export interface CreateDeploymentInput {
  product_id: string;
  version: string;
  provider: DeploymentProvider;
  status?: DeploymentStatus;
  public_url?: string | null;
  deployment_id?: string | null;
  is_verified?: boolean;
  verification_details?: Record<string, any>;
  error_message?: string | null;
  is_demo?: boolean;
}

export interface UpdateDeploymentInput {
  status?: DeploymentStatus;
  public_url?: string | null;
  deployment_id?: string | null;
  is_verified?: boolean;
  verification_details?: Record<string, any>;
  verified_at?: Date | string | null;
  error_message?: string | null;
}

export interface UrlVerificationResult {
  verified: boolean;
  httpStatus?: number;
  responseTimeMs?: number;
  contentType?: string;
  uiElementsFound: string[];
  secretsSafe: boolean;
  errors: string[];
  verifiedAt: string;
}
