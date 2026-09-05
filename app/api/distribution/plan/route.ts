import { NextRequest, NextResponse } from "next/server";
import { productRepo } from "@/database/repositories/product-repo";
import { distributionRepo } from "@/database/repositories/distribution-repo";
import { logAudit } from "@/database/repositories/audit-repo";
import { generateDistributionStrategy } from "@/distribution/strategy";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => null);
    const productId = json?.product_id;

    if (!productId) {
      return NextResponse.json({ error: "product_id is required" }, { status: 400 });
    }

    const product = await productRepo.findById(productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Generate deterministic ranked strategy plan
    const plan = generateDistributionStrategy(product);

    // Persist as a distribution strategy
    const strategy = await distributionRepo.createStrategy({
      product_id: product.id,
      target_audience: plan.target_audience,
      value_hook: plan.value_hook,
      ranked_channels: plan.ranked_channels as any,
      estimated_cost_inr: plan.estimated_total_cost_inr,
      is_demo: product.is_demo ?? false,
    });

    await logAudit({
      entity_type: "distribution_strategy",
      entity_id: strategy.id,
      action: "DISTRIBUTION_STRATEGY_GENERATED",
      details: {
        product_id: product.id,
        target_audience: plan.target_audience,
        top_channels: plan.ranked_channels.slice(0, 3).map((c: { channel_type: string }) => c.channel_type),
      },
    });

    return NextResponse.json({ plan, strategy }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
