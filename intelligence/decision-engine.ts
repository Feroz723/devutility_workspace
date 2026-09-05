import { intelligenceRepo } from "@/database/repositories/intelligence-repo";
import { evidenceCollector } from "./evidence";
import { confidenceEvaluator } from "./confidence";
import { stopRulesEvaluator } from "./stop-rules";
import { productPerformanceEvaluator } from "./product-performance";
import { channelPerformanceEvaluator } from "./channel-performance";
import { offerPerformanceEvaluator } from "./offer-performance";
import type {
  PortfolioDecision,
  DecisionRecommendation,
  DecisionEvidence,
  DecisionSubjectType,
  PortfolioDecisionType,
  IntelligenceConfidence,
} from "@/types/intelligence";
import type { DecisionEvaluationResult } from "./types";

export class PortfolioDecisionEngine {
  /**
   * Evaluate a specific subject and generate a complete, evidence-backed decision record
   */
  async evaluateSubject(
    subjectType: DecisionSubjectType,
    subjectId: string,
    subjectName: string,
    isDemo: boolean = false
  ): Promise<DecisionEvaluationResult> {
    let decisionType: PortfolioDecisionType = "MAINTAIN";
    let confidence: IntelligenceConfidence = "LOW";
    const reasons: string[] = [];
    const risks: string[] = [];
    let nextAction = "";
    let requiresApproval = false;

    // 1. Evaluate according to subject domain
    if (subjectType === "PRODUCT") {
      const perf = await productPerformanceEvaluator.evaluateProduct(subjectId, isDemo);
      const stopEval = stopRulesEvaluator.evaluateProductStopRules(perf);

      if (perf.performance_tier === "INSUFFICIENT_DATA") {
        decisionType = "RESEARCH_MORE";
        confidence = "INSUFFICIENT_DATA";
        reasons.push("Product has insufficient traffic and checkout observations.");
        nextAction = "Drive 50+ qualified visitors before re-evaluating product viability.";
      } else if (stopEval.isStopCandidate) {
        decisionType = "STOP";
        confidence = "HIGH";
        reasons.push(...stopEval.triggeredSignals);
        risks.push("Continued distribution without iteration will incur wasted attention and negative user perception.");
        nextAction = "Pause distribution; operator review required for archival.";
        requiresApproval = true;
      } else if (perf.performance_tier === "WINNER") {
        decisionType = "SCALE";
        confidence = "HIGH";
        reasons.push("High revenue velocity and strong customer retention.");
        nextAction = "Expand acquisition channels and double down on proven user pathways.";
        requiresApproval = false;
      } else if (perf.performance_tier === "PROMISING") {
        decisionType = "ITERATE";
        confidence = "MEDIUM";
        reasons.push("Good customer activation, but some onboarding friction detected.");
        nextAction = "Deploy product iteration addressing top support tickets.";
        requiresApproval = false;
      } else {
        decisionType = "CONTINUE";
        confidence = "MEDIUM";
        reasons.push("Product performance remains stable within normal operating bounds.");
        nextAction = "Continue standard maintenance cadence.";
      }
    } else if (subjectType === "CAMPAIGN") {
      const perf = await channelPerformanceEvaluator.evaluateChannel("CAMPAIGN", subjectId, isDemo);
      const stopEval = stopRulesEvaluator.evaluateChannelStopRules(perf);

      if (stopEval.isStopCandidate) {
        decisionType = "STOP";
        confidence = "HIGH";
        reasons.push(...stopEval.triggeredSignals);
        nextAction = "Halt scheduled posts on this campaign.";
        requiresApproval = true;
      } else if (perf.performance_tier === "SCALE") {
        decisionType = "SCALE";
        confidence = "HIGH";
        reasons.push("High qualified lead conversion with ₹0 expenditure.");
        nextAction = "Increase post frequency and test variant messaging.";
      } else {
        decisionType = "ITERATE";
        confidence = "MEDIUM";
        reasons.push("Visitors engaged, but conversion to signups is below 3%.");
        nextAction = "Revise landing copy and value proposition.";
      }
    } else if (subjectType === "OFFER") {
      const perf = await offerPerformanceEvaluator.evaluateOffer(subjectId, isDemo);
      if (perf.refund_rate_percent > 20) {
        decisionType = "ITERATE";
        confidence = "HIGH";
        reasons.push(`High refund rate (${perf.refund_rate_percent}%).`);
        nextAction = "Revise offer terms, expectations, or deliverables.";
        requiresApproval = true;
      } else if (perf.conversion_rate_percent > 5) {
        decisionType = "SCALE";
        confidence = "HIGH";
        reasons.push(`Checkout conversion is strong (${perf.conversion_rate_percent}%).`);
        nextAction = "Promote offer across primary channels.";
      } else {
        decisionType = "MAINTAIN";
        confidence = "MEDIUM";
        reasons.push("Conversion matches baseline expectations.");
        nextAction = "Maintain current price point.";
      }
    } else {
      // Default fallback
      decisionType = "CONTINUE";
      confidence = "LOW";
      reasons.push("Standard operational evaluation.");
      nextAction = "Continue regular monitoring.";
    }

    const decisionId = crypto.randomUUID();

    // 2. Gather verifiable evidence
    const rawEvidence = await evidenceCollector.gatherEvidenceForSubject(subjectType, subjectId, isDemo);
    const savedEvidence = await evidenceCollector.recordDecisionEvidence(decisionId, rawEvidence);

    // 3. Formulate concrete recommendations
    const recommendations: DecisionRecommendation[] = [
      {
        id: crypto.randomUUID(),
        decision_id: decisionId,
        action_type: decisionType,
        title: `${decisionType} Recommendation: ${subjectName}`,
        description: nextAction,
        priority: decisionType === "STOP" || decisionType === "SCALE" ? "HIGH" : "MEDIUM",
        expected_impact: decisionType === "SCALE" ? "Increase qualified revenue" : "Eliminate wasted effort",
        effort_estimate: "LOW",
        cost_estimate_inr: 0, // ₹0 spend boundary
        requires_approval: requiresApproval,
        status: "PENDING",
        is_demo: isDemo,
        created_at: new Date().toISOString(),
      },
    ];

    for (const rec of recommendations) {
      await intelligenceRepo.saveDecisionRecommendation(rec);
    }

    // 4. Create decision record
    const decision: PortfolioDecision = {
      id: decisionId,
      subject_type: subjectType,
      subject_id: subjectId,
      subject_name: subjectName,
      decision: decisionType,
      status: "PROPOSED",
      confidence,
      reasons,
      metrics_summary: {
        evidence_count: savedEvidence.length,
        evaluated_at: new Date().toISOString(),
      },
      risks,
      recommended_next_action: nextAction,
      requires_approval: requiresApproval,
      approved_by: null,
      approved_at: null,
      execution_status: "PENDING",
      execution_result: {},
      is_demo: isDemo,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await intelligenceRepo.saveDecision(decision);

    return {
      decision,
      recommendations,
      evidence: savedEvidence,
    };
  }
}

export const portfolioDecisionEngine = new PortfolioDecisionEngine();
