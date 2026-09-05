import { NextRequest, NextResponse } from "next/server";
import { getProductById, listProductArtifacts } from "@/database/repositories/product-repo";
import { getOpportunityById } from "@/database/repositories/opportunity-repo";
import { getExperimentById } from "@/database/repositories/experiment-repo";
import {
  deriveProductStrategy,
  generateProductSpecification,
  createBuildPlan,
  evaluateQualityGates,
} from "@/product-builder";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await getProductById(params.id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const opportunity = product.opportunity_id
      ? await getOpportunityById(product.opportunity_id).catch(() => null)
      : null;
    const experiment = product.experiment_id
      ? await getExperimentById(product.experiment_id).catch(() => null)
      : null;

    const dummyExp = experiment || ({
      id: product.experiment_id || product.id,
      title: product.name,
      description: product.description || product.problem || "",
      opportunity_id: product.opportunity_id,
      status: "COMPLETED",
      result: "WINNER",
      cost_inr: 0,
      created_at: product.created_at,
      updated_at: product.updated_at,
    } as any);

    const strategy = deriveProductStrategy(dummyExp, opportunity);
    const spec = generateProductSpecification(strategy, dummyExp, opportunity);
    const plan = (product.build_plan as any) || createBuildPlan(spec, product.id);

    const artifacts = await listProductArtifacts(product.id);

    const report = evaluateQualityGates(spec, plan, artifacts);

    return NextResponse.json({
      product_id: product.id,
      quality_report: report,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
