import { NextRequest, NextResponse } from "next/server";
import { getExperimentById, listExperimentMetrics } from "@/database/repositories/experiment-repo";
import { getOpportunityById } from "@/database/repositories/opportunity-repo";
import {
  getProductByExperimentId,
  createProduct,
} from "@/database/repositories/product-repo";
import {
  checkProductBuildEligibility,
  deriveProductStrategy,
  generateProductSpecification,
  createBuildPlan,
} from "@/product-builder";
import { logAudit } from "@/database/repositories/audit-repo";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const experiment = await getExperimentById(params.id);
    if (!experiment) {
      return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
    }

    const opportunity = experiment.opportunity_id
      ? await getOpportunityById(experiment.opportunity_id)
      : null;

    const metrics = await listExperimentMetrics(experiment.id).catch(() => []);
    const eligibility = checkProductBuildEligibility(experiment, opportunity, { metrics });
    const strategy = deriveProductStrategy(experiment, opportunity);
    const existingProduct = await getProductByExperimentId(experiment.id);

    return NextResponse.json({
      experiment,
      opportunity,
      eligibility,
      strategy_preview: strategy,
      existing_product: existingProduct,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const experiment = await getExperimentById(params.id);
    if (!experiment) {
      return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
    }

    // Check idempotency: product already exists for this experiment
    const existingProduct = await getProductByExperimentId(experiment.id);
    if (existingProduct) {
      return NextResponse.json(
        {
          message: "Product already exists for this experiment",
          product: existingProduct,
          is_existing: true,
        },
        { status: 200 }
      );
    }

    const opportunity = experiment.opportunity_id
      ? await getOpportunityById(experiment.opportunity_id)
      : null;

    const metrics = await listExperimentMetrics(experiment.id).catch(() => []);
    const eligibility = checkProductBuildEligibility(experiment, opportunity, { metrics });

    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          error: "Experiment is not eligible for autonomous product building",
          blockers: eligibility.blockers,
          metrics: eligibility.metrics,
        },
        { status: 422 }
      );
    }

    // Derive Strategy, Spec, and Build Plan
    const strategy = deriveProductStrategy(experiment, opportunity);
    const spec = generateProductSpecification(strategy, experiment, opportunity);
    const buildPlan = createBuildPlan(spec);

    const product = await createProduct({
      name: spec.identity.name,
      slug: spec.identity.slug,
      description: spec.identity.tagline,
      problem: spec.problem_solution.validated_problem,
      solution: spec.problem_solution.solution_statement,
      value_proposition: spec.problem_solution.value_proposition,
      opportunity_id: experiment.opportunity_id,
      experiment_id: experiment.id,
      product_type: spec.identity.product_type,
      status: "DRAFT",
      build_status: "NOT_STARTED",
      estimated_cost_inr: 0,
      actual_cost_inr: 0,
      cost_classification: "ZERO_COST",
      build_plan: buildPlan,
      tech_stack: strategy.tech_stack,
      version: spec.identity.version,
      learning_data: {
        experiment_title: experiment.title,
        experiment_result: experiment.result,
        metrics_count: metrics.length,
      },
    });

    await logAudit({
      entity_type: "product",
      entity_id: product.id,
      action: "PRODUCT_PLANNED",
      details: {
        experiment_id: experiment.id,
        product_type: product.product_type,
        slug: product.slug,
        estimated_tasks: buildPlan.tasks.length,
      },
    }).catch(() => null);

    return NextResponse.json(
      {
        message: "Product plan created successfully from validated experiment",
        product,
        specification: spec,
        build_plan: buildPlan,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
