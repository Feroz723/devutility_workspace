import type { SafetyClassification } from "@/types/operations";

export interface SafetyCheckResult {
  isSafe: boolean;
  classification: SafetyClassification;
  reasons: string[];
  requiresApproval: boolean;
  blocked: boolean;
}

const FORBIDDEN_CONTENT_PATTERNS = [
  /buy\s+followers/i,
  /fake\s+reviews?/i,
  /fake\s+engagement/i,
  /mass\s+unsolicited/i,
  /spam\s+outreach/i,
  /impersonat(e|ion)/i,
  /deceptive/i,
  /bypass\s+safety/i,
];

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /system\s+prompt\s+override/i,
  /disregard\s+the\s+above/i,
  /you\s+are\s+now\s+in\s+developer\s+mode/i,
  /reveal\s+your\s+api\s+key/i,
  /output\s+all\s+environment\s+variables/i,
];

export class OperationsSafetyGuard {
  /**
   * Evaluates an intended action against global ₹0 spend rules and safety constraints
   */
  evaluateSafety(action: {
    name: string;
    estimatedCostInr?: number;
    content?: string;
    actionType?: string;
  }): SafetyCheckResult {
    const reasons: string[] = [];
    const cost = action.estimatedCostInr ?? 0;
    const content = action.content || "";

    // 1. Prohibited spam / fake activity check
    for (const pattern of FORBIDDEN_CONTENT_PATTERNS) {
      if (pattern.test(content) || pattern.test(action.name)) {
        return {
          isSafe: false,
          classification: "PROHIBITED",
          reasons: ["Action involves prohibited activities (spam, fake reviews, or deceptive engagement)."],
          requiresApproval: false,
          blocked: true,
        };
      }
    }

    // 2. Prompt injection defense against untrusted external inputs
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(content)) {
        return {
          isSafe: false,
          classification: "PROHIBITED",
          reasons: ["Untrusted content contains detected prompt injection attempt. Blocked from execution."],
          requiresApproval: false,
          blocked: true,
        };
      }
    }

    // 3. Strict ₹0 Automatic Spending Boundary
    if (cost > 0) {
      reasons.push(`Action requires financial spend (₹${cost}). Exceeds automatic limit of ₹0.`);
      return {
        isSafe: false,
        classification: "FINANCIAL_APPROVAL",
        reasons,
        requiresApproval: true,
        blocked: false,
      };
    }

    // 4. Sensitive review
    if (action.actionType?.includes("DEPLOY") || action.actionType?.includes("PUBLISH_PAID")) {
      return {
        isSafe: true,
        classification: "SENSITIVE_REVIEW",
        reasons: ["Action requires operator review prior to release."],
        requiresApproval: true,
        blocked: false,
      };
    }

    return {
      isSafe: true,
      classification: "ZERO_COST_AUTO",
      reasons: ["Compliant with zero-spend policy and safety rules."],
      requiresApproval: false,
      blocked: false,
    };
  }

  /**
   * Sanitizes untrusted strings to neutralize potential injection payloads
   */
  sanitizeUntrustedInput(text: string): string {
    if (!text) return "";
    let cleaned = text;
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      cleaned = cleaned.replace(pattern, "[PROMPT_INJECTION_FILTERED]");
    }
    return cleaned;
  }

  /**
   * Synchronously validates an action payload against zero-spend and safety rules
   */
  validateActionSync(action: {
    actionType?: string;
    category?: string;
    targetEntity?: string;
    costInr?: number;
    estimatedCostInr?: number;
    content?: string;
  }): {
    allowed: boolean;
    violations: Array<{ code: string; message: string }>;
  } {
    const cost = action.costInr ?? action.estimatedCostInr ?? 0;
    const violations: Array<{ code: string; message: string }> = [];

    if (cost > 0) {
      violations.push({
        code: "SPEND_EXCEEDS_ZERO",
        message: `Action requires financial spend (₹${cost}). Automated spending > ₹0 is strictly prohibited.`,
      });
    }

    const safetyResult = this.evaluateSafety({
      name: action.targetEntity || action.actionType || "Action",
      estimatedCostInr: cost,
      content: action.content,
      actionType: action.actionType,
    });

    if (safetyResult.blocked) {
      violations.push({
        code: safetyResult.classification,
        message: safetyResult.reasons.join(" "),
      });
    }

    return {
      allowed: violations.length === 0,
      violations,
    };
  }

  /**
   * Asynchronously validates an action, including checking dynamic system state (kill switch)
   */
  async validateAction(action: {
    actionType?: string;
    category?: string;
    targetEntity?: string;
    costInr?: number;
    estimatedCostInr?: number;
    content?: string;
  }): Promise<{
    allowed: boolean;
    violations: Array<{ code: string; message: string }>;
  }> {
    const syncCheck = this.validateActionSync(action);
    const violations = [...syncCheck.violations];

    try {
      const { operationsRepo } = await import("@/database/repositories/operations-repo");
      const state = await operationsRepo.getSystemState();
      if (state.is_kill_switch_active) {
        violations.push({
          code: "KILL_SWITCH_ACTIVE",
          message: `Emergency kill switch is engaged: ${state.kill_switch_reason || "Halted by operator"}. Action blocked.`,
        });
      }
    } catch {
      // Fallback if db offline
    }

    return {
      allowed: violations.length === 0,
      violations,
    };
  }
}

export const operationsSafetyGuard = new OperationsSafetyGuard();
