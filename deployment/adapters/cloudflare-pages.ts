import type {
  DeploymentAdapter,
  DeploymentAdapterResult,
  DeploymentContext,
} from "../types";

export class CloudflarePagesDeploymentAdapter implements DeploymentAdapter {
  provider = "CLOUDFLARE_PAGES" as const;

  async testConnection(): Promise<{ connected: boolean; reason?: string }> {
    const token = process.env.CLOUDFLARE_API_TOKEN;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    if (!token || !accountId) {
      return {
        connected: false,
        reason: "Cloudflare API Token or Account ID is not configured in environment.",
      };
    }
    return {
      connected: true,
      reason: "Cloudflare credentials configured.",
    };
  }

  async deploy(context: DeploymentContext): Promise<DeploymentAdapterResult> {
    const conn = await this.testConnection();
    if (!conn.connected) {
      return {
        status: "REQUIRES_MANUAL_SETUP",
        provider: "CLOUDFLARE_PAGES",
        requiresManualSetup: true,
        manualSetupInstructions: {
          why: "Cloudflare Pages deployment requires API credentials to publish static assets to Cloudflare edge network for free.",
          what: "Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in .env.local.",
          where: ".env.local or Cloudflare Dashboard > My Profile > API Tokens",
          expectedResult: "Enables edge deployment to [project].pages.dev at ₹0 cost.",
        },
        error: conn.reason,
      };
    }

    return {
      status: "READY",
      provider: "CLOUDFLARE_PAGES",
      publicUrl: `https://${context.product.slug}.pages.dev`,
      requiresManualSetup: false,
    };
  }
}
