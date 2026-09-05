import {
  listCustomerEvents,
  listCustomerSessions,
  listCustomerActivations,
  listCustomerSupportRequests,
  upsertCustomerHealth,
  getCustomerHealthByCustomerId,
  upsertCustomerProfile,
  getCustomerProfileByCustomerId,
} from "@/database/repositories/customer-success-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import type { CustomerHealthStatus } from "@/types/customer-success";
import type { HealthCalculationResult, HealthScoreFactors } from "./types";

export async function calculateCustomerHealth(
  customerId: string,
  productId?: string,
  isDemo?: boolean
): Promise<HealthCalculationResult> {
  // 1. Gather telemetry
  const events = await listCustomerEvents({ customer_id: customerId, limit: 100 });
  const sessions = await listCustomerSessions({ customer_id: customerId, limit: 50 });
  const activations = await listCustomerActivations({ limit: 10 });
  const custActivation = activations.find((a) => a.customer_id === customerId);
  const supportRequests = await listCustomerSupportRequests({ customer_id: customerId, limit: 20 });

  if (events.length === 0 && sessions.length === 0) {
    const result: HealthCalculationResult = {
      health_score: 50,
      status: "UNKNOWN",
      recency_score: 50,
      frequency_score: 50,
      activation_score: 50,
      support_score: 100,
      factors: {
        recency_days: 999,
        sessions_last_7d: 0,
        events_last_7d: 0,
        activation_completed: false,
        open_critical_tickets: 0,
        negative_feedback_count: 0,
      },
      signals: ["No telemetry recorded yet"],
    };

    await upsertCustomerHealth({
      customer_id: customerId,
      product_id: productId,
      health_score: 50,
      status: "UNKNOWN",
      recency_score: 50,
      frequency_score: 50,
      activation_score: 50,
      support_score: 100,
      factors: result.factors as unknown as Record<string, unknown>,
      signals: result.signals,
      is_demo: isDemo,
    });

    return result;
  }

  const now = Date.now();
  const latestEv = events[0];
  const latestEventTime = latestEv ? new Date(latestEv.created_at).getTime() : 0;
  const latestSess = sessions[0];
  const latestSessionTime = latestSess ? new Date(latestSess.started_at).getTime() : 0;
  const latestActivity = Math.max(latestEventTime, latestSessionTime);
  const recencyDays = latestActivity > 0 ? Math.floor((now - latestActivity) / (1000 * 60 * 60 * 24)) : 999;

  // Recency score (0-100)
  let recencyScore = 10;
  if (recencyDays <= 2) recencyScore = 100;
  else if (recencyDays <= 5) recencyScore = 80;
  else if (recencyDays <= 10) recencyScore = 60;
  else if (recencyDays <= 20) recencyScore = 35;
  else recencyScore = 10;

  // Frequency in last 14 days
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const events14d = events.filter((e) => new Date(e.created_at).getTime() >= fourteenDaysAgo).length;
  const sessions14d = sessions.filter((s) => new Date(s.started_at).getTime() >= fourteenDaysAgo).length;
  const events7d = events.filter((e) => new Date(e.created_at).getTime() >= sevenDaysAgo).length;
  const sessions7d = sessions.filter((s) => new Date(s.started_at).getTime() >= sevenDaysAgo).length;
  const totalActivity14d = events14d + sessions14d;

  let frequencyScore = 10;
  if (totalActivity14d >= 15) frequencyScore = 100;
  else if (totalActivity14d >= 8) frequencyScore = 80;
  else if (totalActivity14d >= 3) frequencyScore = 60;
  else if (totalActivity14d >= 1) frequencyScore = 40;
  else frequencyScore = 15;

  // Activation score
  let activationScore = 25;
  const isActivated = custActivation?.status === "ACTIVATED";
  if (isActivated) activationScore = 100;
  else if (custActivation?.status === "IN_PROGRESS") activationScore = 55;
  else if (custActivation?.status === "STALLED" || custActivation?.status === "FAILED") activationScore = 15;

  // Support score
  const openCriticalOrHigh = supportRequests.filter(
    (t) => (t.severity === "CRITICAL" || t.severity === "HIGH") && t.status !== "RESOLVED" && t.status !== "CLOSED"
  ).length;

  let supportScore = 100;
  if (openCriticalOrHigh > 1) supportScore = 25;
  else if (openCriticalOrHigh === 1) supportScore = 50;

  // Weighted overall calculation
  const overall = Math.round(
    recencyScore * 0.35 +
    frequencyScore * 0.30 +
    activationScore * 0.20 +
    supportScore * 0.15
  );

  let status: CustomerHealthStatus = "HEALTHY";
  const signals: string[] = [];

  if (overall >= 70) {
    status = "HEALTHY";
    signals.push("Strong recency and healthy feature usage pattern.");
  } else if (overall >= 40) {
    status = "AT_RISK";
    signals.push("Activity cadence has dropped or customer is facing friction.");
  } else if (overall >= 15) {
    status = "DORMANT";
    signals.push("Customer has been inactive for an extended period.");
  } else {
    status = "CHURNED";
    signals.push("Customer is completely disengaged.");
  }

  if (openCriticalOrHigh > 0) {
    signals.push(`Customer has ${openCriticalOrHigh} open high/critical support tickets.`);
  }
  if (!isActivated) {
    signals.push("Customer has not yet achieved first value milestone.");
  }

  const factors: HealthScoreFactors = {
    recency_days: recencyDays,
    sessions_last_7d: sessions7d,
    events_last_7d: events7d,
    activation_completed: isActivated,
    open_critical_tickets: openCriticalOrHigh,
    negative_feedback_count: 0,
  };

  // Upsert health record
  await upsertCustomerHealth({
    customer_id: customerId,
    product_id: productId,
    health_score: overall,
    status: status,
    recency_score: recencyScore,
    frequency_score: frequencyScore,
    activation_score: activationScore,
    support_score: supportScore,
    factors: factors as unknown as Record<string, unknown>,
    signals: signals,
    is_demo: isDemo,
  });

  // Sync journey_stage if appropriate
  const profile = await getCustomerProfileByCustomerId(customerId);
  if (profile) {
    if (status === "AT_RISK" && profile.journey_stage !== "AT_RISK" && profile.journey_stage !== "CHURNED") {
      await upsertCustomerProfile({ customer_id: customerId, journey_stage: "AT_RISK" });
    } else if (status === "DORMANT" && profile.journey_stage !== "DORMANT" && profile.journey_stage !== "CHURNED") {
      await upsertCustomerProfile({ customer_id: customerId, journey_stage: "DORMANT" });
    }
  }

  await createAuditLog({
    event_type: "CUSTOMER_HEALTH_EVALUATED",
    entity_type: "customer_health",
    actor: "customer_success_health",
    details: {
      customer_id: customerId,
      health_score: overall,
      status: status,
    },
  });

  return {
    health_score: overall,
    status,
    recency_score: recencyScore,
    frequency_score: frequencyScore,
    activation_score: activationScore,
    support_score: supportScore,
    factors,
    signals,
  };
}
