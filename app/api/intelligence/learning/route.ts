import { NextRequest, NextResponse } from "next/server";
import { businessLearningEngine } from "@/intelligence/learning";
import { intelligenceRepo } from "@/database/repositories/intelligence-repo";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get("is_demo") === "true";
    const category = (searchParams.get("category") as any) || undefined;

    const [harvested, storedLearnings] = await Promise.all([
      businessLearningEngine.harvestLearnings(isDemo),
      intelligenceRepo.listLearnings({ is_demo: isDemo, category }),
    ]);

    return NextResponse.json({
      learnings: storedLearnings,
      harvested_count: harvested.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
