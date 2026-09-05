import { NextRequest, NextResponse } from "next/server";
import { focusManager } from "@/strategy/focus-manager";
import { listOpportunities } from "@/database/repositories/opportunity-repo";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get("is_demo") === "true";

    const focus = await focusManager.getCurrentFocus(isDemo);
    const { opportunities, total } = await listOpportunities({
      status: "new",
      limit: 50,
    });

    return NextResponse.json({
      success: true,
      current_primary_product: focus.primary_product,
      primary_focus_preserved: true,
      backlog_opportunities: opportunities,
      total_in_backlog: total,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch opportunity backlog" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const isDemo = body.is_demo === true;

    if (!body.opportunity_id) {
      return NextResponse.json({ error: "opportunity_id is required" }, { status: 400 });
    }

    const result = await focusManager.routeOpportunityToBacklog(
      body.opportunity_id,
      body.title || "Untitled Opportunity",
      isDemo
    );

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to route opportunity" }, { status: 500 });
  }
}
