import { getEnv } from "@/lib/env";
import {
  type ApprovalDecision,
  type SensitiveActionRequest,
  SensitiveActionRequestSchema,
  SENSITIVE_ACTION_CATEGORIES,
  type SensitiveActionCategory
} from "./approval-types";

export const SPENDING_LIMIT_CENTS = 0;

export class SpendingLimitExceededError extends Error {
  public readonly code = "SPENDING_LIMIT_EXCEEDED";
  constructor(public readonly attemptedCents: number, public readonly limitCents: number) {
    super(
      `Refusing action costing ${attemptedCents} cents: hard spending limit is ${limitCents} cents (₹0).`
    );
  }
}

export class ApprovalRequiredError extends Error {
  public readonly code = "APPROVAL_REQUIRED";
  public readonly request: SensitiveActionRequest;
  constructor(request: SensitiveActionRequest) {
    super(
      `Action "${request.title}" requires explicit human approval before execution.`
    );
    this.request = request;
  }
}

export function isSensitiveCategory(value: string): value is SensitiveActionCategory {
  return (SENSITIVE_ACTION_CATEGORIES as readonly string[]).includes(value);
}

export interface SpendingCheckInput {
  estimatedCostCents: number;
  category: string;
}

export interface SpendingCheckResult {
  allowed: boolean;
  reason: string;
}

export function evaluateSpending(input: SpendingCheckInput): SpendingCheckResult {
  const env = getEnv();
  const limit = Math.min(env.AUTONOMOUS_SPENDING_LIMIT_CENTS, SPENDING_LIMIT_CENTS);
  if (input.estimatedCostCents > limit) {
    return {
      allowed: false,
      reason: `Cost ${input.estimatedCostCents}c exceeds hard limit ${limit}c (₹0).`
    };
  }
  return { allowed: true, reason: "Within ₹0 limit." };
}

export function buildApprovalRequest(
  input: Omit<SensitiveActionRequest, "id" | "requestedAt" | "estimatedCostCents"> & {
    estimatedCostCents?: number;
  }
): SensitiveActionRequest {
  const candidate: SensitiveActionRequest = {
    id: cryptoRandomId(),
    requestedAt: new Date().toISOString(),
    estimatedCostCents: input.estimatedCostCents ?? 0,
    ...input
  };
  return SensitiveActionRequestSchema.parse(candidate);
}

export function isDecisionValid(decision: ApprovalDecision): boolean {
  return decision.decision === "approve" || decision.decision === "reject";
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}