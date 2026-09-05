import { NextRequest, NextResponse } from "next/server";
import { intelligenceRepo } from "@/database/repositories/intelligence-repo";
import { portfolioDecisionEngine } from "@/intelligence/decision-engine";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get("is_demo") === "true";
    const status = (searchParams.get("status") as any) || undefined;
    const subjectType = (searchParams.get("subject_type") as any) || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const decisions = await intelligenceRepo.listDecisions({
      is_demo: isDemo,
      status,
      subject_type: subjectType,
      limit,
    });

    return NextResponse.json({ decisions });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject_type, subject_id, subject_name, is_demo } = body;

    if (!subject_type || !subject_id || !subject_name) {
      return NextResponse.json(
        { error: "Missing required fields: subject_type, subject_id, subject_name" },
        { status: 400 }
      );
    }

    const result = await portfolioDecisionEngine.evaluateSubject(
      subject_type,
      subject_id,
      subject_name,
      is_demo ?? false
    );

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
