import { NextRequest, NextResponse } from "next/server";
import { decisionStateMachine } from "@/intelligence/state-machine";
import { createAuditLog } from "@/database/repositories/audit-repo";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decisionId = params.id;
    const body = await req.json().catch(() => ({}));
    const operator = body.operator || "operator";

    const updated = await decisionStateMachine.transition(decisionId, "APPROVED", {
      operator,
    });

    await createAuditLog({
      event_type: "PORTFOLIO_DECISION_APPROVED",
      entity_type: "portfolio_decision",
      entity_id: decisionId,
      actor: operator,
      details: {
        decision: updated.decision,
        subject_name: updated.subject_name,
      },
    });

    return NextResponse.json({ success: true, decision: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 400 });
  }
}
