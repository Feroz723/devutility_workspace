import { getProductById, listProductArtifacts } from "@/database/repositories/product-repo";
import { listOffers } from "@/database/repositories/sales-repo";
import { OfferEligibilityResult } from "./types";

export class SalesEligibilityChecker {
  /**
   * Checks if a product is eligible to have a public Offer created/activated.
   */
  static async checkProductEligibility(productId: string): Promise<OfferEligibilityResult> {
    const checks = {
      productExists: false,
      productStatusValid: false,
      hasApprovedArtifacts: false,
      buildCostZero: false,
      qualityGatePassed: false,
      noActiveBlockingOffer: false,
    };

    const product = await getProductById(productId).catch(() => null);

    if (!product) {
      return {
        eligible: false,
        productId,
        reason: "Product not found in database",
        checks,
      };
    }

    checks.productExists = true;

    // 1. Status check: must be READY or LIVE (or legacy 'ready')
    const validStatuses = ["READY", "LIVE", "ready", "published"];
    checks.productStatusValid = validStatuses.includes(product.status) || validStatuses.includes((product as any).creation_status);

    // 2. Cost check: ₹0 build constraint
    const actualCost = product.actual_cost_inr ?? product.estimated_cost_inr ?? 0;
    const isCostZero = actualCost === 0 || product.cost_classification === "ZERO_COST";
    checks.buildCostZero = isCostZero;

    // 3. Artifact / Deliverable check
    const artifacts = await listProductArtifacts(productId).catch(() => []);
    checks.hasApprovedArtifacts = artifacts.length > 0 || (Boolean((product as any).deliverables) && ((product as any).deliverables as any[]).length > 0);

    // 4. Quality gate
    checks.qualityGatePassed = checks.productStatusValid && (checks.hasApprovedArtifacts || (product as any).github_repo_url !== null);

    // 5. Active offer check: we can have offers, but if there's already an active one, flag it
    const existingOffers = await listOffers({ productId, status: "ACTIVE" }).catch(() => []);
    checks.noActiveBlockingOffer = existingOffers.length === 0;

    const eligible =
      checks.productExists &&
      checks.productStatusValid &&
      checks.buildCostZero &&
      checks.qualityGatePassed;

    let reason = "Product meets all criteria for commercial or free offer creation";
    if (!eligible) {
      const failures: string[] = [];
      if (!checks.productStatusValid) failures.push(`Product status '${product.status}' is not READY or LIVE`);
      if (!checks.buildCostZero) failures.push(`Product violated zero-cost policy (cost: ₹${actualCost})`);
      if (!checks.qualityGatePassed) failures.push("Product has no deployable artifacts or code deliverables");
      reason = `Product not eligible: ${failures.join(", ")}`;
    }

    return {
      eligible,
      productId,
      reason,
      checks,
    };
  }
}
