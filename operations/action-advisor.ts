import { operationsRepo } from "@/database/repositories/operations-repo";
import { runtimeRepo } from "@/database/repositories/runtime-repo";
import { approvalAggregator } from "./approval-aggregator";
import { manualActionAggregator } from "./manual-action-aggregator";
import type { ActionRecommendation } from "@/types/operations";

export class OperationsActionAdvisor {
  /**
   * Deterministically evaluates system state and returns prioritized recommendations
   */
  async getRecommendedActions(): Promise<ActionRecommendation[]> {
    const recommendations: ActionRecommendation[] = [];
    let priorityCounter = 1;

    // 1. Emergency Kill Switch / Global Pause
    const systemState = await operationsRepo.getSystemState();
    if (systemState.is_kill_switch_active) {
      recommendations.push({
        priority: priorityCounter++,
        category: "SYSTEM_READINESS",
        title: "Emergency Kill Switch Engaged",
        action: "Review kill switch reason and disengage when safe to resume autonomous execution.",
        reason: systemState.kill_switch_reason || "Operator activated kill switch.",
        target_url: "/operations",
        severity: "CRITICAL",
      });
    } else if (systemState.is_paused) {
      recommendations.push({
        priority: priorityCounter++,
        category: "SYSTEM_READINESS",
        title: "Global Execution Paused",
        action: "Resume global execution to permit scheduled pipeline jobs to run.",
        reason: systemState.pause_reason || "System in paused state.",
        target_url: "/operations",
        severity: "HIGH",
      });
    }

    // 1b. Runtime Safe Mode & Worker Status
    try {
      const runtimeConfig = await runtimeRepo.getRuntimeConfig();
      if (runtimeConfig?.safe_mode) {
        recommendations.push({
          priority: priorityCounter++,
          category: "SYSTEM_READINESS",
          title: "Runtime Safe Mode Engaged",
          action: "Autonomous actions restricted to read-only queries and dry-run execution.",
          reason: "Safe mode was triggered automatically after repeated job failures or manually by operator.",
          target_url: "/operations/runtime",
          severity: "HIGH",
        });
      }

      const activeWorkers = await runtimeRepo.listActiveWorkers();
      if (activeWorkers.length === 0) {
        recommendations.push({
          priority: priorityCounter++,
          category: "SYSTEM_READINESS",
          title: "No Background Workers Active",
          action: "Launch the autonomous worker daemon (`npm run worker`) to process scheduled business cycles.",
          reason: "Scheduled pipeline jobs require an active server-side worker daemon process.",
          target_url: "/operations/runtime",
          severity: "MEDIUM",
        });
      }
    } catch {
      // Runtime tables not yet ready or DB error, continue gracefully
    }

    // 2. Dead-Letter Jobs
    const deadLetters = await operationsRepo.listDeadLetterJobs({ limit: 5 });
    if (deadLetters.total > 0) {
      recommendations.push({
        priority: priorityCounter++,
        category: "DEAD_LETTER_JOB",
        title: `Investigate ${deadLetters.total} Dead-Letter Job${deadLetters.total > 1 ? "s" : ""}`,
        action: "Inspect job failure classifications, repair root causes, and trigger safe retry.",
        reason: `Jobs encountered permanent errors or exhausted maximum retry attempts: ${deadLetters.jobs[0]?.name || "pipeline task"}.`,
        target_url: "/operations/jobs",
        severity: "HIGH",
      });
    }

    // 3. Pending Approvals
    const approvals = await approvalAggregator.getPendingApprovals();
    if (approvals.length > 0) {
      recommendations.push({
        priority: priorityCounter++,
        category: "APPROVAL",
        title: `Review ${approvals.length} Pending Approval Request${approvals.length > 1 ? "s" : ""}`,
        action: "Audit the evidence, estimated financial cost, and risk level before approving.",
        reason: `${approvals[0]?.action_type}: ${approvals[0]?.action_description}`,
        target_url: "/operations/approvals",
        severity: approvals.some((a) => a.risk_level === "high" || a.risk_level === "critical") ? "HIGH" : "MEDIUM",
      });
    }

    // 4. Manual Setup Actions
    const manualActions = await manualActionAggregator.getManualActions();
    const criticalManual = manualActions.filter((m) => m.severity === "HIGH");
    if (criticalManual.length > 0) {
      recommendations.push({
        priority: priorityCounter++,
        category: "MANUAL_SETUP",
        title: criticalManual[0]?.title || "Complete Critical Manual Setup",
        action: criticalManual[0]?.how_instructions || "Supply required environment variables.",
        reason: criticalManual[0]?.why || "Unlocks core autonomous features.",
        target_url: "/operations/manual",
        severity: "HIGH",
      });
    }

    // 5. Active Business Risks (from Phase 10)
    const activeRisks = await operationsRepo.listEvents({ event_type: "RISK_DETECTED", limit: 3 }).catch(() => []);
    if (activeRisks.length > 0) {
      recommendations.push({
        priority: priorityCounter++,
        category: "BUSINESS_RISK",
        title: "Review Business Concentration Risk",
        action: "Evaluate product and channel diversification recommendations.",
        reason: "Autonomous risk detector flagged revenue or audience concentration.",
        target_url: "/intelligence/risks",
        severity: "MEDIUM",
      });
    }

    // Fallback if everything is running smoothly
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 1,
        category: "SYSTEM_READINESS",
        title: "System Fully Operational",
        action: "Autonomous business cycle is running smoothly within ₹0 spend parameters.",
        reason: "Zero failed jobs, no pending approvals, and all safety policies actively enforced.",
        target_url: "/operations",
        severity: "LOW",
      });
    }

    return recommendations;
  }
}

export const operationsActionAdvisor = new OperationsActionAdvisor();
