import { NextRequest, NextResponse } from "next/server";
import { operationsRepo } from "@/database/repositories/operations-repo";
import { emergencyControlManager } from "@/operations/emergency-control";

export async function GET(req: NextRequest) {
  try {
    const state = await operationsRepo.getSystemState();
    return NextResponse.json(state);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action; // "PAUSE", "RESUME", "KILL_SWITCH_ENGAGE", "KILL_SWITCH_DISENGAGE"

    if (action === "PAUSE") {
      const state = await emergencyControlManager.pauseGlobally(body.reason || "Operator paused");
      return NextResponse.json({ success: true, state });
    }

    if (action === "RESUME") {
      const state = await emergencyControlManager.resumeGlobally();
      return NextResponse.json({ success: true, state });
    }

    if (action === "KILL_SWITCH_ENGAGE") {
      if (!body.reason) {
        return NextResponse.json({ error: "Reason required to engage Emergency Kill Switch" }, { status: 400 });
      }
      const state = await emergencyControlManager.engageKillSwitch(body.reason);
      return NextResponse.json({ success: true, state });
    }

    if (action === "KILL_SWITCH_DISENGAGE") {
      const state = await emergencyControlManager.disengageKillSwitch(
        body.operator || "operator",
        body.reason || "Operator disengaged kill switch after resolution"
      );
      return NextResponse.json({ success: true, state });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
