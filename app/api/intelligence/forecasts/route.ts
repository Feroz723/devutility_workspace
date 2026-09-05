import { NextRequest, NextResponse } from "next/server";
import { businessForecastingEngine } from "@/intelligence/forecast";
import { intelligenceRepo } from "@/database/repositories/intelligence-repo";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get("is_demo") === "true";

    const [generated, storedForecasts] = await Promise.all([
      businessForecastingEngine.generateForecasts(isDemo),
      intelligenceRepo.listForecasts({ is_demo: isDemo }),
    ]);

    return NextResponse.json({
      forecasts: storedForecasts,
      generated_count: generated.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
