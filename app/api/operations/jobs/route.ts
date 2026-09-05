import { NextRequest, NextResponse } from "next/server";
import { operationsRepo } from "@/database/repositories/operations-repo";
import { jobManager } from "@/operations/job-manager";
import type { JobStatus } from "@/types/operations";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as JobStatus | null;
    const moduleName = searchParams.get("module") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : 0;

    const result = await operationsRepo.listJobs({
      status: status || undefined,
      module: moduleName,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || !body.module || !body.action) {
      return NextResponse.json({ error: "Missing required fields: name, module, action" }, { status: 400 });
    }

    const idempotencyKey = body.idempotency_key || `job_${body.module}_${body.action}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const job = await jobManager.submitJob({
      name: body.name,
      module: body.module,
      action: body.action,
      idempotency_key: idempotencyKey,
      depends_on: body.depends_on,
      blocks: body.blocks,
      priority: body.priority,
      retry_policy: body.retry_policy,
      timeout_seconds: body.timeout_seconds,
      required_approval: body.required_approval,
      approval_id: body.approval_id,
      required_integration: body.required_integration,
      resource_requirement: body.resource_requirement,
      safety_classification: body.safety_classification,
      payload: body.payload,
      is_demo: body.is_demo,
    });

    return NextResponse.json({ success: true, job }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
