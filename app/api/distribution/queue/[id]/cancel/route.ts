import { NextRequest, NextResponse } from "next/server";
import { distributionRepo } from "@/database/repositories/distribution-repo";
import { validateQueueTransition } from "@/distribution/queue";
import { logAudit } from "@/database/repositories/audit-repo";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const item = await distributionRepo.getQueueItem(params.id);
    if (!item) {
      return NextResponse.json({ error: "Queue item not found" }, { status: 404 });
    }

    const check = validateQueueTransition(item.status, "CANCELLED");
    if (!check.valid) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }

    const updated = await distributionRepo.updateQueueItem(params.id, {
      status: "CANCELLED",
    });

    await logAudit({
      entity_type: "distribution_queue",
      entity_id: params.id,
      action: "QUEUE_ITEM_CANCELLED",
      details: { previous_status: item.status },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
