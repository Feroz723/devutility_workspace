import { NextRequest, NextResponse } from "next/server";
import { agentRegistryService } from "@/operations/agent-registry";

export async function GET(req: NextRequest) {
  try {
    const agents = await agentRegistryService.listAgents();
    return NextResponse.json({ agents });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action, error } = body; // action: "PAUSE", "RESUME"

    if (!id || !action) {
      return NextResponse.json({ error: "Missing agent id or action" }, { status: 400 });
    }

    const nextStatus = action === "PAUSE" ? "PAUSED" : "ACTIVE";
    const updated = await agentRegistryService.setAgentStatus(id, nextStatus, error);

    return NextResponse.json({ success: true, agent: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
