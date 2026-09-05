import { queryMany } from "@/database/client";
import type { ProductImprovementProposal } from "./types";

export class ProductIterationEngine {
  /**
   * Scan customer success telemetry, support tickets, and feature requests to formulate proposals
   */
  async generateProposals(productId?: string, isDemo: boolean = false): Promise<ProductImprovementProposal[]> {
    const proposals: ProductImprovementProposal[] = [];

    // Query recurring support issues grouped by product
    const queryStr = productId
      ? `SELECT product_id, subject, category, COUNT(id) as occurrences, AVG(resolution_time_seconds) as avg_resolution_time
         FROM support_tickets
         WHERE product_id = $1 AND is_demo = $2
         GROUP BY product_id, subject, category
         HAVING COUNT(id) >= 1
         ORDER BY occurrences DESC`
      : `SELECT product_id, subject, category, COUNT(id) as occurrences, AVG(resolution_time_seconds) as avg_resolution_time
         FROM support_tickets
         WHERE is_demo = $1 AND product_id IS NOT NULL
         GROUP BY product_id, subject, category
         HAVING COUNT(id) >= 1
         ORDER BY occurrences DESC`;

    const params = productId ? [productId, isDemo] : [isDemo];
    const ticketRows = await queryMany<any>(queryStr, params);

    for (const row of ticketRows) {
      if (!row.product_id) continue;
      const count = Number(row.occurrences) || 1;
      proposals.push({
        problem_summary: `Recurring ticket category [${row.category}]: ${row.subject}`,
        product_id: row.product_id,
        evidence: [
          `${count} support ticket(s) logged for this issue`,
          `Average resolution duration: ${Math.round(Number(row.avg_resolution_time) || 0)}s`,
        ],
        affected_customers_count: count,
        expected_benefit: "Reduces customer friction during onboarding and lowers support ticket overhead.",
        complexity: count > 3 ? "MEDIUM" : "LOW",
        risk: "LOW",
        cost_inr: 0, // ₹0 autonomous engineering effort
        requires_approval: true,
        status: "REQUIRES_REVIEW",
      });
    }

    // Query feature requests
    const featureRows = await queryMany<any>(
      `SELECT product_id, title, description, upvotes_count
       FROM feature_requests
       WHERE is_demo = $1 ${productId ? "AND product_id = $2" : ""}
       ORDER BY upvotes_count DESC
       LIMIT 5`,
      productId ? [isDemo, productId] : [isDemo]
    );

    for (const feat of featureRows) {
      if (!feat.product_id) continue;
      proposals.push({
        product_id: feat.product_id,
        problem_summary: `Customer Feature Request: ${feat.title}`,
        evidence: [
          `Documented request: ${feat.description}`,
          `Customer interest score: ${feat.upvotes_count || 1} upvotes`,
        ],
        affected_customers_count: Number(feat.upvotes_count) || 1,
        expected_benefit: "Improves product retention and customer outcome satisfaction.",
        complexity: "MEDIUM",
        risk: "LOW",
        cost_inr: 0,
        requires_approval: true,
        status: "REQUIRES_REVIEW",
      });
    }

    return proposals;
  }
}

export const productIterationEngine = new ProductIterationEngine();
