import { NextRequest, NextResponse } from "next/server";
import { focusManager } from "@/strategy/focus-manager";
import { strategyRepo } from "@/database/repositories/strategy-repo";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get("is_demo") === "true";

    const focus = await focusManager.getCurrentFocus(isDemo);
    const state = await strategyRepo.getStrategicState(isDemo);

    let primaryStrategy = null;
    let actions: any[] = [];

    if (state?.primary_strategy_id) {
      primaryStrategy = await strategyRepo.getRecommendation(state.primary_strategy_id);
      if (primaryStrategy) {
        actions = await strategyRepo.listStrategyActions(primaryStrategy.id);
      }
    }

    return NextResponse.json({
      success: true,
      focus,
      state,
      primary_strategy: primaryStrategy,
      actions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch current strategic state" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const isDemo = body.is_demo === true;

    const updated = await focusManager.setPrimaryFocus({
      productId: body.product_id,
      experimentId: body.experiment_id,
      objective: body.objective,
      horizon: body.horizon,
      status: body.status,
      reason: body.reason || "Manual strategic focus update via API",
      isDemo,
    });

    return NextResponse.json({ success: true, state: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to update strategic focus" }, { status: 500 });
  }
}
