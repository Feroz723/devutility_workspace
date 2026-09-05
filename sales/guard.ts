import { logAudit } from "@/database/repositories/audit-repo";

export interface SalesGuardCheckResult {
  allowed: boolean;
  reason?: string;
  violations: string[];
}

export class SalesGuard {
  /**
   * Enforces zero-cost budget constraint for sales operations.
   * System must never incur unexpected financial costs for software or services.
   */
  static validateExpenseAttempt(expenseAmountCents: number, description: string): SalesGuardCheckResult {
    const violations: string[] = [];

    if (expenseAmountCents > 0) {
      violations.push(`Autonomous system budget policy forbids automated financial outflow: attempted ${expenseAmountCents} cents for ${description}`);
    }

    const allowed = violations.length === 0;

    if (!allowed) {
      logAudit({
        event_type: "SALES_ACTION_BLOCKED",
        entity_type: "SALES_GUARD",
        entity_id: "budget_check",
        actor: "system",
        details: { description, expenseAmountCents, violations },
      }).catch(() => null);
    }

    return {
      allowed,
      reason: allowed ? undefined : violations.join("; "),
      violations,
    };
  }

  /**
   * Enforces that paid orders cannot be fulfilled or marked paid without verified payment confirmation.
   */
  static validatePaymentFulfillment(order: { is_free?: boolean; total_amount_cents: number; status: string }, payment?: { status: string }): SalesGuardCheckResult {
    const violations: string[] = [];

    if (order.is_free || order.total_amount_cents === 0) {
      // Free orders are always allowed to fulfill immediately
      return { allowed: true, violations: [] };
    }

    if (!payment) {
      violations.push("Cannot fulfill paid order without an associated payment record");
    } else if (payment.status !== "CAPTURED") {
      violations.push(`Payment must be CAPTURED before order fulfillment. Current status: ${payment.status}`);
    }

    const allowed = violations.length === 0;

    if (!allowed) {
      logAudit({
        event_type: "SALES_ACTION_BLOCKED",
        entity_type: "ORDER",
        entity_id: "order_fulfillment_guard",
        actor: "system",
        details: { order, paymentStatus: payment?.status, violations },
      }).catch(() => null);
    }

    return {
      allowed,
      reason: allowed ? undefined : violations.join("; "),
      violations,
    };
  }

  /**
   * Enforces that demo records are quarantined and flagged properly.
   */
  static sanitizeDemoFlag(isDemo: boolean | undefined, environment = process.env.NODE_ENV): boolean {
    if (isDemo === true) return true;
    if (environment === "test") return true;
    return false;
  }
}
