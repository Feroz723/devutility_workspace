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
    if (latestRun && latestRun.result && Object.keys(latestRun.result).length > 0) {
      return NextResponse.json({
        run: latestRun,
        validation: latestRun.result,
        opportunity,
      });
    }

    // If no run exists, compute dynamically
    const validation = validateOpportunity(opportunity);
    return NextResponse.json({
      run: null,
      validation,
      opportunity,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
