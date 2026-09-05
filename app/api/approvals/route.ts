import { NextRequest, NextResponse } from "next/server";
import { CreateApprovalSchema } from "@/types/approval";
import { createApproval, listApprovals } from "@/database/repositories/approval-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? undefined;
    const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : undefined;
    const offset = url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")!) : undefined;

    const result = await listApprovals({ status, limit, offset });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = CreateApprovalSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const approval = await createApproval(parsed.data);

    await createAuditLog({
      event_type: "APPROVAL_REQUESTED",
      entity_type: "approval",
      entity_id: approval.id,
      actor: parsed.data.requested_by ?? "system",
      details: {
        action_type: approval.action_type,
        estimated_cost_inr: approval.estimated_cost_inr,
      },
    });

    return NextResponse.json(approval, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
