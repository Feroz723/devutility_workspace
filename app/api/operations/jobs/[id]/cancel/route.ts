import { NextRequest, NextResponse } from "next/server";
import { operationsRepo } from "@/database/repositories/operations-repo";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const job = await operationsRepo.getJobById(params.id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const updated = await operationsRepo.updateJobStatus(params.id, "CANCELLED", {
      completed_at: new Date().toISOString(),
      last_error: "Operator cancelled job execution.",
    });

    return NextResponse.json({ success: true, job: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
