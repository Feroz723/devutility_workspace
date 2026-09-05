import { NextRequest, NextResponse } from "next/server";
import { businessMetricsEngine } from "@/intelligence/metrics";
import { intelligenceRepo } from "@/database/repositories/intelligence-repo";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get("is_demo") === "true";
    const category = (searchParams.get("category") as any) || undefined;

    const [funnel, recordedMetrics] = await Promise.all([
      businessMetricsEngine.computeFunnelMetrics(isDemo),
      intelligenceRepo.listMetrics({ is_demo: isDemo, metric_category: category }),
    ]);

    return NextResponse.json({
      funnel,
      metrics: recordedMetrics,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
