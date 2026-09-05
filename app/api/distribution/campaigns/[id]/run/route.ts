import { NextRequest, NextResponse } from "next/server";
import { runDistributionPipeline } from "@/distribution/runner";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await runDistributionPipeline({
      campaign_id: params.id,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
