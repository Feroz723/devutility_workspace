import { NextRequest, NextResponse } from "next/server";
import { strategyRepo } from "@/database/repositories/strategy-repo";
import { patternRecognitionEngine } from "@/strategy/pattern-recognition-engine";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get("is_demo") === "true";
    const category = searchParams.get("category") || undefined;
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    let patterns = await strategyRepo.listPatterns({ category, isDemo, limit });
    if (patterns.length === 0) {
      patterns = await patternRecognitionEngine.discoverPatterns(isDemo);
    }

    return NextResponse.json({ success: true, patterns });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch strategy patterns" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const isDemo = body.is_demo === true;

    const patterns = await patternRecognitionEngine.discoverPatterns(isDemo);
    return NextResponse.json({ success: true, patterns });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to discover strategy patterns" }, { status: 500 });
  }
}
