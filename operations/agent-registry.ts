import { operationsRepo } from "@/database/repositories/operations-repo";
import type { AgentRegistryItem, AgentStatus } from "@/types/operations";

const INITIAL_AGENT_ROSTER: Array<{
  id: string;
  name: string;
  phase_number: number;
  capabilities: string[];
  dependencies: string[];
}> = [
  {
    id: "discovery_research_agent",
    name: "Opportunity Discovery & Research Agent",
    phase_number: 3,
    capabilities: ["hn_search", "reddit_search", "github_search", "evidence_dedup", "zero_cost_filter"],
    dependencies: [],
  },
  {
    id: "validation_agent",
    name: "Validation & Willingness-To-Pay Agent",
    phase_number: 4,
    capabilities: ["scoring_model", "wtp_classification", "persona_generation", "precondition_check"],
    dependencies: ["discovery_research_agent"],
  },
  {
    id: "experiment_agent",
    name: "Zero-Spend Experiment Engine",
    phase_number: 5,
    capabilities: ["landing_page_gen", "waitlist_tracking", "smoke_test", "metrics_evaluation"],
    dependencies: ["validation_agent"],
  },
  {
    id: "product_builder_agent",
    name: "Autonomous Product Builder Agent",
    phase_number: 6,
    capabilities: ["spec_generation", "build_plan_dag", "quality_gates", "packaging_packaging"],
    dependencies: ["experiment_agent"],
  },
  {
    id: "distribution_agent",
    name: "Distribution & Customer Acquisition Agent",
    phase_number: 7,
    capabilities: ["channel_ranking", "content_generation", "anti_spam_guard", "utm_attribution"],
    dependencies: ["product_builder_agent"],
  },
  {
    id: "sales_delivery_agent",
    name: "Sales, Checkout & Digital Delivery Agent",
    phase_number: 8,
    capabilities: ["pricing_rules", "checkout_sessions", "entitlements", "digital_fulfillment"],
    dependencies: ["product_builder_agent", "distribution_agent"],
  },
  {
    id: "customer_success_agent",
    name: "Customer Success, Activation & Retention Agent",
    phase_number: 9,
    capabilities: ["health_scoring", "onboarding_checklists", "support_triage", "churn_prevention"],
    dependencies: ["sales_delivery_agent"],
  },
  {
    id: "intelligence_portfolio_agent",
    name: "Business Intelligence & Portfolio Decision Agent",
    phase_number: 10,
    capabilities: ["funnel_metrics", "unit_economics", "stop_rules", "portfolio_ranking", "forecasts"],
    dependencies: ["customer_success_agent", "sales_delivery_agent"],
  },
  {
    id: "operations_orchestrator_agent",
    name: "Autonomous Operations & Integration Orchestrator",
    phase_number: 11,
    capabilities: ["dag_scheduling", "retry_engine", "readiness_evaluation", "emergency_control"],
    dependencies: ["intelligence_portfolio_agent"],
  },
];

export class AgentRegistryService {
  /**
   * Initializes and ensures all 10 domain agents exist in the registry
   */
  async ensureRoster(): Promise<AgentRegistryItem[]> {
    const existing = await operationsRepo.listAgents();
    const existingIds = new Set(existing.map((a) => a.id));

    for (const agentDef of INITIAL_AGENT_ROSTER) {
      if (!existingIds.has(agentDef.id)) {
        await operationsRepo.upsertAgent({
          id: agentDef.id,
          name: agentDef.name,
          phase_number: agentDef.phase_number,
          capabilities: agentDef.capabilities,
          status: "ACTIVE",
          dependencies: agentDef.dependencies,
        });
      }
    }

    return operationsRepo.listAgents();
  }

  /**
   * List all registered agents
   */
  async listAgents(): Promise<AgentRegistryItem[]> {
    return this.ensureRoster();
  }

  /**
   * Update the status of an individual agent
   */
  async setAgentStatus(agentId: string, status: AgentStatus, error?: string): Promise<AgentRegistryItem | null> {
    return operationsRepo.updateAgentStatus(agentId, status, error);
  }
}

export const agentRegistryService = new AgentRegistryService();
