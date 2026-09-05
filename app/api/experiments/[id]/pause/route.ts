import { NextRequest, NextResponse } from "next/server";
import { experimentRunner } from "@/experiments/runner";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updated = await experimentRunner.pause(params.id);
    return NextResponse.json({
      experiment: updated,
      message: "Experiment paused.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to pause experiment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
