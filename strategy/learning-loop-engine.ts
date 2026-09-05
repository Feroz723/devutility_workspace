import { strategyRepo } from "@/database/repositories/strategy-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import type { StrategyMemory, StrategyConfidence } from "@/types/strategy";

export class LearningLoopEngine {
  /**
   * Record initial expected outcome before or during strategy action execution
   */
  async recordExpectation(input: {
    strategyId?: string | null;
    actionName: string;
    conditionsDescription: string;
    expectedOutcome: string;
    confidence: StrategyConfidence;
    isDemo?: boolean;
  }): Promise<StrategyMemory> {
    const isDemo = input.isDemo ?? false;
    return strategyRepo.createMemory({
      strategy_id: input.strategyId || null,
      action_name: input.actionName,
      conditions_description: input.conditionsDescription,
      expected_outcome: input.expectedOutcome,
      actual_outcome: null,
      variance_analysis: null,
      learnings: [],
      confidence: input.confidence,
      is_demo: isDemo,
    });
  }

  /**
   * Complete memory record with actual outcome and compute variance analysis
   */
  async recordOutcomeAndLearn(
    memoryId: string,
    actualOutcome: string,
    observedMetrics?: Record<string, any>
  ): Promise<StrategyMemory> {
    const memory = await strategyRepo.getMemoryById(memoryId);
    if (!memory) throw new Error(`Memory record ${memoryId} not found`);

    // Analyze variance between expected outcome and actual outcome
    const expected = memory.expected_outcome.toLowerCase();
    const actual = actualOutcome.toLowerCase();

    const learnings: Array<{ insight: string; confidence: string; timestamp: string }> = [];

    let varianceAnalysis = "";
    if (actual.includes("error") || actual.includes("fail") || actual.includes("0")) {
      varianceAnalysis = `Negative variance observed. Expected "${memory.expected_outcome}" but encountered "${actualOutcome}".`;
      learnings.push({
        insight: "Action encountered friction or zero-conversion outcome. Preconditions must be re-verified.",
        confidence: "HIGH",
        timestamp: new Date().toISOString(),
      });
    } else {
      varianceAnalysis = `Positive/neutral alignment. Expected "${memory.expected_outcome}", achieved "${actualOutcome}".`;
      learnings.push({
        insight: "Action successfully moved needle within acceptable expectation parameters.",
        confidence: "HIGH",
        timestamp: new Date().toISOString(),
      });
    }

    if (observedMetrics) {
      learnings.push({
        insight: `Empirical observations recorded: ${JSON.stringify(observedMetrics)}`,
        confidence: "HIGH",
        timestamp: new Date().toISOString(),
      });
    }

    const updated = await strategyRepo.updateMemory(memoryId, {
      actual_outcome: actualOutcome,
      variance_analysis: varianceAnalysis,
      learnings: learnings,
    });

    await createAuditLog({
      event_type: "STRATEGY_LEARNING_RECORDED",
      entity_type: "STRATEGY_MEMORY",
      entity_id: memoryId,
      actor: "learning_loop_engine",
      details: {
        action_name: memory.action_name,
        variance_analysis: varianceAnalysis,
        learnings_count: learnings.length,
      },
    });

    return updated!;
  }
}

export const learningLoopEngine = new LearningLoopEngine();
