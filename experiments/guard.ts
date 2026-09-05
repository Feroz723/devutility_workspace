import type { Experiment } from "@/types/experiment";
import type { ExecutionGuardResult } from "./types";
import { classifyAction } from "@/decision-engine/zero-spend-guard";

export function canExecute(experiment: Partial<Experiment>): ExecutionGuardResult {
  const cost = experiment.estimated_cost_inr ?? 0;

  // 1. Classify via zero-spend guard
  const spendCheck = classifyAction({
    action_type: experiment.experiment_type || "experiment_execution",
    description: experiment.title || "Zero-spend experiment test",
    estimated_cost_inr: cost,
    is_reversible: true,
    is_sensitive: false,
  });

  if (spendCheck.classification === "BLOCKED") {
    return {
      allowed: false,
      classification: "BLOCKED",
      reason: `Blocked by safety policy: ${spendCheck.reason}`,
      requires_human_approval: false,
    };
  }

  if (cost > 0 || spendCheck.classification === "REQUIRES_APPROVAL") {
    return {
      allowed: false,
      classification: "REQUIRES_APPROVAL",
      reason: `Estimated cost (₹${cost} INR) exceeds autonomous ₹0 policy. Requires human spending approval.`,
      requires_human_approval: true,
    };
  }

  // 2. Safety policy checks on title/hypothesis content
  const content = `${experiment.title || ""} ${experiment.hypothesis || ""} ${experiment.channel || ""}`.toLowerCase();
  const prohibitedWords = ["spam", "scrape email", "mass dm", "cold blast", "fake account", "fake review", "unsolicited"];
  for (const word of prohibitedWords) {
    if (content.includes(word)) {
      return {
        allowed: false,
        classification: "BLOCKED",
        reason: `Experiment content violates ethical operating guidelines ("${word}" detected).`,
        requires_human_approval: false,
      };
    }
  }

  return {
    allowed: true,
    classification: "FREE",
    reason: "Experiment verified 100% compliant with ₹0 zero-spend policy and ethical safety guidelines.",
    requires_human_approval: false,
  };
}
