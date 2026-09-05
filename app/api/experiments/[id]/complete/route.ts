import { NextRequest, NextResponse } from "next/server";
import { experimentRunner } from "@/experiments/runner";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updated = await experimentRunner.complete(params.id);
    return NextResponse.json({
      experiment: updated,
      message: "Experiment completed and ready for analysis.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to complete experiment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
