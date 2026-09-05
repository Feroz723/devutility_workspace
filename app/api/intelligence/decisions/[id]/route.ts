import { NextRequest, NextResponse } from "next/server";
import { intelligenceRepo } from "@/database/repositories/intelligence-repo";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decisionId = params.id;
    const decision = await intelligenceRepo.getDecisionById(decisionId);

    if (!decision) {
      return NextResponse.json({ error: "Decision not found" }, { status: 404 });
    }

    const [recommendations, evidence] = await Promise.all([
      intelligenceRepo.listRecommendations(decisionId),
      intelligenceRepo.listEvidence(decisionId),
    ]);

    return NextResponse.json({
      decision,
      recommendations,
      evidence,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
