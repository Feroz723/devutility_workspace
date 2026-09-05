import type {
  DeploymentAdapter,
  DeploymentAdapterResult,
  DeploymentContext,
} from "../types";

export class SelfHostedDeploymentAdapter implements DeploymentAdapter {
  provider = "SELF_HOSTED" as const;

  async testConnection(): Promise<{ connected: boolean; reason?: string }> {
    return {
      connected: true,
      reason: "Self-hosted deployment is locally integrated into Next.js App Router at /p/[slug]",
    };
  }

  async deploy(context: DeploymentContext): Promise<DeploymentAdapterResult> {
    const { product } = context;
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      "http://localhost:3000";

    const publicUrl = `${baseUrl}/p/${product.slug}`;
    const deploymentId = `sh_${product.slug}_${Date.now()}`;

    return {
      status: "DEPLOYED",
      provider: "SELF_HOSTED",
      publicUrl,
      deploymentId,
      requiresManualSetup: false,
    };
  }
}
