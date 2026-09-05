import {
  listCustomerActivations,
  getCustomerActivation,
  upsertCustomerActivation,
} from "@/database/repositories/customer-success-repo";

export interface ActivationSummary {
  product_id?: string;
  total_tracked: number;
  total_activated: number;
  activation_rate_percent: number;
  average_time_to_value_seconds: number | null;
  median_time_to_value_seconds: number | null;
  has_sufficient_data: boolean;
  status_breakdown: {
    NOT_STARTED: number;
    IN_PROGRESS: number;
    ACTIVATED: number;
    STALLED: number;
    FAILED: number;
  };
}

export async function getActivationMetrics(options?: {
  product_id?: string;
  is_demo?: boolean;
}): Promise<ActivationSummary> {
  const activations = await listCustomerActivations({
    product_id: options?.product_id,
    is_demo: options?.is_demo,
    limit: 1000,
  });

  const totalTracked = activations.length;
  const statusBreakdown = {
    NOT_STARTED: 0,
    IN_PROGRESS: 0,
    ACTIVATED: 0,
    STALLED: 0,
    FAILED: 0,
  };

  const ttvList: number[] = [];

  for (const act of activations) {
    if (statusBreakdown[act.status] !== undefined) {
      statusBreakdown[act.status]++;
    }
    if (act.status === "ACTIVATED" && act.time_to_value_seconds !== null && act.time_to_value_seconds !== undefined) {
      ttvList.push(act.time_to_value_seconds);
    }
  }

  const totalActivated = statusBreakdown.ACTIVATED;
  const activationRate = totalTracked > 0 ? Math.round((totalActivated / totalTracked) * 100) : 0;

  let avgTtv: number | null = null;
  let medianTtv: number | null = null;

  if (ttvList.length > 0) {
    const sum = ttvList.reduce((acc, curr) => acc + curr, 0);
    avgTtv = Math.round(sum / ttvList.length);
    ttvList.sort((a, b) => a - b);
    const mid = Math.floor(ttvList.length / 2);
    const midVal = ttvList[mid] ?? 0;
    const prevVal = ttvList[mid - 1] ?? 0;
    medianTtv = ttvList.length % 2 !== 0 ? midVal : Math.round((prevVal + midVal) / 2);
  }

  return {
    product_id: options?.product_id,
    total_tracked: totalTracked,
    total_activated: totalActivated,
    activation_rate_percent: activationRate,
    average_time_to_value_seconds: avgTtv,
    median_time_to_value_seconds: medianTtv,
    has_sufficient_data: totalTracked >= 3,
    status_breakdown: statusBreakdown,
  };
}

export async function recordActivationMilestone(
  customerId: string,
  productId: string,
  milestoneName: string
) {
  const existing = await getCustomerActivation(customerId, productId);
  const currentCompleted = existing?.milestones_completed ?? 0;
  const currentTotal = Math.max(existing?.milestones_total ?? 1, currentCompleted + 1);

  return upsertCustomerActivation({
    customer_id: customerId,
    product_id: productId,
    status: currentCompleted + 1 >= currentTotal ? "ACTIVATED" : "IN_PROGRESS",
    milestones_completed: currentCompleted + 1,
    milestones_total: currentTotal,
    first_action_name: existing?.first_action_name || milestoneName,
    activation_started_at: existing?.activation_started_at || new Date().toISOString(),
  });
}
