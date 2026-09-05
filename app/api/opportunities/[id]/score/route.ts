import { NextRequest, NextResponse } from "next/server";
import { getOpportunityById, updateOpportunity } from "@/database/repositories/opportunity-repo";
import { saveDecision, saveDecisionFactors } from "@/database/repositories/decision-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import { scoreOpportunity, ScoringInputSchema } from "@/decision-engine/scoring";

export const dynamic = "force-dynamic";

/**
 * POST /api/opportunities/:id/score
 *
 * Runs the decision engine on an opportunity:
 * 1. Validates all scores exist
 * 2. Calculates overall score using the SINGLE scoring formula
 * 3. Determines decision (TEST / RESEARCH_MORE / REJECT)
 * 4. Applies zero-spend guard override
 * 5. Saves decision + factors to DB
 * 6. Updates opportunity with score + decision
 * 7. Creates audit log
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const opportunity = await getOpportunityById(params.id);
    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    // Validate that all required scores are present
    const scoringInput = ScoringInputSchema.safeParse({
      demand_score: opportunity.demand_score,
      competition_score: opportunity.competition_score,
      monetization_score: opportunity.monetization_score,
      automation_score: opportunity.automation_score,
      zero_cost_score: opportunity.zero_cost_score,
    });

    if (!scoringInput.success) {
      return NextResponse.json(
        {
          error: "Cannot score: missing required scores",
          details: scoringInput.error.flatten(),
          hint: "Set demand_score, competition_score, monetization_score, automation_score, and zero_cost_score before running the decision engine.",
        },
        { status: 400 }
      );
    }

    // Run the scoring engine
    const result = scoreOpportunity(scoringInput.data);

    // Save decision to DB
    const decision = await saveDecision({
      opportunity_id: params.id,
      overall_score: result.overall_score,
      decision: result.decision,
      reasoning: result.requires_spend_review
        ? "Score qualifies for TEST but zero-cost score is below 50 — requires spend review. Downgraded to RESEARCH_MORE."
        : undefined,
      requires_spend: result.requires_spend_review,
      spend_override_blocked: result.requires_spend_review,
      decided_by: "decision-engine",
    });

    // Save decision factors
    await saveDecisionFactors(decision.id, result.factors);

    // Update opportunity with the score and decision
    await updateOpportunity(params.id, {
      overall_score: result.overall_score,
      decision: result.decision,
      status: result.decision === "TEST" ? "testing" :
              result.decision === "REJECT" ? "rejected" : "scored",
    });

    // Create audit log
    await createAuditLog({
      event_type: "OPPORTUNITY_SCORED",
      entity_type: "opportunity",
      entity_id: params.id,
      actor: "decision-engine",
      details: {
        overall_score: result.overall_score,
        decision: result.decision,
        requires_spend_review: result.requires_spend_review,
        factors: result.factors,
      },
    });

    await createAuditLog({
      event_type: "DECISION_CREATED",
      entity_type: "decision",
      entity_id: decision.id,
      actor: "decision-engine",
      details: {
        opportunity_id: params.id,
        overall_score: result.overall_score,
        decision: result.decision,
      },
    });

    return NextResponse.json({
      decision_id: decision.id,
      overall_score: result.overall_score,
      decision: result.decision,
      factors: result.factors,
      requires_spend_review: result.requires_spend_review,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API] POST /api/opportunities/:id/score error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
