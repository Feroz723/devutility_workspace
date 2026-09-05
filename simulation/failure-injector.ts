import type { FaultTarget, FaultInjectionRule } from "@/types/reality-test";

export interface FaultHistoryRecord {
  target: FaultTarget;
  failureType: string;
  errorMessage: string;
  timestamp: string;
  handledSafely: boolean;
  fallbackUsed: boolean;
}

export class FailureInjector {
  private rules: Map<FaultTarget, FaultInjectionRule> = new Map();
  private faultHistory: FaultHistoryRecord[] = [];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.rules.clear();
    this.faultHistory = [];
  }

  /**
   * Configure or toggle a fault injection rule for a specific system component.
   */
  setRule(rule: FaultInjectionRule): void {
    if (rule.enabled) {
      this.rules.set(rule.target, rule);
    } else {
      this.rules.delete(rule.target);
    }
  }

  /**
   * Check if a fault is active for a target.
   */
  isFaultActive(target: FaultTarget): boolean {
    const rule = this.rules.get(target);
    return Boolean(rule && rule.enabled);
  }

  /**
   * Get the active fault rule for a target.
   */
  getRule(target: FaultTarget): FaultInjectionRule | undefined {
    return this.rules.get(target);
  }

  /**
   * Intercept an asynchronous operation. If a fault is injected for the target,
   * trigger the fault (throwing or executing fallback) and record the occurrence.
   */
  async intercept<T>(
    target: FaultTarget,
    operation: () => Promise<T>,
    fallback?: () => Promise<T> | T
  ): Promise<T> {
    const rule = this.rules.get(target);

    if (rule && rule.enabled) {
      const errorMsg = rule.errorMessage || `[FAULT_INJECTED] Simulated failure on target: ${target}`;

      if (rule.latencyMs && rule.latencyMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, rule.latencyMs));
      }

      if (fallback) {
        const result = await fallback();
        this.faultHistory.push({
          target,
          failureType: rule.failureType,
          errorMessage: errorMsg,
          timestamp: new Date().toISOString(),
          handledSafely: true,
          fallbackUsed: true,
        });
        return result;
      }

      this.faultHistory.push({
        target,
        failureType: rule.failureType,
        errorMessage: errorMsg,
        timestamp: new Date().toISOString(),
        handledSafely: true,
        fallbackUsed: false,
      });

      throw new Error(errorMsg);
    }

    return await operation();
  }

  /**
   * Intercept a synchronous operation.
   */
  interceptSync<T>(
    target: FaultTarget,
    operation: () => T,
    fallback?: () => T
  ): T {
    const rule = this.rules.get(target);

    if (rule && rule.enabled) {
      const errorMsg = rule.errorMessage || `[FAULT_INJECTED] Simulated failure on target: ${target}`;

      if (fallback) {
        const result = fallback();
        this.faultHistory.push({
          target,
          failureType: rule.failureType,
          errorMessage: errorMsg,
          timestamp: new Date().toISOString(),
          handledSafely: true,
          fallbackUsed: true,
        });
        return result;
      }

      this.faultHistory.push({
        target,
        failureType: rule.failureType,
        errorMessage: errorMsg,
        timestamp: new Date().toISOString(),
        handledSafely: true,
        fallbackUsed: false,
      });

      throw new Error(errorMsg);
    }

    return operation();
  }

  /**
   * Retrieve fault occurrence history.
   */
  getHistory(): FaultHistoryRecord[] {
    return [...this.faultHistory];
  }

  /**
   * Clear recorded history.
   */
  clearHistory(): void {
    this.faultHistory = [];
  }
}

export const failureInjector = new FailureInjector();
