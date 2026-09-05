import {
  createCustomerSuccessJob,
  updateCustomerSuccessJob,
  listCustomerProfiles,
  listCustomerSupportRequests,
} from "@/database/repositories/customer-success-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import { calculateCustomerHealth } from "./health";
import { detectCustomerChurn } from "./churn";
import { triageSupportTicketWithAI } from "./ai-support";
import { proposeIntervention } from "./interventions";
import { calculateCohortRetention } from "./retention";
import { detectProductLearningSignals } from "./product-signals";
import type { CustomerSuccessJob } from "@/types/customer-success";

export interface CSRunnerOptions {
  is_demo?: boolean;
  product_id?: string;
  max_customers?: number;
}

export interface CSRunnerResult {
  job_id: string;
  customers_evaluated: number;
  health_calculated: number;
  churn_alerts: number;
  support_triaged: number;
  interventions_proposed: number;
  cohorts_computed: number;
  signals_generated: number;
}

export async function runCustomerSuccessPipeline(
  options?: CSRunnerOptions
): Promise<CSRunnerResult> {
  // 1. Create job
  const job = await createCustomerSuccessJob({
    job_type: "CALCULATE_HEALTH",
    status: "RUNNING",
    payload: { options: options || {} },
  });

  const startTime = new Date().toISOString();
  await updateCustomerSuccessJob(job.id, {
    status: "RUNNING",
    started_at: startTime,
  });

  try {
    const isDemo = options?.is_demo ?? false;
    const maxCust = options?.max_customers ?? 50;

    const profiles = await listCustomerProfiles({ is_demo: isDemo, limit: maxCust });
    let healthCalculated = 0;
    let churnAlerts = 0;
    let interventionsProposed = 0;

    for (const p of profiles) {
      // 1. Calculate Health
      const health = await calculateCustomerHealth(p.customer_id, options?.product_id, isDemo);
      healthCalculated++;

      // 2. Churn Detection
      const churn = await detectCustomerChurn(p.customer_id, options?.product_id, isDemo);
      if (churn.risk_score >= 40) {
        churnAlerts++;

        // Propose intervention if At Risk or Dormant
        if (health.status === "AT_RISK" || health.status === "DORMANT") {
          await proposeIntervention({
            customer_id: p.customer_id,
            product_id: options?.product_id,
            intervention_type: health.status === "AT_RISK" ? "USAGE_GUIDANCE" : "ONBOARDING_REMINDER",
            reason: `Customer health is ${health.status} (score: ${health.health_score}).`,
            recommended_action: "Send personalized check-in email with quickstart guide.",
            urgency: health.health_score < 30 ? "HIGH" : "MEDIUM",
            channel: "EMAIL",
            requires_approval: true,
            is_demo: isDemo,
          });
          interventionsProposed++;
        }
      }
    }

    // 3. Triage open support tickets with AI
    const openTickets = await listCustomerSupportRequests({
      status: "OPEN",
      is_demo: isDemo,
      limit: 20,
    });

    let supportTriaged = 0;
    for (const ticket of openTickets) {
      await triageSupportTicketWithAI(ticket.id);
      supportTriaged++;
    }

    // 4. Compute recent cohort retention
    const todayStr = new Date().toISOString().split("T")[0] || new Date().toISOString().substring(0, 10);
    await calculateCohortRetention(todayStr, options?.product_id, isDemo);
    const cohortsComputed = 1;

    // 5. Detect product learning signals
    let signalsGenerated = 0;
    if (options?.product_id) {
      const signals = await detectProductLearningSignals(options.product_id, isDemo);
      signalsGenerated = signals.length;
    }

    const summary: CSRunnerResult = {
      job_id: job.id,
      customers_evaluated: profiles.length,
      health_calculated: healthCalculated,
      churn_alerts: churnAlerts,
      support_triaged: supportTriaged,
      interventions_proposed: interventionsProposed,
      cohorts_computed: cohortsComputed,
      signals_generated: signalsGenerated,
    };

    await updateCustomerSuccessJob(job.id, {
      status: "COMPLETED",
      completed_at: new Date().toISOString(),
      result: summary as unknown as Record<string, unknown>,
    });

    await createAuditLog({
      event_type: "CUSTOMER_SUCCESS_JOB_COMPLETED",
      entity_type: "customer_success_job",
      entity_id: job.id,
      actor: "customer_success_runner",
      details: summary as unknown as Record<string, unknown>,
    });

    return summary;
  } catch (err: any) {
    await updateCustomerSuccessJob(job.id, {
      status: "FAILED",
      error_message: err?.message || String(err),
      completed_at: new Date().toISOString(),
    });
    throw err;
  }
}
