import {
  getCustomerHealthByCustomerId,
  listCustomerEvents,
  listCustomerFeedback,
  listCustomerSupportRequests,
  upsertCustomerChurn,
  getCustomerChurn,
  upsertCustomerProfile,
} from "@/database/repositories/customer-success-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import type { ChurnDetectionResult } from "./types";
import type { ChurnStatus, ChurnReason } from "@/types/customer-success";

export async function detectCustomerChurn(
  customerId: string,
  productId?: string,
  isDemo?: boolean
): Promise<ChurnDetectionResult> {
  const health = await getCustomerHealthByCustomerId(customerId);
  const events = await listCustomerEvents({ customer_id: customerId, limit: 100 });
  const feedback = await listCustomerFeedback({ customer_id: customerId, limit: 20 });
  const support = await listCustomerSupportRequests({ customer_id: customerId, limit: 20 });

  const signals: string[] = [];
  let riskScore = 0;
  let churnStatus: ChurnStatus = "CHURN_RISK";
  let primaryReason: ChurnReason = "INACTIVITY";

  // Check for explicit cancellation events
  const hasCancelEvent = events.some((e) => e.event_type === "SUBSCRIPTION_CANCELLED");
  if (hasCancelEvent) {
    churnStatus = "CONFIRMED_CHURN";
    primaryReason = "CANCELLATION";
    riskScore = 100;
    signals.push("Customer explicitly triggered cancellation event.");
  }

  // Check negative feedback or churn reasons
  const churnFeedback = feedback.find((f) => f.feedback_type === "CHURN_REASON" || f.sentiment === "NEGATIVE");
  if (churnFeedback) {
    riskScore += 40;
    signals.push(`Customer submitted negative feedback: "${churnFeedback.comment || churnFeedback.feedback_type}"`);
    if (churnStatus !== "CONFIRMED_CHURN") {
      primaryReason = "PRODUCT_DISSATISFACTION";
    }
  }

  // Check unresolved critical bugs
  const unresolvedBugs = support.filter((s) => s.category === "BUG" && s.status !== "RESOLVED" && s.status !== "CLOSED");
  if (unresolvedBugs.length >= 2) {
    riskScore += 30;
    signals.push(`Customer experienced ${unresolvedBugs.length} unresolved bug reports.`);
    if (churnStatus !== "CONFIRMED_CHURN") {
      primaryReason = "REPEATED_BUGS";
    }
  }

  // Check health score factor
  if (health) {
    if (health.status === "DORMANT") {
      riskScore += 35;
      signals.push("Customer is classified as DORMANT in health evaluation.");
    } else if (health.status === "AT_RISK") {
      riskScore += 20;
      signals.push("Customer is classified as AT_RISK in health evaluation.");
    }
  }

  // Inactivity check
  const now = Date.now();
  const latestEvent = events[0];
  const latestEventTime = latestEvent ? new Date(latestEvent.created_at).getTime() : 0;
  const daysInactive = latestEventTime > 0 ? Math.floor((now - latestEventTime) / (24 * 60 * 60 * 1000)) : 99;

  if (daysInactive > 30) {
    riskScore += 30;
    signals.push(`Customer has been inactive for ${daysInactive} days.`);
  }

  if (daysInactive > 60) {
    churnStatus = "CONFIRMED_CHURN";
    signals.push("Customer has exceeded 60 consecutive days of inactivity without re-engagement.");
  }

  riskScore = Math.min(100, Math.max(0, riskScore));

  const result: ChurnDetectionResult = {
    churn_status: churnStatus,
    risk_score: riskScore,
    primary_reason: primaryReason,
    signals: signals.length > 0 ? signals : ["Standard engagement levels."],
  };

  // Upsert to DB if riskScore >= 40 or confirmed
  if (riskScore >= 40 || churnStatus === "CONFIRMED_CHURN") {
    await upsertCustomerChurn({
      customer_id: customerId,
      product_id: productId,
      churn_status: churnStatus,
      risk_score: riskScore,
      primary_reason: primaryReason,
      signals: result.signals,
      confirmed_at: churnStatus === "CONFIRMED_CHURN" ? new Date().toISOString() : null,
      is_demo: isDemo,
    });

    if (churnStatus === "CONFIRMED_CHURN") {
      await upsertCustomerProfile({
        customer_id: customerId,
        journey_stage: "CHURNED",
      });
    }

    await createAuditLog({
      event_type: "CUSTOMER_CHURN_DETECTED",
      entity_type: "customer_churn",
      actor: "customer_success_churn",
      details: {
        customer_id: customerId,
        churn_status: churnStatus,
        risk_score: riskScore,
        primary_reason: primaryReason,
      },
    });
  }

  return result;
}
