import { queryMany } from "@/database/client";

export interface OpportunityFeedbackItem {
  source_type: "SUPPORT" | "CHURN" | "EXPERIMENT" | "OFFER_CONVERSION";
  title: string;
  recommended_research_area: string;
  evidence_summary: string;
  suggested_action: "CREATE_OPPORTUNITY" | "ADJUST_EXISTING_OPPORTUNITY" | "INVALIDATE_HYPOTHESIS";
  related_opportunity_id?: string;
}

export class OpportunityFeedbackLoop {
  /**
   * Scan customer friction and sales objections to generate new opportunity insights
   */
  async generateOpportunityFeedback(isDemo: boolean = false): Promise<OpportunityFeedbackItem[]> {
    const feedback: OpportunityFeedbackItem[] = [];

    // 1. Churn reasons feedback
    const churnReasons = await queryMany<any>(
      `SELECT cancellation_reason, COUNT(id) as count
       FROM subscriptions
       WHERE status = 'CANCELLED' AND cancellation_reason IS NOT NULL AND is_demo = $1
       GROUP BY cancellation_reason
       ORDER BY count DESC
       LIMIT 3`,
      [isDemo]
    );

    for (const row of churnReasons) {
      feedback.push({
        source_type: "CHURN",
        title: `Churn Objection: ${row.cancellation_reason}`,
        recommended_research_area: `Investigate alternative workflows addressing: ${row.cancellation_reason}`,
        evidence_summary: `${row.count} customer cancellation(s) cited this reason.`,
        suggested_action: "CREATE_OPPORTUNITY",
      });
    }

    // 2. Feature Requests with high demand
    const topRequests = await queryMany<any>(
      `SELECT title, description, upvotes_count
       FROM feature_requests
       WHERE is_demo = $1
       ORDER BY upvotes_count DESC
       LIMIT 3`,
      [isDemo]
    );

    for (const req of topRequests) {
      feedback.push({
        source_type: "SUPPORT",
        title: `Unmet Market Demand: ${req.title}`,
        recommended_research_area: `Evaluate market size for standalone tool or expansion: ${req.title}`,
        evidence_summary: `Direct user request with ${req.upvotes_count || 1} upvote(s).`,
        suggested_action: "CREATE_OPPORTUNITY",
      });
    }

    // 3. Failed experiments
    const failedExp = await queryMany<any>(
      `SELECT name, hypothesis, conclusion
       FROM experiments
       WHERE status = 'FAILED' AND is_demo = $1
       LIMIT 3`,
      [isDemo]
    );

    for (const exp of failedExp) {
      feedback.push({
        source_type: "EXPERIMENT",
        title: `Invalidated Hypothesis: ${exp.name}`,
        recommended_research_area: `Pivot away from failed assumption: ${exp.hypothesis}`,
        evidence_summary: exp.conclusion || "Experiment outcome disproved hypothesis.",
        suggested_action: "INVALIDATE_HYPOTHESIS",
      });
    }

    return feedback;
  }
}

export const opportunityFeedbackLoop = new OpportunityFeedbackLoop();
