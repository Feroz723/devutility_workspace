import { queryMany } from "@/database/client";
import { intelligenceRepo } from "@/database/repositories/intelligence-repo";
import type { BusinessLearning, LearningCategory } from "@/types/intelligence";

export class BusinessLearningEngine {
  /**
   * Harvest insights across experiments, channels, and customer success into organizational memory
   */
  async harvestLearnings(isDemo: boolean = false): Promise<BusinessLearning[]> {
    const learnings: BusinessLearning[] = [];

    // 1. Learnings from Completed / Validated Experiments
    const validatedExps = await queryMany<any>(
      `SELECT name, hypothesis, conclusion, confidence_score
       FROM experiments
       WHERE status = 'COMPLETED' AND confidence_score >= 70 AND is_demo = $1`,
      [isDemo]
    );

    for (const exp of validatedExps) {
      learnings.push({
        id: crypto.randomUUID(),
        source_phase: "PHASE_4_EXPERIMENTATION",
        category: "WHAT_WORKED",
        title: `Validated Hypothesis: ${exp.name}`,
        summary: `Experiment succeeded with confidence ${exp.confidence_score}%.`,
        why: `Core assumption verified: ${exp.hypothesis}`,
        evidence: exp.conclusion || "High statistical significance in trial variant.",
        confidence: "HIGH",
        recommended_action: "Incorporate winning variant into standard production baseline.",
        tags: ["EXPERIMENT", "OPTIMIZATION"],
        is_demo: isDemo,
        created_at: new Date().toISOString(),
      });
    }

    // 2. Learnings from Failed Experiments
    const failedExps = await queryMany<any>(
      `SELECT name, hypothesis, conclusion
       FROM experiments
       WHERE status = 'FAILED' AND is_demo = $1`,
      [isDemo]
    );

    for (const exp of failedExps) {
      learnings.push({
        id: crypto.randomUUID(),
        source_phase: "PHASE_4_EXPERIMENTATION",
        category: "WHAT_FAILED",
        title: `Disproven Hypothesis: ${exp.name}`,
        summary: `Experiment failed to achieve target lift: ${exp.hypothesis}`,
        why: "Customer interaction did not support the initial assumption.",
        evidence: exp.conclusion || "Variant showed flat or negative conversion vs control.",
        confidence: "HIGH",
        recommended_action: "Do not repeat this testing approach; pivot hypothesis angle.",
        tags: ["EXPERIMENT", "AVOID_REPETITION"],
        is_demo: isDemo,
        created_at: new Date().toISOString(),
      });
    }

    // 3. Learnings from Top Distribution Channels
    const topChannels = await queryMany<any>(
      `SELECT channel_type, qualified_leads_count, revenue_inr
       FROM channel_performance
       WHERE performance_tier = 'SCALE' AND is_demo = $1`,
      [isDemo]
    );

    for (const ch of topChannels) {
      learnings.push({
        id: crypto.randomUUID(),
        source_phase: "PHASE_7_DISTRIBUTION",
        category: "WHAT_WORKED",
        title: `High-Yield Channel: ${ch.channel_type}`,
        summary: `Channel generated ${ch.qualified_leads_count} qualified leads and ₹${ch.revenue_inr} revenue with ₹0 spend.`,
        why: "Audience resonance with technical/product-led content is strongly positive.",
        evidence: `Channel performance records confirm SCALE tier status.`,
        confidence: "HIGH",
        recommended_action: `Increase organic post frequency on ${ch.channel_type}.`,
        tags: ["DISTRIBUTION", "ORGANIC", ch.channel_type],
        is_demo: isDemo,
        created_at: new Date().toISOString(),
      });
    }

    // Persist all harvested learnings
    for (const item of learnings) {
      await intelligenceRepo.saveLearning(item);
    }

    return learnings;
  }
}

export const businessLearningEngine = new BusinessLearningEngine();
