import { NextRequest, NextResponse } from "next/server";
import { ApproveInputSchema } from "@/types/approval";
import { approveApproval } from "@/database/repositories/approval-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Authentication required for approvals
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const json = await request.json().catch(() => null);
    const parsed = ApproveInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const approval = await approveApproval(params.id, parsed.data.approved_by);
    if (!approval) {
      return NextResponse.json({ error: "Approval not found" }, { status: 404 });
    }

    await createAuditLog({
      event_type: "APPROVAL_APPROVED",
      entity_type: "approval",
      entity_id: params.id,
      actor: parsed.data.approved_by,
      details: { action_type: approval.action_type },
    });

    return NextResponse.json(approval);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("Cannot approve")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
