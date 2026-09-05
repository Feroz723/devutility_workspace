import { NextRequest, NextResponse } from "next/server";
import { RejectInputSchema } from "@/types/approval";
import { rejectApproval } from "@/database/repositories/approval-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const json = await request.json().catch(() => null);
    const parsed = RejectInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const approval = await rejectApproval(
      params.id,
      parsed.data.rejected_by,
      parsed.data.rejection_reason
    );
    if (!approval) {
      return NextResponse.json({ error: "Approval not found" }, { status: 404 });
    }

    await createAuditLog({
      event_type: "APPROVAL_REJECTED",
      entity_type: "approval",
      entity_id: params.id,
      actor: parsed.data.rejected_by,
      details: {
        action_type: approval.action_type,
        rejection_reason: parsed.data.rejection_reason,
      },
    });

    return NextResponse.json(approval);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("Cannot reject")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
