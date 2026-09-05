import { NextRequest, NextResponse } from "next/server";
import { executeResearchCycle } from "@/research/cycle";
import { createResearchJob, updateResearchJob } from "@/database/repositories/research-repo";
import { z } from "zod";

export const dynamic = "force-dynamic";

const RunRequestSchema = z.object({
  queries: z.array(z.string()).optional(),
  providers: z.array(z.string()).optional(),
  maxItemsPerQuery: z.number().int().min(1).max(25).optional(),
});

/**
 * POST /api/research/run
 * Starts a real research cycle across public providers.
 */
export async function POST(request: NextRequest) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    const parsed = RunRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Create research job record
    const job = await createResearchJob(
      parsed.data.queries?.[0],
      parsed.data.providers?.[0]
    );

    // Execute the bounded research cycle
    await updateResearchJob(job.id, { status: "RUNNING" });
    const result = await executeResearchCycle(parsed.data);

    await updateResearchJob(job.id, {
      status: result.status === "completed" ? "COMPLETED" : "FAILED",
      research_run_id: result.runId,
      error: result.errors[0],
    });

    return NextResponse.json({
      jobId: job.id,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API] POST /api/research/run error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
