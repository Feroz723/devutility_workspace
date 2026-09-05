import { operationsRepo } from "@/database/repositories/operations-repo";
import { integrationRegistry } from "./integration-registry";
import type { UnifiedManualActionItem } from "@/types/operations";

export class ManualActionAggregator {
  /**
   * Aggregates all outstanding manual setup tasks requiring operator intervention
   */
  async getManualActions(): Promise<UnifiedManualActionItem[]> {
    const actions: UnifiedManualActionItem[] = [];

    // 1. Integration Health requirements
    const integrations = await integrationRegistry.checkAllIntegrations();

    for (const int of integrations) {
      if (int.connection_status === "NOT_CONNECTED" || int.connection_status === "REQUIRES_MANUAL_SETUP") {
        actions.push({
          id: `setup-${int.provider.toLowerCase()}`,
          title: `Connect ${int.provider} Service`,
          module: int.category,
          category: "INTEGRATION",
          what: `The ${int.provider} adapter has no configured API credentials in the current environment.`,
          why: `Unlocks automated capabilities: ${int.capabilities.join(", ") || "external API capabilities"}.`,
          where_location: `.env or your hosting platform's environment variables dashboard`,
          how_instructions:
            int.manual_setup_instructions ||
            `Set the required environment variables: ${int.required_env_vars.join(", ")}.`,
          status: int.connection_status,
          required_keys: int.required_env_vars,
          severity: int.provider === "POSTGRES" ? "HIGH" : "MEDIUM",
        });
      }
    }

    // 2. Add domain & deployment verification tasks if unconfigured
    const hasProductionUrl = Boolean(process.env.NEXT_PUBLIC_APP_URL);
    if (!hasProductionUrl) {
      actions.push({
        id: "setup-domain-url",
        title: "Configure Base Production URL",
        module: "SYSTEM",
        category: "DEPLOYMENT",
        what: "NEXT_PUBLIC_APP_URL environment variable is not explicitly defined.",
        why: "Used to construct absolute checkout, webhook, and asset delivery URLs for public customers.",
        where_location: `.env.local or production hosting settings`,
        how_instructions: "Define NEXT_PUBLIC_APP_URL (e.g., https://yourdomain.com or http://localhost:3000).",
        status: "REQUIRES_MANUAL_SETUP",
        required_keys: ["NEXT_PUBLIC_APP_URL"],
        severity: "LOW",
      });
    }

    return actions;
  }
}

export const manualActionAggregator = new ManualActionAggregator();
