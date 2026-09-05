import { NextRequest, NextResponse } from "next/server";
import { unitEconomicsEngine } from "@/intelligence/unit-economics";
import { intelligenceRepo } from "@/database/repositories/intelligence-repo";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get("is_demo") === "true";
    const productId = searchParams.get("product_id") || undefined;

    const [computed, storedList] = await Promise.all([
      unitEconomicsEngine.computeEconomics(productId, isDemo),
      intelligenceRepo.listUnitEconomics({ product_id: productId, is_demo: isDemo }),
    ]);

    return NextResponse.json({
      current: computed,
      history: storedList,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
