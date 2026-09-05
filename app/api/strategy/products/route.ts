import { NextRequest, NextResponse } from "next/server";
import { strategyRepo } from "@/database/repositories/strategy-repo";
import { productLifecycleGovernor } from "@/strategy/product-lifecycle-governor";
import { listProducts } from "@/database/repositories/product-repo";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get("is_demo") === "true";
    const productId = searchParams.get("product_id");

    if (productId) {
      const state = await productLifecycleGovernor.getOrInitLifecycleState(productId, isDemo);
      const evalResult = await productLifecycleGovernor.evaluateSwitching(productId, isDemo);
      return NextResponse.json({ success: true, lifecycle: state, evaluation: evalResult });
    }

    const lifecycles = await strategyRepo.listProductLifecycleStates(isDemo);
    return NextResponse.json({ success: true, lifecycles });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch product lifecycles" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const isDemo = body.is_demo === true;
    const productId = body.product_id;

    if (!productId) {
      return NextResponse.json({ error: "product_id is required" }, { status: 400 });
    }

    if (body.new_stage) {
      const updated = await productLifecycleGovernor.transitionStage(
        productId,
        body.new_stage,
        body.reason || "Manual stage transition",
        isDemo
      );
      return NextResponse.json({ success: true, lifecycle: updated });
    }

    const evaluation = await productLifecycleGovernor.evaluateSwitching(productId, isDemo);
    return NextResponse.json({ success: true, evaluation });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to update product lifecycle" }, { status: 500 });
  }
}
