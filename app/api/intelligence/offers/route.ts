import { NextRequest, NextResponse } from "next/server";
import { salesDecisionEngine } from "@/intelligence/sales-decisions";
import { intelligenceRepo } from "@/database/repositories/intelligence-repo";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get("is_demo") === "true";

    const [decisions, storedPerformances] = await Promise.all([
      salesDecisionEngine.evaluateOffers(isDemo),
      intelligenceRepo.listOfferPerformances({ is_demo: isDemo }),
    ]);

    return NextResponse.json({
      offers: decisions,
      performances: storedPerformances,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
