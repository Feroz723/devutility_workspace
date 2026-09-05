import { NextRequest, NextResponse } from "next/server";
import { intelligenceRepo } from "@/database/repositories/intelligence-repo";
import { businessSnapshotAggregator } from "@/intelligence/snapshot";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get("is_demo") === "true";
    const all = searchParams.get("all") === "true";
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    if (all) {
      const snapshots = await intelligenceRepo.listSnapshots({ is_demo: isDemo, limit });
      return NextResponse.json({ snapshots });
    }

    const latest = await intelligenceRepo.getLatestSnapshot({ is_demo: isDemo });
    return NextResponse.json({ snapshot: latest });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const isDemo = body.is_demo === true;
    const result = await businessSnapshotAggregator.captureSnapshot(isDemo);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
