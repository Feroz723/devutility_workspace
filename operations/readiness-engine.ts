import { operationsRepo } from "@/database/repositories/operations-repo";
import { integrationRegistry } from "./integration-registry";
import type { SystemReadinessStatus, SystemState } from "@/types/operations";

export interface ReadinessEvaluationResult {
  status: SystemReadinessStatus;
  reasons: string[];
  databaseHealthy: boolean;
  killSwitchActive: boolean;
  isPaused: boolean;
  deadLetterCount: number;
  pendingApprovalsCount: number;
  unconnectedIntegrationsCount: number;
}

export class SystemReadinessEngine {
  /**
   * Deterministically evaluates system readiness based on all operational signals
   */
  async evaluateReadiness(): Promise<ReadinessEvaluationResult> {
    const reasons: string[] = [];

    // 1. Get system state (pause & kill switch)
    const state = await operationsRepo.getSystemState();

    // 2. Check Database & Integrations
    const integrations = await integrationRegistry.checkAllIntegrations();
    const dbIntegration = integrations.find((i) => i.provider === "POSTGRES");
    const dbHealthy = dbIntegration?.connection_status === "HEALTHY";

    // 3. Check Dead-Letter Jobs
    const deadLetterRes = await operationsRepo.listDeadLetterJobs({ limit: 10 });
    const deadLetterCount = deadLetterRes.total;

    // 4. Check Pending Approvals
    const approvals = await operationsRepo.listUnifiedApprovals();
    const pendingApprovalsCount = approvals.length;

    // 5. Check Unconnected Integrations
    const unconnected = integrations.filter(
      (i) => i.connection_status === "NOT_CONNECTED" || i.connection_status === "REQUIRES_MANUAL_SETUP"
    );

    // Rule 1: Emergency Kill Switch
    if (state.is_kill_switch_active) {
      reasons.push(`Emergency Kill Switch is engaged (${state.kill_switch_reason || "Operator activated"}). All autonomous execution is suspended.`);
      const result: ReadinessEvaluationResult = {
        status: "SYSTEM_BLOCKED",
        reasons,
        databaseHealthy: dbHealthy,
        killSwitchActive: true,
        isPaused: state.is_paused,
        deadLetterCount,
        pendingApprovalsCount,
        unconnectedIntegrationsCount: unconnected.length,
      };
      await this.persistStatus(result);
      return result;
    }

    // Rule 2: Global Pause
    if (state.is_paused) {
      reasons.push(`Global Pause is active (${state.pause_reason || "Scheduled pause"}).`);
      const result: ReadinessEvaluationResult = {
        status: "SYSTEM_BLOCKED",
        reasons,
        databaseHealthy: dbHealthy,
        killSwitchActive: false,
        isPaused: true,
        deadLetterCount,
        pendingApprovalsCount,
        unconnectedIntegrationsCount: unconnected.length,
      };
      await this.persistStatus(result);
      return result;
    }

    // Rule 3: Database failure
    if (!dbHealthy) {
      reasons.push("PostgreSQL database connection is unreachable or failed health check.");
      const result: ReadinessEvaluationResult = {
        status: "SYSTEM_NOT_READY",
        reasons,
        databaseHealthy: false,
        killSwitchActive: false,
        isPaused: false,
        deadLetterCount,
        pendingApprovalsCount,
        unconnectedIntegrationsCount: unconnected.length,
      };
      await this.persistStatus(result);
      return result;
    }

    // Rule 4: Dead letter jobs backlog
    if (deadLetterCount > 5) {
      reasons.push(`High dead-letter queue backlog (${deadLetterCount} jobs in DEAD_LETTER). Operator investigation recommended.`);
    }

    // Rule 5: Missing AI provider
    const aiIntegrations = integrations.filter(
      (i) => i.category === "AI" && (i.connection_status === "CONFIGURED_LIVE" || i.connection_status === "HEALTHY")
    );
    if (aiIntegrations.length === 0) {
      reasons.push("No external AI API provider connected (OpenAI/Anthropic/Gemini). Operating in deterministic offline template mode.");
    }

    // Rule 6: Missing payment credentials
    const paymentIntegrations = integrations.filter(
      (i) => i.category === "PAYMENT" && (i.connection_status === "CONFIGURED_LIVE" || i.connection_status === "HEALTHY")
    );
    if (paymentIntegrations.length === 0) {
      reasons.push("Live payment gateways not connected. Checkouts operating on ₹0 free unlocks or test manual checkout.");
    }

    // Determine final status
    let status: SystemReadinessStatus = "SYSTEM_READY";

    if (reasons.length > 0) {
      status = "SYSTEM_PARTIALLY_READY";
    }

    const result: ReadinessEvaluationResult = {
      status,
      reasons: reasons.length > 0 ? reasons : ["All core systems, PostgreSQL, and autonomous guards operational."],
      databaseHealthy: true,
      killSwitchActive: false,
      isPaused: false,
      deadLetterCount,
      pendingApprovalsCount,
      unconnectedIntegrationsCount: unconnected.length,
    };

    await this.persistStatus(result);
    return result;
  }

  private async persistStatus(result: ReadinessEvaluationResult): Promise<void> {
    await operationsRepo.updateSystemState({
      readiness_status: result.status,
      readiness_reasons: result.reasons,
    });
  }
}

export const systemReadinessEngine = new SystemReadinessEngine();
