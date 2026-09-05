import { NextRequest, NextResponse } from "next/server";
import { queryMany } from "@/database/client";
import { productPerformanceEvaluator } from "@/intelligence/product-performance";
import { productIterationEngine } from "@/intelligence/product-iteration";
import { intelligenceRepo } from "@/database/repositories/intelligence-repo";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get("is_demo") === "true";
    const productId = searchParams.get("product_id") || undefined;

    if (productId) {
      const perf = await productPerformanceEvaluator.evaluateProduct(productId, isDemo);
      const proposals = await productIterationEngine.generateProposals(productId, isDemo);
      return NextResponse.json({ performance: perf, proposals });
    }

    const products = await queryMany<any>(`SELECT id, name, status FROM products WHERE is_demo = $1`, [isDemo]);
    const performances = await intelligenceRepo.listProductPerformances({ is_demo: isDemo });
    const allProposals = await productIterationEngine.generateProposals(undefined, isDemo);

    return NextResponse.json({
      products,
      performances,
      proposals: allProposals,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
