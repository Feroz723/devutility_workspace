import { NextRequest, NextResponse } from "next/server";
import { getOpportunityById } from "@/database/repositories/opportunity-repo";
import { getLatestValidationRun } from "@/database/repositories/validation-repo";
import { validateOpportunity } from "@/validation/engine";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const opportunity = await getOpportunityById(params.id);
    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    const latestRun = await getLatestValidationRun(params.id);
    let validation = latestRun?.result as ReturnType<typeof validateOpportunity> | undefined;

    if (!validation || !validation.preconditions) {
      validation = validateOpportunity(opportunity);
    }

    return NextResponse.json({
      decision: validation.decision,
      validation_status: validation.validation_status,
      validation_score: validation.validation_score,
      priority_score: validation.priority_score,
      preconditions: validation.preconditions,
      explanation: validation.explanation,
      categories: validation.categories,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
