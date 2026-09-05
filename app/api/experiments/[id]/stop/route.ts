import { NextRequest, NextResponse } from "next/server";
import { experimentRunner } from "@/experiments/runner";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const json = await request.json().catch(() => ({}));
    const reason = json?.reason || "Stopped by operator";
    const updated = await experimentRunner.stop(params.id, reason);
    return NextResponse.json({
      experiment: updated,
      message: `Experiment stopped: ${reason}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to stop experiment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
