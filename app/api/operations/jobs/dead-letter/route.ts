import { NextRequest, NextResponse } from "next/server";
import { operationsRepo } from "@/database/repositories/operations-repo";
import { jobManager } from "@/operations/job-manager";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : 0;

    const result = await operationsRepo.listDeadLetterJobs({ limit, offset });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Retry all dead-letter jobs
    const deadLetters = await operationsRepo.listDeadLetterJobs({ limit: 20 });
    let retriedCount = 0;

    for (const job of deadLetters.jobs) {
      await operationsRepo.updateJobStatus(job.id, "QUEUED", {
        next_run_at: new Date().toISOString(),
      });
      jobManager.processJob(job.id).catch((err) => {
        console.error(`[DeadLetterRetry] Failed to process job ${job.id}:`, err);
      });
      retriedCount++;
    }

    return NextResponse.json({ success: true, retried_count: retriedCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
