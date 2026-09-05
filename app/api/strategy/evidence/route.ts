import { NextRequest, NextResponse } from "next/server";
import { funnelAnalysisEngine } from "@/strategy/funnel-analysis-engine";
import { strategyRepo } from "@/database/repositories/strategy-repo";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get("is_demo") === "true";
    const productId = searchParams.get("product_id") || undefined;

    let funnelStages = await strategyRepo.getLatestFunnelStages(productId, isDemo);
    if (funnelStages.length === 0) {
      funnelStages = await funnelAnalysisEngine.analyzeFunnel(productId, isDemo);
    }

    const observationWindows = await strategyRepo.listObservationWindows(productId, isDemo);

    return NextResponse.json({
      success: true,
      funnel_stages: funnelStages,
      observation_windows: observationWindows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch evidence and funnel data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const isDemo = body.is_demo === true;
    const productId = body.product_id || null;

    const stages = await funnelAnalysisEngine.analyzeFunnel(productId, isDemo);
    return NextResponse.json({ success: true, funnel_stages: stages });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to analyze business funnel" }, { status: 500 });
  }
}
