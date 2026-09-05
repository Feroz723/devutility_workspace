import { NextRequest, NextResponse } from "next/server";
import { listAuditLogs } from "@/database/repositories/audit-repo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const result = await listAuditLogs({
      event_type: url.searchParams.get("event_type") ?? undefined,
      entity_type: url.searchParams.get("entity_type") ?? undefined,
      entity_id: url.searchParams.get("entity_id") ?? undefined,
      limit: url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : undefined,
      offset: url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")!) : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("DATABASE_URL")) {
      return NextResponse.json({ logs: [], total: 0, _db_status: "NOT_CONNECTED" });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
