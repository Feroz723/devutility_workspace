import { listProducts, getProductById } from "@/database/repositories/product-repo";
import { executeProductBuild } from "@/product-builder/builder";
import { createBuildPlan } from "@/product-builder/build-plan";
import { generateProductSpecification } from "@/product-builder/spec";
import { deriveProductStrategy } from "@/product-builder/strategy";
import { getExperimentById } from "@/database/repositories/experiment-repo";
import { getOpportunityById } from "@/database/repositories/opportunity-repo";
import type { CrossPhaseAdapterResult } from "@/types/runtime";

export class ProductCycleAdapter {
  /**
   * Scans for products in DRAFT or pending build state and advances them through the autonomous build pipeline
   */
  async execute(options?: { isDemo?: boolean }): Promise<CrossPhaseAdapterResult> {
    try {
      const isDemo = options?.isDemo ?? false;
      const { products } = await listProducts();
      const eligible = products.filter(
        (p) => p.is_demo === isDemo && (p.status === "DRAFT" || p.build_status === "NOT_STARTED" || (p as any).creation_status === "DRAFT")
      );

      if (eligible.length === 0) {
        return {
          success: true,
          phase: 6,
          adapter_name: "ProductCycleAdapter",
          items_processed: 0,
          status: "NOTHING_ELIGIBLE",
          details: { message: "No products currently awaiting autonomous build." },
        };
      }

      const product = eligible[0];
      if (!product) {
        return {
          success: true,
          phase: 6,
          adapter_name: "ProductCycleAdapter",
          items_processed: 0,
          status: "NOTHING_ELIGIBLE",
          details: { message: "No eligible products found." },
        };
      }

      // Fetch linked experiment or opportunity
      const experiment = product.experiment_id ? await getExperimentById(product.experiment_id) : null;
      const opportunity = product.opportunity_id ? await getOpportunityById(product.opportunity_id) : null;

      const dummyExp = experiment || ({
        id: product.experiment_id || product.id,
        title: product.name,
        target_audience: "Developers & creators",
        problem_statement: "Need fast automated tooling",
        hypothesis: "High demand for automated utility",
        status: "COMPLETED",
        is_demo: isDemo,
      } as any);

      const strategy = deriveProductStrategy(dummyExp, opportunity);
      const spec = generateProductSpecification(strategy, dummyExp, opportunity);
      const buildPlan = createBuildPlan(spec);

      const buildResult = await executeProductBuild({
        product: product as any,
        specification: spec,
        buildPlan,
      });

      return {
        success: buildResult.success,
        phase: 6,
        adapter_name: "ProductCycleAdapter",
        items_processed: 1,
        status: buildResult.success ? "SUCCESS" : "FAILED",
        details: {
          product_id: product.id,
          product_name: product.name,
          artifacts_created: buildResult.artifacts_created,
        },
        error: buildResult.error || null,
      };
    } catch (err: any) {
      return {
        success: false,
        phase: 6,
        adapter_name: "ProductCycleAdapter",
        items_processed: 0,
        status: "FAILED",
        details: {},
        error: err.message || String(err),
      };
    }
  }
}

export const productCycleAdapter = new ProductCycleAdapter();
