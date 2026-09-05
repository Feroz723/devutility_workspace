import {
  getCustomerProfileByCustomerId,
  listCustomerInterventions,
} from "@/database/repositories/customer-success-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";

export interface CommunicationSafetyCheckResult {
  allowed: boolean;
  reason?: string;
  code?: "UNSUBSCRIBED" | "OPTED_OUT" | "DAILY_LIMIT_EXCEEDED" | "WEEKLY_LIMIT_EXCEEDED" | "QUIET_HOURS" | "APPROVAL_REQUIRED";
}

export async function checkCommunicationSafety(
  customerId: string,
  options?: {
    channel?: string;
    isUrgent?: boolean;
    bypassLimits?: boolean;
  }
): Promise<CommunicationSafetyCheckResult> {
  const profile = await getCustomerProfileByCustomerId(customerId);

  if (profile) {
    if (profile.unsubscribed) {
      return {
        allowed: false,
        reason: "Customer has unsubscribed from all communications.",
        code: "UNSUBSCRIBED",
      };
    }

    if (!profile.communication_opt_in) {
      return {
        allowed: false,
        reason: "Customer has opted out of marketing/success outreach.",
        code: "OPTED_OUT",
      };
    }
  }

  if (options?.bypassLimits) {
    return { allowed: true };
  }

  // Check recent sent interventions to enforce daily & weekly frequency caps
  const recentInterventions = await listCustomerInterventions({
    customer_id: customerId,
    status: "SENT",
    limit: 20,
  });

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const dailyCount = recentInterventions.filter(
    (item) => item.executed_at && new Date(item.executed_at) >= oneDayAgo
  ).length;

  const weeklyCount = recentInterventions.filter(
    (item) => item.executed_at && new Date(item.executed_at) >= sevenDaysAgo
  ).length;

  const dailyLimit = profile?.daily_message_limit ?? 2;
  const weeklyLimit = profile?.weekly_message_limit ?? 5;

  if (dailyCount >= dailyLimit) {
    await createAuditLog({
      event_type: "SALES_ACTION_BLOCKED",
      entity_type: "customer_intervention",
      actor: "customer_success_safety",
      details: {
        customer_id: customerId,
        reason: `Daily message cap of ${dailyLimit} reached.`,
        dailyCount,
      },
    });
    return {
      allowed: false,
      reason: `Daily message limit of ${dailyLimit} messages exceeded.`,
      code: "DAILY_LIMIT_EXCEEDED",
    };
  }

  if (weeklyCount >= weeklyLimit) {
    await createAuditLog({
      event_type: "SALES_ACTION_BLOCKED",
      entity_type: "customer_intervention",
      actor: "customer_success_safety",
      details: {
        customer_id: customerId,
        reason: `Weekly message cap of ${weeklyLimit} reached.`,
        weeklyCount,
      },
    });
    return {
      allowed: false,
      reason: `Weekly message limit of ${weeklyLimit} messages exceeded.`,
      code: "WEEKLY_LIMIT_EXCEEDED",
    };
  }

  // Quiet hours check (default: 22:00 to 07:00 UTC)
  const currentHour = now.getUTCHours();
  if (currentHour >= 22 || currentHour < 7) {
    if (!options?.isUrgent) {
      return {
        allowed: false,
        reason: "Quiet hours in effect (22:00 - 07:00 UTC). Communication should be scheduled for daytime.",
        code: "QUIET_HOURS",
      };
    }
  }

  return { allowed: true };
}
