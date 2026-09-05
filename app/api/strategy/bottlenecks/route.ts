import { NextRequest, NextResponse } from "next/server";
import { strategyRepo } from "@/database/repositories/strategy-repo";
import { bottleneckDetector } from "@/strategy/bottleneck-detector";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get("is_demo") === "true";
    const isPrimary = searchParams.get("is_primary") === "true" ? true : undefined;
    const isResolved = searchParams.get("is_resolved") === "true" ? true : false;
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    let bottlenecks = await strategyRepo.listBottlenecks({
      isPrimary,
      isResolved,
      isDemo,
      limit,
    });

    if (bottlenecks.length === 0) {
      bottlenecks = await bottleneckDetector.detectBottlenecks(null, isDemo);
    }

    return NextResponse.json({ success: true, bottlenecks });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch bottlenecks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const isDemo = body.is_demo === true;
    const productId = body.product_id || null;

    const bottlenecks = await bottleneckDetector.detectBottlenecks(productId, isDemo);
    return NextResponse.json({ success: true, bottlenecks });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to scan bottlenecks" }, { status: 500 });
  }
}
