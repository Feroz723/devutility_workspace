import {
  listCustomerGoals,
  listCustomerMilestones,
  listCustomerActivations,
} from "@/database/repositories/customer-success-repo";

export interface OutcomeVerificationResult {
  customer_id: string;
  product_id: string;
  status: "ACHIEVED" | "PARTIALLY_ACHIEVED" | "NOT_ACHIEVED" | "UNKNOWN";
  goal_title?: string;
  expected_outcome?: string;
  progress_percent: number;
  completed_milestones: string[];
  evidence_summary: string;
}

export async function verifyCustomerOutcome(
  customerId: string,
  productId: string
): Promise<OutcomeVerificationResult> {
  const goals = await listCustomerGoals({
    customer_id: customerId,
    product_id: productId,
  });

  if (goals.length === 0) {
    const activation = await listCustomerActivations({ product_id: productId, limit: 10 });
    const custAct = activation.find((a) => a.customer_id === customerId);

    if (custAct?.status === "ACTIVATED") {
      return {
        customer_id: customerId,
        product_id: productId,
        status: "ACHIEVED",
        progress_percent: 100,
        completed_milestones: [custAct.first_value_name || "First Value Realized"],
        evidence_summary: "Customer triggered first value milestone in telemetry.",
      };
    }

    return {
      customer_id: customerId,
      product_id: productId,
      status: "UNKNOWN",
      progress_percent: 0,
      completed_milestones: [],
      evidence_summary: "No goal definition or activation milestones recorded.",
    };
  }

  const primaryGoal = goals[0];
  if (!primaryGoal) {
    return {
      customer_id: customerId,
      product_id: productId,
      status: "UNKNOWN",
      progress_percent: 0,
      completed_milestones: [],
      evidence_summary: "No goals available.",
    };
  }

  const milestones = await listCustomerMilestones(primaryGoal.id);
  const completed = milestones.filter((m) => m.is_completed);
  const completedNames = completed.map((m) => m.name);

  let status: OutcomeVerificationResult["status"] = "NOT_ACHIEVED";
  if (primaryGoal.completion_status === "ACHIEVED") {
    status = "ACHIEVED";
  } else if (primaryGoal.progress_percent > 0) {
    status = "PARTIALLY_ACHIEVED";
  }

  return {
    customer_id: customerId,
    product_id: productId,
    status,
    goal_title: primaryGoal.title,
    expected_outcome: primaryGoal.expected_outcome || undefined,
    progress_percent: primaryGoal.progress_percent,
    completed_milestones: completedNames,
    evidence_summary: `${completed.length} of ${milestones.length} milestones verified.`,
  };
}

export async function getProductOutcomeSummary(productId: string): Promise<{
  total_customers: number;
  achieved_count: number;
  partially_achieved_count: number;
  not_achieved_count: number;
  outcome_fulfillment_rate_percent: number;
  has_sufficient_data: boolean;
}> {
  const goals = await listCustomerGoals({ product_id: productId });
  const total = goals.length;

  let achieved = 0;
  let partial = 0;
  let notAchieved = 0;

  for (const g of goals) {
    if (g.completion_status === "ACHIEVED") achieved++;
    else if (g.progress_percent > 0) partial++;
    else notAchieved++;
  }

  const fulfillmentRate = total > 0 ? Math.round((achieved / total) * 100) : 0;

  return {
    total_customers: total,
    achieved_count: achieved,
    partially_achieved_count: partial,
    not_achieved_count: notAchieved,
    outcome_fulfillment_rate_percent: fulfillmentRate,
    has_sufficient_data: total >= 3,
  };
}
