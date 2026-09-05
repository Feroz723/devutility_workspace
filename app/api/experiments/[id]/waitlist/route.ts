import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getExperimentById,
  createWaitlistEntry,
  recordMetric,
} from "@/database/repositories/experiment-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";

export const dynamic = "force-dynamic";

const WaitlistRequestSchema = z.object({
  email: z.string().email(),
  source: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

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
    const parsed = WaitlistRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email or waitlist submission", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { entry, duplicate } = await createWaitlistEntry({
      experiment_id: params.id,
      email: parsed.data.email,
      source: parsed.data.source || "landing_page",
      metadata: parsed.data.metadata,
    });

    if (!duplicate) {
      await recordMetric({
        experiment_id: params.id,
        metric_name: "signups",
        metric_value: 1,
        metric_type: "conversion",
        source: "WEBSITE",
      });

      await createAuditLog({
        event_type: "WAITLIST_ENTRY_CREATED",
        entity_type: "experiment",
        entity_id: params.id,
        actor: "public_user",
        details: { email_domain: parsed.data.email.split("@")[1], source: parsed.data.source },
      });
    }

    return NextResponse.json({
      success: true,
      duplicate,
      message: duplicate
        ? "You are already registered on the early access waitlist!"
        : "Thank you for joining the early access waitlist! We'll notify you when ready.",
      entry_id: entry?.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record waitlist entry";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
