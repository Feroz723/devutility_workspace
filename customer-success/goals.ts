import {
  createCustomerGoal,
  updateCustomerGoal,
  listCustomerGoals,
  createCustomerMilestone,
  updateCustomerMilestone,
  listCustomerMilestones,
  upsertCustomerProfile,
} from "@/database/repositories/customer-success-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import type { CustomerGoal, CustomerMilestone, GoalCompletionStatus } from "@/types/customer-success";

export interface CreateGoalWithMilestonesInput {
  customer_id: string;
  product_id: string;
  title: string;
  description?: string;
  expected_outcome?: string;
  milestone_names?: string[];
  target_date?: string;
  is_demo?: boolean;
}

export async function setupCustomerGoal(
  input: CreateGoalWithMilestonesInput
): Promise<{ goal: CustomerGoal; milestones: CustomerMilestone[] }> {
  const goal = await createCustomerGoal({
    customer_id: input.customer_id,
    product_id: input.product_id,
    title: input.title,
    description: input.description,
    expected_outcome: input.expected_outcome,
    completion_status: "IN_PROGRESS",
    progress_percent: 0,
    target_date: input.target_date,
    is_demo: input.is_demo,
  });

  const milestoneNames = input.milestone_names && input.milestone_names.length > 0
    ? input.milestone_names
    : ["Initial Setup", "First Action Completed", "Outcome Realized"];

  const milestones: CustomerMilestone[] = [];
  for (let i = 0; i < milestoneNames.length; i++) {
    const name = milestoneNames[i] || `Milestone ${i + 1}`;
    const m = await createCustomerMilestone({
      goal_id: goal.id,
      customer_id: input.customer_id,
      name,
      sequence_order: i + 1,
    });
    milestones.push(m);
  }

  return { goal, milestones };
}

export async function completeMilestone(
  milestoneId: string,
  evidence?: Record<string, unknown>
): Promise<{ goal: CustomerGoal | null; milestone: CustomerMilestone | null }> {
  const updatedMilestone = await updateCustomerMilestone(milestoneId, true, evidence);
  if (!updatedMilestone) {
    return { goal: null, milestone: null };
  }

  const allMilestones = await listCustomerMilestones(updatedMilestone.goal_id);
  const total = allMilestones.length;
  const completed = allMilestones.filter((m) => m.is_completed).length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const isAchieved = progressPercent === 100;
  const newStatus: GoalCompletionStatus = isAchieved ? "ACHIEVED" : "IN_PROGRESS";

  const updatedGoal = await updateCustomerGoal(updatedMilestone.goal_id, {
    progress_percent: progressPercent,
    completion_status: newStatus,
    achieved_at: isAchieved ? new Date().toISOString() : undefined,
  });

  if (isAchieved && updatedGoal) {
    await createAuditLog({
      event_type: "CUSTOMER_GOAL_UPDATED",
      entity_type: "customer_goal",
      entity_id: updatedGoal.id,
      actor: "customer_success_engine",
      details: {
        customer_id: updatedGoal.customer_id,
        goal_title: updatedGoal.title,
        status: "ACHIEVED",
        progress_percent: 100,
      },
    });

    // Upgrade customer stage to SUCCESSFUL
    await upsertCustomerProfile({
      customer_id: updatedGoal.customer_id,
      journey_stage: "SUCCESSFUL",
    });
  }

  return { goal: updatedGoal, milestone: updatedMilestone };
}
