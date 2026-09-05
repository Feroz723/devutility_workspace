import {
  listCustomerFeedback,
  listCustomerSupportRequests,
  listCustomerActivations,
} from "@/database/repositories/customer-success-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import type { ProductLearningSignal } from "./types";

export async function detectProductLearningSignals(
  productId: string,
  isDemo?: boolean
): Promise<ProductLearningSignal[]> {
  const feedback = await listCustomerFeedback({ product_id: productId, is_demo: isDemo, limit: 200 });
  const support = await listCustomerSupportRequests({ product_id: productId, is_demo: isDemo, limit: 200 });
  const activations = await listCustomerActivations({ product_id: productId, is_demo: isDemo, limit: 200 });

  const signals: ProductLearningSignal[] = [];

  // 1. Detect Bug Clusters
  const bugTickets = support.filter((s) => s.category === "BUG");
  if (bugTickets.length >= 2) {
    signals.push({
      product_id: productId,
      signal_type: "BUG_CLUSTER",
      title: "Recurring Software Defects in Product",
      description: `${bugTickets.length} bug reports logged in support. Primary themes: ${bugTickets.slice(0, 2).map((b) => b.subject).join(", ")}.`,
      severity: bugTickets.length >= 4 ? "HIGH" : "MEDIUM",
      evidence_count: bugTickets.length,
      recommended_spec_action: "Review regression suite and fix highest frequency defect in next Phase 6 release.",
      status: "REQUIRES_REVIEW",
    });
  }

  // 2. Detect Activation Friction
  const stalledActivations = activations.filter((a) => a.status === "STALLED" || a.status === "FAILED");
  if (stalledActivations.length >= 2) {
    signals.push({
      product_id: productId,
      signal_type: "USABILITY_FRICTION",
      title: "Activation Drop-Off at First Action",
      description: `${stalledActivations.length} customers stalled before achieving their first value milestone.`,
      severity: "HIGH",
      evidence_count: stalledActivations.length,
      recommended_spec_action: "Simplify first-run onboarding wizard or provide interactive walkthrough tooltip.",
      status: "REQUIRES_REVIEW",
    });
  }

  // 3. Detect Feature Gaps
  const featureRequests = feedback.filter((f) => f.feedback_type === "FEATURE_REQUEST");
  if (featureRequests.length >= 3) {
    signals.push({
      product_id: productId,
      signal_type: "FEATURE_GAP",
      title: "Repeated Customer Requests for Missing Capabilities",
      description: `${featureRequests.length} feature requests submitted across feedback channels.`,
      severity: "MEDIUM",
      evidence_count: featureRequests.length,
      recommended_spec_action: "Examine top requested features in Customer Success dashboard for backlog integration.",
      status: "REQUIRES_REVIEW",
    });
  }

  // 4. Detect Success Patterns
  const activatedCount = activations.filter((a) => a.status === "ACTIVATED").length;
  if (activatedCount >= 5) {
    signals.push({
      product_id: productId,
      signal_type: "SUCCESS_PATTERN",
      title: "Strong Time-to-Value Realization",
      description: `${activatedCount} customers have successfully activated with verified first-value completion.`,
      severity: "LOW",
      evidence_count: activatedCount,
      recommended_spec_action: "Preserve core activation flow; consider expanding product tier or distribution reach.",
      status: "REQUIRES_REVIEW",
    });
  }

  for (const sig of signals) {
    await createAuditLog({
      event_type: "PRODUCT_LEARNING_SIGNAL_GENERATED",
      entity_type: "product_signal",
      actor: "customer_success_engine",
      details: {
        product_id: productId,
        signal_type: sig.signal_type,
        title: sig.title,
        severity: sig.severity,
      },
    });
  }

  return signals;
}
