import { NextRequest, NextResponse } from "next/server";
import { operationsRepo } from "@/database/repositories/operations-repo";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const source_module = searchParams.get("source_module") || undefined;
    const event_type = searchParams.get("event_type") || undefined;
    const correlation_id = searchParams.get("correlation_id") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

    const events = await operationsRepo.listEvents({
      source_module,
      event_type,
      correlation_id,
      limit,
    });

    return NextResponse.json({ events });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
