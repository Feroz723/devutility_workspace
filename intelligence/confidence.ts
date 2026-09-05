import type { IntelligenceConfidence } from "@/types/intelligence";

export class ConfidenceEvaluator {
  /**
   * Determine confidence level based on sample size and signal consistency
   */
  evaluateConfidence(
    sampleSize: number,
    contradictionCount: number = 0,
    options?: { minThreshold?: number; robustThreshold?: number }
  ): IntelligenceConfidence {
    const minThreshold = options?.minThreshold ?? 5;
    const robustThreshold = options?.robustThreshold ?? 30;

    if (sampleSize < minThreshold) {
      return "INSUFFICIENT_DATA";
    }

    if (contradictionCount > sampleSize * 0.4) {
      // High contradiction/noise relative to size
      return "LOW";
    }

    if (sampleSize < 15) {
      return "LOW";
    }

    if (sampleSize < robustThreshold) {
      return contradictionCount > 0 ? "LOW" : "MEDIUM";
    }

    // sampleSize >= robustThreshold
    if (contradictionCount > 5) {
      return "MEDIUM";
    }

    return "HIGH";
  }

  /**
   * Quick boolean guard for minimum data sufficiency
   */
  hasMinimumData(sampleSize: number, minRequired: number = 5): boolean {
    return sampleSize >= minRequired;
  }
}

export const confidenceEvaluator = new ConfidenceEvaluator();
