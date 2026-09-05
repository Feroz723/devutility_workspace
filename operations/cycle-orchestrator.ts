import { operationsRepo } from "@/database/repositories/operations-repo";
import { operationsEventBus } from "./event-bus";
import { systemReadinessEngine } from "./readiness-engine";
import { agentRegistryService } from "./agent-registry";
import { jobManager } from "./job-manager";
import { runDistributionPipeline } from "@/distribution/runner";
import { SalesRunner } from "@/sales/runner";
import { runCustomerSuccessPipeline } from "@/customer-success/runner";
import { autonomousIntelligenceRunner } from "@/intelligence/runner";
import type { CycleRunResult } from "./types";

export class AutonomousCycleOrchestrator {
  /**
   * Executes an autonomous business operations cycle (DAILY or WEEKLY)
   */
  async runCycle(cycleType: "DAILY" | "WEEKLY" = "DAILY", isDemo: boolean = false): Promise<CycleRunResult> {
    const startTime = Date.now();
    const startedAt = new Date().toISOString();
    const errors: string[] = [];
    let jobsExecuted = 0;
    let jobsSucceeded = 0;
    let jobsFailed = 0;

    // 1. Check system readiness & emergency states
    const readiness = await systemReadinessEngine.evaluateReadiness();
    if (readiness.status === "SYSTEM_BLOCKED") {
      throw new Error(`Cycle execution blocked: ${readiness.reasons.join(", ")}`);
    }

    // 2. Ensure agent registry roster is seeded
    await agentRegistryService.ensureRoster();

    // 3. Mark cycle active in system state
    await operationsRepo.updateSystemState({
      active_cycle: cycleType,
      ...(cycleType === "DAILY" ? { last_daily_cycle_at: startedAt } : { last_weekly_cycle_at: startedAt }),
    });

    await operationsEventBus.publish({
      event_type: "ORCHESTRATOR_CYCLE_STARTED",
      source_module: "ORCHESTRATOR",
      entity_type: "CYCLE",
      entity_id: `${cycleType}_${Date.now()}`,
      payload: { cycle_type: cycleType, is_demo: isDemo },
      is_demo: isDemo,
    });

    // 4. Stale job recovery before beginning
    await jobManager.recoverStaleJobs(10).catch(() => 0);

    // 5. Execute Stage 1: Distribution Queue Processing
    try {
      jobsExecuted++;
      const { distributionRepo } = await import("@/database/repositories/distribution-repo");
      const campRes = await distributionRepo.listCampaigns({ is_demo: isDemo, limit: 1 }).catch(() => ({ campaigns: [] }));
      const firstCamp = campRes.campaigns[0];
      if (firstCamp?.id) {
        await runDistributionPipeline({ campaign_id: firstCamp.id });
      }
      jobsSucceeded++;
      await agentRegistryService.setAgentStatus("distribution_agent", "ACTIVE");
    } catch (err: any) {
      jobsFailed++;
      errors.push(`Distribution Stage: ${err.message}`);
      await agentRegistryService.setAgentStatus("distribution_agent", "DEGRADED", err.message);
    }

    // 6. Execute Stage 2: Sales, Packaging & Entitlement Fulfillment
    try {
      jobsExecuted++;
      await SalesRunner.runCycle();
      jobsSucceeded++;
      await agentRegistryService.setAgentStatus("sales_delivery_agent", "ACTIVE");
    } catch (err: any) {
      jobsFailed++;
      errors.push(`Sales & Delivery Stage: ${err.message}`);
      await agentRegistryService.setAgentStatus("sales_delivery_agent", "DEGRADED", err.message);
    }

    // 7. Execute Stage 3: Customer Success, Health & Retention Analysis
    try {
      jobsExecuted++;
      await runCustomerSuccessPipeline({ is_demo: isDemo });
      jobsSucceeded++;
      await agentRegistryService.setAgentStatus("customer_success_agent", "ACTIVE");
    } catch (err: any) {
      jobsFailed++;
      errors.push(`Customer Success Stage: ${err.message}`);
      await agentRegistryService.setAgentStatus("customer_success_agent", "DEGRADED", err.message);
    }

    // 8. Execute Stage 4: Business Intelligence, Portfolio Decisions & Learning
    try {
      jobsExecuted++;
      await autonomousIntelligenceRunner.runIntelligenceCycle(isDemo);
      jobsSucceeded++;
      await agentRegistryService.setAgentStatus("intelligence_portfolio_agent", "ACTIVE");
    } catch (err: any) {
      jobsFailed++;
      errors.push(`Business Intelligence Stage: ${err.message}`);
      await agentRegistryService.setAgentStatus("intelligence_portfolio_agent", "DEGRADED", err.message);
    }

    const durationMs = Date.now() - startTime;
    const completedAt = new Date().toISOString();

    // 9. Reset cycle state to IDLE
    await operationsRepo.updateSystemState({
      active_cycle: "IDLE",
    });

    await operationsEventBus.publish({
      event_type: "ORCHESTRATOR_CYCLE_COMPLETED",
      source_module: "ORCHESTRATOR",
      entity_type: "CYCLE",
      entity_id: `${cycleType}_${Date.now()}`,
      payload: {
        cycle_type: cycleType,
        duration_ms: durationMs,
        jobs_executed: jobsExecuted,
        jobs_succeeded: jobsSucceeded,
        jobs_failed: jobsFailed,
        errors,
      },
      is_demo: isDemo,
    });

    // 10. Re-evaluate readiness following the cycle
    const finalReadiness = await systemReadinessEngine.evaluateReadiness();

    return {
      cycle_type: cycleType,
      started_at: startedAt,
      completed_at: completedAt,
      duration_ms: durationMs,
      jobs_executed: jobsExecuted,
      jobs_succeeded: jobsSucceeded,
      jobs_failed: jobsFailed,
      jobs_queued: 0,
      readiness_status: finalReadiness.status,
      errors,
    };
  }
}

export const autonomousCycleOrchestrator = new AutonomousCycleOrchestrator();
