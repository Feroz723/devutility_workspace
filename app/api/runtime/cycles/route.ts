import { NextRequest, NextResponse } from "next/server";
import { runtimeRepo } from "@/database/repositories/runtime-repo";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const cycleType = searchParams.get("cycle_type") || undefined;
    const status = searchParams.get("status") || undefined;

    const cycles = await runtimeRepo.listExecutionCycles({
      cycleType,
      status,
      limit,
      offset,
    });

    // Also fetch stages for the most recent cycles (top 5)
    const cyclesWithStages = await Promise.all(
      cycles.slice(0, 5).map(async (c) => {
        const stages = await runtimeRepo.listCycleStages(c.id);
        return { ...c, stages };
      })
    );

    const result = [
      ...cyclesWithStages,
      ...cycles.slice(5).map((c) => ({ ...c, stages: [] })),
    ];

    return NextResponse.json({
      success: true,
      cycles: result,
      count: cycles.length,
    });
  } catch (error: any) {
    logger.error("Failed to list execution cycles", { error: error.message });
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list execution cycles" },
      { status: 500 }
    );
  }
}
