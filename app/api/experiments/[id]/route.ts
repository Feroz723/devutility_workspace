import { NextRequest, NextResponse } from "next/server";
import { UpdateExperimentSchema } from "@/types/experiment";
import { getExperimentById, updateExperiment } from "@/database/repositories/experiment-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const experiment = await getExperimentById(params.id);
    if (!experiment) {
      return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
    }
    return NextResponse.json(experiment);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await getExperimentById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
    }

    const json = await request.json().catch(() => null);
    const parsed = UpdateExperimentSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateExperiment(params.id, parsed.data);

    await createAuditLog({
      event_type: "EXPERIMENT_UPDATED",
      entity_type: "experiment",
      entity_id: params.id,
      actor: "api",
      details: { changes: Object.keys(parsed.data) },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
