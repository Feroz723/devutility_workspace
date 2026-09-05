import { strategyRepo } from "@/database/repositories/strategy-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import type {
  ObservationWindow,
  TimingBasis,
  WindowStatus,
} from "@/types/strategy";

export interface WindowCalculationInput {
  productId: string;
  channel?: string | null;
  actionType?: string;
  historicalDailyRate?: number | null;
  expectedConversionRate?: number | null;
  minSampleSize?: number;
  isDemo?: boolean;
}

export class ObservationWindowEngine {
  /**
   * Calculate and register a dynamic observation window
   */
  async openWindow(input: WindowCalculationInput): Promise<ObservationWindow> {
    const isDemo = input.isDemo ?? false;
    const minSample = input.minSampleSize || 30; // Minimum statistical sample required
    const now = new Date();

    let timingBasis: TimingBasis = "UNKNOWN";
    let targetDays: number | null = null;
    const waitingReasons: string[] = [];

    if (input.historicalDailyRate && input.historicalDailyRate > 0) {
      // Internal velocity known
      timingBasis = "OBSERVED_INTERNAL";
      targetDays = Math.ceil(minSample / input.historicalDailyRate);
      targetDays = Math.max(3, Math.min(30, targetDays)); // Bounded between 3 and 30 days
      waitingReasons.push(`Waiting to accumulate ${minSample} samples at observed rate of ${input.historicalDailyRate}/day`);
    } else if (input.expectedConversionRate && input.expectedConversionRate > 0) {
      timingBasis = "STATISTICAL_ESTIMATE";
      targetDays = 14; // Standard default 2-week testing window
      waitingReasons.push(`Estimated 14-day window based on statistical benchmark rate of ${(input.expectedConversionRate * 100).toFixed(1)}%`);
    } else {
      // Velocity completely unknown
      timingBasis = "UNKNOWN";
      targetDays = 7; // Default initial exploratory exposure window
      waitingReasons.push("Conversion velocity unknown; initial 7-day exploratory observation window");
    }

    const targetReviewDate = new Date(now.getTime() + targetDays * 24 * 60 * 60 * 1000).toISOString();

    const window = await strategyRepo.createObservationWindow({
      product_id: input.productId,
      channel: input.channel || null,
      window_start: now.toISOString(),
      target_review_date: targetReviewDate,
      min_sample_size_required: minSample,
      actual_sample_size_collected: 0,
      timing_basis: timingBasis,
      window_status: timingBasis === "UNKNOWN" ? "TIMING_UNKNOWN" : "IN_PROGRESS",
      waiting_reasons: waitingReasons,
      next_decision_preview: "Assess conversion rate and funnel throughput upon window maturity",
      is_demo: isDemo,
    });

    await createAuditLog({
      event_type: "OBSERVATION_WINDOW_UPDATED",
      entity_type: "STRATEGY_OBSERVATION",
      entity_id: window.id,
      actor: "observation_window_engine",
      details: {
        product_id: input.productId,
        channel: input.channel,
        timing_basis: timingBasis,
        target_review_date: targetReviewDate,
        min_sample_size_required: minSample,
      },
    });

    return window;
  }

  /**
   * Update and evaluate progress of observation windows
   */
  async evaluateWindow(
    windowId: string,
    currentSamples: number,
    isDemo: boolean = false
  ): Promise<ObservationWindow> {
    const window = await strategyRepo.getObservationWindow(windowId);
    if (!window) throw new Error(`Observation window ${windowId} not found`);

    const now = new Date();
    const targetDate = window.target_review_date ? new Date(window.target_review_date) : null;
    const isPastTarget = targetDate ? now >= targetDate : false;

    let newStatus: WindowStatus = window.window_status;
    const reasons = [...(window.waiting_reasons || [])];

    if (currentSamples >= window.min_sample_size_required) {
      newStatus = "MATURE";
      reasons.push(`Minimum sample size (${currentSamples}/${window.min_sample_size_required}) achieved.`);
    } else if (isPastTarget) {
      if (currentSamples < 10) {
        newStatus = "INSUFFICIENT_EXPOSURE";
        reasons.push(`Window reached target date, but exposure is too low (${currentSamples} samples) for valid inference.`);
      } else {
        newStatus = "MATURE";
        reasons.push(`Target duration reached with ${currentSamples} samples.`);
      }
    } else {
      newStatus = window.timing_basis === "UNKNOWN" ? "TIMING_UNKNOWN" : "IN_PROGRESS";
    }

    const updated = await strategyRepo.updateObservationWindow(windowId, {
      actual_sample_size_collected: currentSamples,
      window_status: newStatus,
      waiting_reasons: reasons,
    });

    return updated!;
  }
}

export const observationWindowEngine = new ObservationWindowEngine();
