import { NextRequest, NextResponse } from "next/server";
import { businessRiskDetector } from "@/intelligence/risk";
import { intelligenceRepo } from "@/database/repositories/intelligence-repo";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get("is_demo") === "true";
    const status = (searchParams.get("status") as any) || undefined;
    const severity = (searchParams.get("severity") as any) || undefined;

    const [detected, storedRisks] = await Promise.all([
      businessRiskDetector.detectRisks(isDemo),
      intelligenceRepo.listRisks({ is_demo: isDemo, status, severity }),
    ]);

    return NextResponse.json({
      active_risks: storedRisks,
      detected_count: detected.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
