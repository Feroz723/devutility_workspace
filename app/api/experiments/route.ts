import { NextRequest, NextResponse } from "next/server";
import { CreateExperimentSchema } from "@/types/experiment";
import { createExperiment, listExperiments } from "@/database/repositories/experiment-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const result = await listExperiments({
      opportunity_id: url.searchParams.get("opportunity_id") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      experiment_type: url.searchParams.get("experiment_type") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      limit: url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : undefined,
      offset: url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")!) : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = CreateExperimentSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const experiment = await createExperiment(parsed.data);

    await createAuditLog({
      event_type: "EXPERIMENT_CREATED",
      entity_type: "experiment",
      entity_id: experiment.id,
      actor: "api",
      details: { title: experiment.title, opportunity_id: experiment.opportunity_id },
    });

    return NextResponse.json(experiment, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
