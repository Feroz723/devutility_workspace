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
    const operator = body.operator || "system";

    // 1. Transition to EXECUTING
    await decisionStateMachine.transition(decisionId, "EXECUTING", {
      operator,
      executionStatus: "RUNNING",
    });

    // 2. Perform zero-cost operational execution action
    const executionResult = {
      executed_at: new Date().toISOString(),
      action_applied: true,
      executor: operator,
    };

    // 3. Transition to COMPLETED
    const completed = await decisionStateMachine.transition(decisionId, "COMPLETED", {
      operator,
      executionStatus: "SUCCESS",
      executionResult,
    });

    await createAuditLog({
      event_type: "PORTFOLIO_DECISION_EXECUTED",
      entity_type: "portfolio_decision",
      entity_id: decisionId,
      actor: operator,
      details: {
        decision: completed.decision,
        subject_name: completed.subject_name,
        result: executionResult,
      },
    });

    return NextResponse.json({ success: true, decision: completed });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 400 });
  }
}
