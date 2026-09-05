import { NextRequest, NextResponse } from "next/server";
import { businessGoalTracker } from "@/intelligence/goals";
import { intelligenceRepo } from "@/database/repositories/intelligence-repo";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get("is_demo") === "true";

    await businessGoalTracker.ensureBaselineGoals(isDemo);
    const goals = await businessGoalTracker.evaluateGoals(isDemo);

    return NextResponse.json({ goals });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, target_value, unit, deadline, is_demo, metadata } = body;

    if (!name || target_value === undefined) {
      return NextResponse.json({ error: "Missing name or target_value" }, { status: 400 });
    }

    const created = await intelligenceRepo.saveGoal({
      id: crypto.randomUUID(),
      name,
      target_value: Number(target_value),
      current_value: 0,
      unit: unit || "CUSTOMERS",
      deadline: deadline || null,
      status: "ACTIVE",
      metadata: metadata || {},
      is_demo: is_demo ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, goal: created });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
