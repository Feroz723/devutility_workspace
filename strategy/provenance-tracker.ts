import type { EvidenceProvenance } from "@/types/strategy";

export interface ProvenanceRecord {
  item_key: string;
  provenance: EvidenceProvenance;
  source_reference: string;
  sample_size: number;
  confidence_score: number; // 0 - 100
  notes?: string;
  timestamp: string;
}

export class ProvenanceTracker {
  /**
   * Determine evidence provenance based on source and sample size
   */
  classifyProvenance(
    source: string,
    sampleSize: number,
    isCalculated: boolean = false,
    isModelInference: boolean = false
  ): EvidenceProvenance {
    if (sampleSize <= 0 && !isCalculated && !isModelInference && !source.includes("benchmark")) {
      return "UNKNOWN";
    }
    if (isModelInference) {
      return "INFERENCE";
    }
    if (source.includes("external") || source.includes("benchmark") || source.includes("research")) {
      return "EXTERNAL_EVIDENCE";
    }
    if (isCalculated) {
      return sampleSize >= 10 ? "CALCULATED" : "UNKNOWN";
    }
    if (sampleSize >= 1) {
      return "OBSERVED";
    }
    return "UNKNOWN";
  }

  /**
   * Create a structured provenance record for any strategy input or metric
   */
  createRecord(
    itemKey: string,
    source: string,
    sampleSize: number,
    options?: {
      isCalculated?: boolean;
      isModelInference?: boolean;
      notes?: string;
    }
  ): ProvenanceRecord {
    const isCalculated = options?.isCalculated ?? false;
    const isModelInference = options?.isModelInference ?? false;
    const provenance = this.classifyProvenance(source, sampleSize, isCalculated, isModelInference);

    // Compute confidence: 0 for unknown, scaled by sample size up to 100
    let confidenceScore = 0;
    if (provenance === "OBSERVED") {
      confidenceScore = Math.min(100, Math.max(40, sampleSize * 2));
    } else if (provenance === "CALCULATED") {
      confidenceScore = Math.min(100, Math.max(30, sampleSize * 1.5));
    } else if (provenance === "EXTERNAL_EVIDENCE") {
      confidenceScore = 50;
    } else if (provenance === "INFERENCE" || provenance === "FORECAST") {
      confidenceScore = 30;
    } else {
      confidenceScore = 10;
    }

    return {
      item_key: itemKey,
      provenance,
      source_reference: source,
      sample_size: sampleSize,
      confidence_score: Math.round(confidenceScore),
      notes: options?.notes,
      timestamp: new Date().toISOString(),
    };
  }
}

export const provenanceTracker = new ProvenanceTracker();
