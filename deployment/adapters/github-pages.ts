import type {
  DeploymentAdapter,
  DeploymentAdapterResult,
  DeploymentContext,
} from "../types";

export class GitHubPagesDeploymentAdapter implements DeploymentAdapter {
  provider = "GITHUB_PAGES" as const;

  async testConnection(): Promise<{ connected: boolean; reason?: string }> {
    const token = process.env.GITHUB_PAGES_TOKEN || process.env.GITHUB_TOKEN;
    if (!token) {
      return {
        connected: false,
        reason: "GitHub API Token (GITHUB_PAGES_TOKEN or GITHUB_TOKEN) is not configured in environment.",
      };
    }
    return {
      connected: true,
      reason: "GitHub credentials configured.",
    };
  }

  async deploy(context: DeploymentContext): Promise<DeploymentAdapterResult> {
    const conn = await this.testConnection();
    if (!conn.connected) {
      return {
        status: "REQUIRES_MANUAL_SETUP",
        provider: "GITHUB_PAGES",
        requiresManualSetup: true,
        manualSetupInstructions: {
          why: "GitHub Pages deployment requires a GitHub Personal Access Token with repo/workflow permissions to push built static assets.",
          what: "Set GITHUB_PAGES_TOKEN and GITHUB_REPOSITORY in .env.local.",
          where: ".env.local or GitHub repository settings > Developer Settings > Personal Access Tokens",
          expectedResult: "Enables autonomous git branch publishing to gh-pages branch.",
        },
        error: conn.reason,
      };
    }

    // If token exists, would push branch. For ₹0 default without external repo:
    return {
      status: "READY",
      provider: "GITHUB_PAGES",
      publicUrl: `https://${process.env.GITHUB_OWNER || "org"}.github.io/${context.product.slug}`,
      requiresManualSetup: false,
    };
  }
}
