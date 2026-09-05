import { NextRequest, NextResponse } from "next/server";
import { CreateOpportunitySchema, OpportunityFilterSchema } from "@/types/opportunity";
import { createOpportunity, listOpportunities } from "@/database/repositories/opportunity-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const filterInput: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      filterInput[key] = value;
    });

    const parsed = OpportunityFilterSchema.safeParse(filterInput);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid filter parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await listOpportunities(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API] GET /api/opportunities error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = CreateOpportunitySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const opportunity = await createOpportunity(parsed.data);

    await createAuditLog({
      event_type: "OPPORTUNITY_CREATED",
      entity_type: "opportunity",
      entity_id: opportunity.id,
      actor: "api",
      details: { title: opportunity.title, is_demo: opportunity.is_demo },
    });

    return NextResponse.json(opportunity, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API] POST /api/opportunities error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
