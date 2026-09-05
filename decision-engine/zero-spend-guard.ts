/**
 * Zero-Spend Guard — Action Classification
 * ==========================================
 * Every externally executable action must pass through this guard.
 * The AI must never be able to override this policy.
 */

export type SpendClassification = "FREE" | "REQUIRES_APPROVAL" | "BLOCKED";

export interface SpendGuardInput {
  estimated_cost_inr: number;
  is_reversible: boolean;
  is_sensitive: boolean;
  action_type: string;
  description: string;
}

export interface SpendGuardResult {
  classification: SpendClassification;
  reason: string;
  requires_human_approval: boolean;
}

// Actions that are ALWAYS blocked regardless of cost
const BLOCKED_ACTION_TYPES = new Set([
  "illegal",
  "fraudulent",
  "malicious",
  "deceptive",
  "prohibited",
  "spam",
  "harassment",
  "impersonation",
]);

// Actions that always require approval even at ₹0
const SENSITIVE_ACTION_TYPES = new Set([
  "domain_purchase",
  "subscription",
  "advertising",
  "financial_transaction",
  "account_deletion",
  "data_export",
  "api_key_creation",
  "external_api_call",
  "irreversible_external",
]);

/**
 * Classify an action through the zero-spend guard.
 *
 * Rules:
 *   - ₹0 + safe + reversible = FREE
 *   - Any spending > ₹0 = REQUIRES_APPROVAL
 *   - Sensitive or irreversible actions = REQUIRES_APPROVAL
 *   - Illegal, fraudulent, malicious, deceptive, or prohibited = BLOCKED
 */
export function classifyAction(input: SpendGuardInput): SpendGuardResult {
  const actionLower = input.action_type.toLowerCase();

  // Step 1: Check for blocked actions
  for (const blocked of BLOCKED_ACTION_TYPES) {
    if (actionLower.includes(blocked)) {
      return {
        classification: "BLOCKED",
        reason: `Action type "${input.action_type}" is prohibited and permanently blocked.`,
        requires_human_approval: false,
      };
    }
  }

  // Step 2: Any spending > ₹0 requires approval
  if (input.estimated_cost_inr > 0) {
    return {
      classification: "REQUIRES_APPROVAL",
      reason: `Action costs ₹${input.estimated_cost_inr}. All spending requires human approval (spending limit: ₹0).`,
      requires_human_approval: true,
    };
  }

  // Step 3: Sensitive or irreversible actions require approval even at ₹0
  if (input.is_sensitive || !input.is_reversible) {
    return {
      classification: "REQUIRES_APPROVAL",
      reason: input.is_sensitive
        ? `Sensitive action "${input.action_type}" requires human approval.`
        : `Irreversible action "${input.action_type}" requires human approval.`,
      requires_human_approval: true,
    };
  }

  // Step 4: Check against known sensitive action types
  for (const sensitive of SENSITIVE_ACTION_TYPES) {
    if (actionLower.includes(sensitive)) {
      return {
        classification: "REQUIRES_APPROVAL",
        reason: `Action type "${input.action_type}" is classified as sensitive and requires human approval.`,
        requires_human_approval: true,
      };
    }
  }

  // Step 5: ₹0 + safe + reversible = FREE
  return {
    classification: "FREE",
    reason: "Action is free, safe, and reversible. No approval needed.",
    requires_human_approval: false,
  };
}
