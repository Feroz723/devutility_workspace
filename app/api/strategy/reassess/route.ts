import { NextRequest, NextResponse } from "next/server";
import { strategyEngine } from "@/strategy/strategy-engine";
import { learningLoopEngine } from "@/strategy/learning-loop-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const isDemo = body.is_demo === true;
    const reason = body.reason || "Evidence threshold reassessment triggered";

    // Run reassessment through strategy engine
    const evaluation = await strategyEngine.evaluateStrategy({
      isDemo,
      reason,
      forceReassessment: true,
    });

    // If memory outcome is provided, record it in learning loop
    let memory = null;
    if (body.memory_id && body.actual_outcome) {
      memory = await learningLoopEngine.recordOutcomeAndLearn(
        body.memory_id,
        body.actual_outcome,
        body.observed_metrics
      );
    }

    return NextResponse.json({
      success: true,
      evaluation,
      recorded_learning: memory,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to execute reassessment" }, { status: 500 });
  }
}
