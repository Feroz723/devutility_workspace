import { NextRequest, NextResponse } from "next/server";
import { getOpportunityById, updateOpportunity } from "@/database/repositories/opportunity-repo";
import { createValidationRun, updateValidationRun } from "@/database/repositories/validation-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import { validateOpportunity } from "@/validation/engine";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const opportunity = await getOpportunityById(params.id);
    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    const run = await createValidationRun({
      opportunity_id: params.id,
      evidence_analyzed: opportunity.evidence_count ?? 0,
      sources_analyzed: opportunity.source_count ?? 0,
    });

    const validationResult = validateOpportunity(opportunity);

    await updateValidationRun(run.id, {
      status: "COMPLETED",
      evidence_analyzed: opportunity.evidence_count ?? 0,
      sources_analyzed: opportunity.source_count ?? 0,
      validation_score: validationResult.validation_score,
      confidence: validationResult.confidence,
      decision: validationResult.decision,
      result: validationResult as unknown as Record<string, unknown>,
    });

    const updated = await updateOpportunity(params.id, {
      validation_score: validationResult.validation_score,
      priority_score: validationResult.priority_score,
      validation_status: validationResult.validation_status,
      decision: validationResult.decision,
      customer_profile: validationResult.customer_profile,
      proposed_solution: validationResult.proposed_solution,
      experiment_proposal: validationResult.experiment_proposal,
    });

    await createAuditLog({
      event_type: "OPPORTUNITY_VALIDATED",
      entity_type: "opportunity",
      entity_id: params.id,
      actor: "validation_engine",
      details: {
        validation_score: validationResult.validation_score,
        priority_score: validationResult.priority_score,
        decision: validationResult.decision,
      },
    });

    return NextResponse.json({
      run_id: run.id,
      opportunity: updated,
      validation: validationResult,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
