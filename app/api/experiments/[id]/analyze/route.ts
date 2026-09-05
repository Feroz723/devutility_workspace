import { NextRequest, NextResponse } from "next/server";
import { experimentRunner } from "@/experiments/runner";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { experiment, analysis } = await experimentRunner.analyze(params.id);
    return NextResponse.json({
      experiment,
      analysis,
      message: `Experiment analyzed successfully. Result: ${analysis.result}.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to analyze experiment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
