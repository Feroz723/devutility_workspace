import { NextRequest, NextResponse } from "next/server";
import { CreateMetricInputSchema } from "@/types/experiment";
import {
  getExperimentById,
  recordMetric,
  listMetricsForExperiment,
} from "@/database/repositories/experiment-repo";
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

    const metrics = await listMetricsForExperiment(params.id);
    return NextResponse.json({ metrics });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const experiment = await getExperimentById(params.id);
    if (!experiment) {
      return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
    }

    const json = await request.json().catch(() => null);
    const parsed = CreateMetricInputSchema.safeParse({
      ...json,
      experiment_id: params.id,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid metric data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const metric = await recordMetric(parsed.data);

    await createAuditLog({
      event_type: "EXPERIMENT_METRIC_RECORDED",
      entity_type: "experiment",
      entity_id: params.id,
      actor: parsed.data.source === "MANUAL" ? "human_operator" : "metric_collector",
      details: {
        metric_name: metric.metric_name,
        metric_value: metric.metric_value,
        source: metric.source,
      },
    });

    return NextResponse.json(metric, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
