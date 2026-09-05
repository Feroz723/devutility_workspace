import { NextRequest, NextResponse } from "next/server";
import { experimentRunner } from "@/experiments/runner";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updated = await experimentRunner.resume(params.id);
    return NextResponse.json({
      experiment: updated,
      message: "Experiment resumed.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to resume experiment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
