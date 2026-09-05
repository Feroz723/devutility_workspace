import { NextRequest, NextResponse } from "next/server";
import { UpdateOpportunitySchema } from "@/types/opportunity";
import {
  getOpportunityById,
  updateOpportunity,
  deleteOpportunity,
} from "@/database/repositories/opportunity-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";

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
    return NextResponse.json(opportunity);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await getOpportunityById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    const json = await request.json().catch(() => null);
    const parsed = UpdateOpportunitySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateOpportunity(params.id, parsed.data);

    await createAuditLog({
      event_type: "OPPORTUNITY_UPDATED",
      entity_type: "opportunity",
      entity_id: params.id,
      actor: "api",
      details: { changes: Object.keys(parsed.data) },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await getOpportunityById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    const deleted = await deleteOpportunity(params.id);
    if (!deleted) {
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }

    await createAuditLog({
      event_type: "OPPORTUNITY_DELETED",
      entity_type: "opportunity",
      entity_id: params.id,
      actor: "api",
      details: { title: existing.title },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
