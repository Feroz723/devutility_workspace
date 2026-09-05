import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { OpportunityDecision } from "@/types/opportunity";
import { getOpportunityById, updateOpportunity } from "@/database/repositories/opportunity-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";

export const dynamic = "force-dynamic";

const OverrideSchema = z.object({
  decision: OpportunityDecision,
  reason: z.string().min(3).max(1000),
  actor: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const opportunity = await getOpportunityById(params.id);
    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    const json = await request.json().catch(() => null);
    const parsed = OverrideSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid override input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { decision, reason, actor = "human_operator" } = parsed.data;

    let validationStatus = opportunity.validation_status || "UNVALIDATED";
    if (decision === "TEST_CANDIDATE" || decision === "TEST") {
      validationStatus = "TEST_CANDIDATE";
    } else if (decision === "REJECT" || decision === "BLOCKED") {
      validationStatus = "REJECTED";
    } else if (decision === "RESEARCH_MORE") {
      validationStatus = "RESEARCHING";
    } else if (decision === "REQUIRES_APPROVAL") {
      validationStatus = "REQUIRES_APPROVAL";
    }

    const updated = await updateOpportunity(params.id, {
      decision,
      validation_status: validationStatus,
      status: decision === "TEST" ? "testing" : decision === "REJECT" ? "rejected" : opportunity.status,
    });

    await createAuditLog({
      event_type: "DECISION_OVERRIDDEN",
      entity_type: "opportunity",
      entity_id: params.id,
      actor,
      details: {
        previous_decision: opportunity.decision,
        new_decision: decision,
        reason,
      },
    });

    return NextResponse.json({
      opportunity: updated,
      message: `Decision successfully overridden to ${decision} by ${actor}.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
