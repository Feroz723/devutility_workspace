import { NextRequest, NextResponse } from "next/server";
import { runtimeManager } from "@/runtime/runtime-manager";
import { runtimeConfigManager } from "@/runtime/config";
import { logAudit } from "@/database/repositories/audit-repo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing required action field." }, { status: 400 });
    }

    switch (action) {
      case "START":
        await runtimeManager.boot();
        await logAudit({
          event_type: "RUNTIME_STARTED",
          entity_type: "RUNTIME",
          actor: "operator",
          details: { action: "START" },
        });
        break;

      case "STOP":
        await runtimeManager.shutdown();
        await logAudit({
          event_type: "RUNTIME_STOPPED",
          entity_type: "RUNTIME",
          actor: "operator",
          details: { action: "STOP" },
        });
        break;

      case "PAUSE":
        await runtimeManager.pauseRuntime(payload?.reason || "Operator paused");
        await logAudit({
          event_type: "RUNTIME_PAUSED",
          entity_type: "RUNTIME",
          actor: "operator",
          details: { reason: payload?.reason },
        });
        break;

      case "RESUME":
        await runtimeManager.resumeRuntime();
        await logAudit({
          event_type: "RUNTIME_RESUMED",
          entity_type: "RUNTIME",
          actor: "operator",
          details: { action: "RESUME" },
        });
        break;

      case "TRIGGER_DAILY":
        const dailyCycle = await runtimeManager.triggerDailyCycle(payload?.is_demo ?? false);
        return NextResponse.json({ success: true, cycle: dailyCycle });

      case "TRIGGER_WEEKLY":
        const weeklyCycle = await runtimeManager.triggerWeeklyCycle(payload?.is_demo ?? false);
        return NextResponse.json({ success: true, cycle: weeklyCycle });

      case "SET_SAFE_MODE":
        await runtimeManager.setSafeMode(Boolean(payload?.enabled));
        await logAudit({
          event_type: payload?.enabled ? "SAFE_MODE_ENABLED" : "SAFE_MODE_DISABLED",
          entity_type: "RUNTIME",
          actor: "operator",
          details: { enabled: payload?.enabled },
        });
        break;

      case "SET_DRY_RUN":
        await runtimeManager.setDryRun(Boolean(payload?.enabled));
        await logAudit({
          event_type: "DRY_RUN_EXECUTED",
          entity_type: "RUNTIME",
          actor: "operator",
          details: { dry_run: payload?.enabled },
        });
        break;

      case "UPDATE_CONFIG":
        if (payload?.config) {
          await runtimeConfigManager.updateConfig(payload.config);
        }
        break;

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const updatedStatus = await runtimeManager.getStatus();
    return NextResponse.json({ success: true, action, status: updatedStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
