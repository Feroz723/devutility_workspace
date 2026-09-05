import { NextRequest, NextResponse } from "next/server";
import { operationsRepo } from "@/database/repositories/operations-repo";
import { jobManager } from "@/operations/job-manager";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const job = await operationsRepo.getJobById(params.id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Reset status to QUEUED
    await operationsRepo.updateJobStatus(params.id, "QUEUED", {
      next_run_at: new Date().toISOString(),
    });

    // Attempt processing
    const result = await jobManager.processJob(params.id);

    return NextResponse.json({ success: true, job: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
