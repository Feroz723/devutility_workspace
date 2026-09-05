import { queryMany } from "@/database/client";
import { intelligenceRepo } from "@/database/repositories/intelligence-repo";
import type { DecisionEvidence } from "@/types/intelligence";

export class EvidenceCollector {
  /**
   * Gather concrete evidence metrics for a given decision subject
   */
  async gatherEvidenceForSubject(
    subjectType: string,
    subjectId: string,
    isDemo: boolean = false
  ): Promise<Array<Omit<DecisionEvidence, "id" | "decision_id" | "created_at">>> {
    const evidenceItems: Array<Omit<DecisionEvidence, "id" | "decision_id" | "created_at">> = [];

    if (subjectType === "PRODUCT") {
      // 1. Paid Orders Evidence
      const orderStats = await queryMany<any>(
        `SELECT 
           COUNT(id) as paid_orders,
           COALESCE(SUM(amount_paid_inr), 0) as total_revenue
         FROM orders 
         WHERE product_id = $1 AND payment_status = 'PAID' AND is_demo = $2`,
        [subjectId, isDemo]
      );
      if (orderStats.length > 0) {
        evidenceItems.push({
          evidence_type: "FINANCIAL",
          metric_name: "PAID_ORDERS_COUNT",
          metric_value: String(orderStats[0].paid_orders || 0),
          sample_size: Number(orderStats[0].paid_orders || 0),
          source_reference: "orders table",
          confidence: Number(orderStats[0].paid_orders) > 0 ? 100 : 50,
        });
        evidenceItems.push({
          evidence_type: "FINANCIAL",
          metric_name: "TOTAL_REVENUE_INR",
          metric_value: `₹${Number(orderStats[0].total_revenue || 0).toFixed(2)}`,
          sample_size: Number(orderStats[0].paid_orders || 0),
          source_reference: "orders table",
          confidence: 100,
        });
      }

      // 2. Refunds Evidence
      const refundStats = await queryMany<any>(
        `SELECT 
           COUNT(id) as refunds_count,
           COALESCE(SUM(amount_inr), 0) as refunded_amount
         FROM refunds
         WHERE product_id = $1 AND status = 'SUCCEEDED' AND is_demo = $2`,
        [subjectId, isDemo]
      );
      if (refundStats.length > 0 && Number(refundStats[0].refunds_count) > 0) {
        evidenceItems.push({
          evidence_type: "RISK",
          metric_name: "REFUNDS_COUNT",
          metric_value: String(refundStats[0].refunds_count),
          sample_size: Number(refundStats[0].refunds_count),
          source_reference: "refunds table",
          confidence: 100,
        });
      }

      // 3. Customer Success & Churn
      const csStats = await queryMany<any>(
        `SELECT 
           COUNT(c.id) as customers_count,
           COUNT(CASE WHEN c.retention_status = 'CHURNED' THEN 1 END) as churned_count,
           AVG(c.health_score) as avg_health
         FROM customers c
         JOIN orders o ON o.customer_id = c.id
         WHERE o.product_id = $1 AND c.is_demo = $2`,
        [subjectId, isDemo]
      );
      if (csStats.length > 0 && Number(csStats[0].customers_count) > 0) {
        evidenceItems.push({
          evidence_type: "RETENTION",
          metric_name: "CONFIRMED_CHURN_COUNT",
          metric_value: String(csStats[0].churned_count || 0),
          sample_size: Number(csStats[0].customers_count || 0),
          source_reference: "customers table",
          confidence: 90,
        });
        evidenceItems.push({
          evidence_type: "HEALTH",
          metric_name: "AVERAGE_HEALTH_SCORE",
          metric_value: `${Math.round(Number(csStats[0].avg_health || 0))}/100`,
          sample_size: Number(csStats[0].customers_count || 0),
          source_reference: "customer_success",
          confidence: 90,
        });
      }

      // 4. Support Tickets
      const ticketStats = await queryMany<any>(
        `SELECT COUNT(id) as ticket_count
         FROM support_tickets
         WHERE product_id = $1 AND is_demo = $2`,
        [subjectId, isDemo]
      );
      if (ticketStats.length > 0) {
        evidenceItems.push({
          evidence_type: "SUPPORT",
          metric_name: "SUPPORT_TICKETS_COUNT",
          metric_value: String(ticketStats[0].ticket_count || 0),
          sample_size: Number(ticketStats[0].ticket_count || 0),
          source_reference: "support_tickets table",
          confidence: 100,
        });
      }
    } else if (subjectType === "CAMPAIGN") {
      const campStats = await queryMany<any>(
        `SELECT 
           COALESCE(SUM(clicks_count), 0) as clicks,
           COALESCE(SUM(conversions_count), 0) as conversions,
           COALESCE(SUM(spend_inr), 0) as spend
         FROM campaigns
         WHERE id = $1 AND is_demo = $2`,
        [subjectId, isDemo]
      );
      if (campStats.length > 0) {
        evidenceItems.push({
          evidence_type: "DISTRIBUTION",
          metric_name: "CAMPAIGN_CLICKS",
          metric_value: String(campStats[0].clicks || 0),
          sample_size: Number(campStats[0].clicks || 0),
          source_reference: "campaigns table",
          confidence: 90,
        });
        evidenceItems.push({
          evidence_type: "DISTRIBUTION",
          metric_name: "CAMPAIGN_CONVERSIONS",
          metric_value: String(campStats[0].conversions || 0),
          sample_size: Number(campStats[0].conversions || 0),
          source_reference: "campaigns table",
          confidence: 95,
        });
      }
    }

    return evidenceItems;
  }

  /**
   * Persist gathered evidence linked to a decision
   */
  async recordDecisionEvidence(
    decisionId: string,
    evidenceItems: Array<Omit<DecisionEvidence, "id" | "decision_id" | "created_at">>
  ): Promise<DecisionEvidence[]> {
    const saved: DecisionEvidence[] = [];
    for (const item of evidenceItems) {
      const record: DecisionEvidence = {
        id: crypto.randomUUID(),
        decision_id: decisionId,
        evidence_type: item.evidence_type,
        metric_name: item.metric_name,
        metric_value: item.metric_value,
        sample_size: item.sample_size,
        source_reference: item.source_reference,
        confidence: item.confidence,
        created_at: new Date().toISOString(),
      };
      await intelligenceRepo.saveDecisionEvidence(record);
      saved.push(record);
    }
    return saved;
  }
}

export const evidenceCollector = new EvidenceCollector();
