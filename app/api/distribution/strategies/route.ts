import { NextRequest, NextResponse } from "next/server";
import { distributionRepo } from "@/database/repositories/distribution-repo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get("product_id") ?? undefined;
    const isDemo = url.searchParams.get("is_demo") !== null
      ? url.searchParams.get("is_demo") === "true"
      : undefined;

    const strategies = await distributionRepo.listStrategies({
      product_id: productId,
      is_demo: isDemo,
    });

    return NextResponse.json({ strategies, total: strategies.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
