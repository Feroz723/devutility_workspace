import { NextRequest, NextResponse } from "next/server";
import { customerCohortAnalyzer } from "@/intelligence/cohorts";
import { intelligenceRepo } from "@/database/repositories/intelligence-repo";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get("is_demo") === "true";
    const cohortType = searchParams.get("cohort_type") || undefined;

    const [analysis, storedCohorts] = await Promise.all([
      customerCohortAnalyzer.analyzeCohorts(isDemo),
      intelligenceRepo.listCohorts({ is_demo: isDemo, cohort_type: cohortType }),
    ]);

    return NextResponse.json({
      analysis,
      cohorts: storedCohorts,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
