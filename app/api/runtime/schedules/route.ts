import { NextRequest, NextResponse } from "next/server";
import { runtimeRepo } from "@/database/repositories/runtime-repo";
import { jobManager } from "@/operations/job-manager";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const enabledOnly = searchParams.get("enabled") === "true";

    const schedules = await runtimeRepo.listScheduledJobs({
      status: enabledOnly ? "ACTIVE" : undefined,
    });

    return NextResponse.json({
      success: true,
      schedules,
      count: schedules.length,
    });
  } catch (error: any) {
    logger.error("Failed to list schedules", { error: error.message });
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list schedules" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, schedule_id, schedule } = body;

    if (action === "trigger_now") {
      if (!schedule_id) {
        return NextResponse.json(
          { success: false, error: "schedule_id is required for trigger_now" },
          { status: 400 }
        );
      }

      const existing = await runtimeRepo.getScheduledJobById(schedule_id);
      if (!existing) {
        return NextResponse.json(
          { success: false, error: "Schedule not found" },
          { status: 404 }
        );
      }

      // Enqueue job immediately into operations queue
      const job = await jobManager.submitJob({
        name: `Scheduled Manual Run: ${existing.name}`,
        module: existing.target_module,
        action: existing.target_action,
        idempotency_key: `manual_trigger_${existing.id}_${Date.now()}`,
        priority: 75,
        max_attempts: 3,
        timeout_seconds: 600,
        payload: {
          scheduled_job_id: existing.id,
          trigger: "MANUAL_TRIGGER_NOW",
          ...existing.payload,
        },
      });

      // Update schedule last_run_at
      await runtimeRepo.updateScheduledJob(existing.id, {
        last_run_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: `Schedule '${existing.name}' triggered successfully`,
        job_id: job.id,
      });
    }

    if (action === "create" && schedule) {
      const created = await runtimeRepo.createScheduledJob({
        name: schedule.name,
        job_type: schedule.job_type,
        schedule_type: schedule.schedule_type || "CRON",
        cron_expression: schedule.cron_expression || null,
        interval_seconds: schedule.interval_seconds || null,
        payload: schedule.payload || {},
        status: schedule.enabled === false ? "DISABLED" : "ACTIVE",
        next_run_at: schedule.next_run_at 
          ? new Date(schedule.next_run_at).toISOString() 
          : new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        schedule: created,
      });
    }

    if (action === "toggle" && schedule_id) {
      const existing = await runtimeRepo.getScheduledJobById(schedule_id);
      if (!existing) {
        return NextResponse.json(
          { success: false, error: "Schedule not found" },
          { status: 404 }
        );
      }

      const newStatus = existing.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
      const updated = await runtimeRepo.updateScheduledJob(schedule_id, {
        status: newStatus,
      });

      return NextResponse.json({
        success: true,
        schedule: updated,
      });
    }

    return NextResponse.json(
      { success: false, error: `Invalid action: ${action}` },
      { status: 400 }
    );
  } catch (error: any) {
    logger.error("Failed to process schedule action", { error: error.message });
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process schedule action" },
      { status: 500 }
    );
  }
}
