import { runtimeConfigManager } from "./config";

export interface ActionSafetyEvaluation {
  shouldExecute: boolean;
  isDryRun: boolean;
  isSafeMode: boolean;
  label?: "REAL" | "DRY_RUN" | "SAFE_MODE_BLOCKED";
  reason?: string;
}

export class SafeModeEngine {
  /**
   * Evaluates an intended action against global Safe Mode and Dry Run policies
   */
  async evaluateAction(action: {
    name: string;
    module: string;
    isExternalMutation?: boolean;
    costInr?: number;
  }): Promise<ActionSafetyEvaluation> {
    const config = await runtimeConfigManager.getConfig();

    // 1. Dry Run evaluation
    if (config.dry_run) {
      return {
        shouldExecute: false,
        isDryRun: true,
        isSafeMode: config.safe_mode,
        label: "DRY_RUN",
        reason: `[DRY_RUN] Action '${action.name}' would execute in module ${action.module}, but external side-effects are suppressed.`,
      };
    }

    // 2. Safe Mode evaluation
    if (config.safe_mode && action.isExternalMutation) {
      return {
        shouldExecute: false,
        isDryRun: false,
        isSafeMode: true,
        label: "SAFE_MODE_BLOCKED",
        reason: `[SAFE_MODE] External mutation '${action.name}' is blocked. Internal discovery, validation, and analytics remain active.`,
      };
    }

    return {
      shouldExecute: true,
      isDryRun: false,
      isSafeMode: config.safe_mode,
      label: "REAL",
    };
  }

  async isSafeModeActive(): Promise<boolean> {
    const config = await runtimeConfigManager.getConfig();
    return config.safe_mode;
  }

  async isDryRunActive(): Promise<boolean> {
    const config = await runtimeConfigManager.getConfig();
    return config.dry_run;
  }
}

export const safeModeEngine = new SafeModeEngine();
