import { NextResponse } from "next/server";
import { realityTestRepo } from "@/database/repositories/reality-test-repo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const latestScorecard = await realityTestRepo.getLatestRealityScorecard();
    if (!latestScorecard) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "No reality tests have been executed yet. Run the simulation suite to generate a report.",
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        scorecard: latestScorecard,
        productionReadinessReport: latestScorecard.production_readiness_report,
        categoryEvaluations: latestScorecard.category_evaluations,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch production readiness report" },
      { status: 500 }
    );
  }
}
