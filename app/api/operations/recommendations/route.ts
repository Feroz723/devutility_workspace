import { NextRequest, NextResponse } from "next/server";
import { operationsActionAdvisor } from "@/operations/action-advisor";

export async function GET(req: NextRequest) {
  try {
    const recommendations = await operationsActionAdvisor.getRecommendedActions();
    return NextResponse.json({ recommendations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
