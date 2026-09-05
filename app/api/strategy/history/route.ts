import { NextRequest, NextResponse } from "next/server";
import { strategyRepo } from "@/database/repositories/strategy-repo";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    const [changes, memories] = await Promise.all([
      strategyRepo.listStrategyChanges(limit),
      strategyRepo.listStrategyMemories(limit),
    ]);

    return NextResponse.json({
      success: true,
      changes,
      memories,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch strategy history" }, { status: 500 });
  }
}
