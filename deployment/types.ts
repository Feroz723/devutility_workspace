import type {
  DeploymentProvider,
  DeploymentStatus,
  ProductDeployment,
  UrlVerificationResult,
} from "@/types/deployment";
import type { Product } from "@/types/product";

export interface DeploymentContext {
  product: Product;
  version: string;
  isDemo?: boolean;
}

export interface DeploymentAdapterResult {
  status: DeploymentStatus;
  provider: DeploymentProvider;
  publicUrl?: string | null;
  deploymentId?: string | null;
  requiresManualSetup?: boolean;
  manualSetupInstructions?: {
    why: string;
    what: string;
    where: string;
    expectedResult: string;
  };
  error?: string | null;
}

export interface DeploymentAdapter {
  provider: DeploymentProvider;
  testConnection(): Promise<{ connected: boolean; reason?: string }>;
  deploy(context: DeploymentContext): Promise<DeploymentAdapterResult>;
}

export interface VerificationOptions {
  timeoutMs?: number;
  expectedKeywords?: string[];
  checkSecrets?: boolean;
}
