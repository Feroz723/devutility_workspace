import { strategyRepo } from "@/database/repositories/strategy-repo";
import { funnelAnalysisEngine } from "./funnel-analysis-engine";
import { getLatestBusinessSnapshot } from "@/database/repositories/intelligence-repo";
import { queryMany } from "@/database/client";
import { listRefunds, listOrders } from "@/database/repositories/sales-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import type {
  BottleneckType,
  StrategyBottleneck,
} from "@/types/strategy";

export class BottleneckDetector {
  /**
   * Scan telemetry across systems to detect and rank structural bottlenecks
   */
  async detectBottlenecks(
    productId?: string | null,
    isDemo: boolean = false
  ): Promise<StrategyBottleneck[]> {
    const funnelStages = await funnelAnalysisEngine.analyzeFunnel(productId, isDemo);
    const snapshot = await getLatestBusinessSnapshot({ is_demo: isDemo }).catch(() => null);
    const [failedDeliveries, refunds, orders] = await Promise.all([
      queryMany<any>(`SELECT id FROM delivery_tasks WHERE status = 'FAILED' LIMIT 100`).catch(() => []),
      listRefunds({ includeDemo: isDemo, limit: 100 }).catch(() => []),
      listOrders({ includeDemo: isDemo, limit: 100 }).catch(() => []),
    ]);

    const candidates: Array<{
      type: BottleneckType;
      severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      magnitude: number;
      impact: number;
      sampleSize: number;
      evidenceStrength: string;
      reversibility: string;
      resourceRequirement: string;
      description: string;
      recommendedFocus: string;
      evidenceData: Record<string, any>;
    }> = [];

    // 1. Demand & Awareness Bottleneck Check
    const visitStage = funnelStages.find((s) => s.stage_name === "VISIT");
    const reachStage = funnelStages.find((s) => s.stage_name === "REACH");
    const totalVisits = visitStage?.raw_count ?? 0;

    if (totalVisits < 20) {
      candidates.push({
        type: "awareness",
        severity: "HIGH",
        magnitude: 85,
        impact: 90,
        sampleSize: totalVisits,
        evidenceStrength: totalVisits > 0 ? "OBSERVED" : "INITIAL",
        reversibility: "HIGH",
        resourceRequirement: "ZERO_COST_CONTENT_AND_OUTREACH",
        description: `Total visitor count is critically low (${totalVisits} visits). Top of funnel exposure is the primary constraint.`,
        recommendedFocus: "Execute high-reach organic distribution and direct outreach loops",
        evidenceData: { visits: totalVisits, reaches: reachStage?.raw_count ?? 0 },
      });
    }

    // 2. Landing Page Conversion Bottleneck Check
    const signupStage = funnelStages.find((s) => s.stage_name === "SIGNUP");
    if (totalVisits >= 20 && (signupStage?.raw_count ?? 0) === 0) {
      candidates.push({
        type: "landing_page_conversion",
        severity: "HIGH",
        magnitude: 80,
        impact: 85,
        sampleSize: totalVisits,
        evidenceStrength: "OBSERVED",
        reversibility: "HIGH",
        resourceRequirement: "COPYWRITING_AND_UI_TUNING",
        description: `Zero signups from ${totalVisits} visits. Visitor traffic is landing but failing to take initial conversion action.`,
        recommendedFocus: "Clarify headline value proposition and remove signup form friction",
        evidenceData: { visits: totalVisits, signups: signupStage?.raw_count ?? 0 },
      });
    }

    // 3. Checkout & Payment Bottleneck Check
    const paidOrders = orders.filter((o: any) => o.status === "PAID" || o.payment_status === "PAID");
    const checkoutDropoff = funnelStages.find((s) => s.stage_name === "PAYMENT");
    if ((signupStage?.raw_count ?? 0) >= 10 && paidOrders.length === 0) {
      candidates.push({
        type: "checkout",
        severity: "CRITICAL",
        magnitude: 90,
        impact: 95,
        sampleSize: signupStage?.raw_count ?? 0,
        evidenceStrength: "OBSERVED",
        reversibility: "MEDIUM",
        resourceRequirement: "CHECKOUT_FLOW_INSPECTION",
        description: `Users are signing up (${signupStage?.raw_count} signups) but zero users have completed payment.`,
        recommendedFocus: "Inspect pricing threshold and ensure payment gateway integration is working seamlessly",
        evidenceData: { signups: signupStage?.raw_count, paid_orders: paidOrders.length },
      });
    }

    // 4. Delivery Bottleneck Check
    if (failedDeliveries.length > 0) {
      candidates.push({
        type: "delivery",
        severity: "HIGH",
        magnitude: 75,
        impact: 80,
        sampleSize: failedDeliveries.length,
        evidenceStrength: "OBSERVED",
        reversibility: "HIGH",
        resourceRequirement: "DELIVERY_PIPELINE_FIX",
        description: `${failedDeliveries.length} fulfillment delivery tasks have failed. Customer onboarding blocked.`,
        recommendedFocus: "Resolve delivery executor exceptions and retry pending fulfillments",
        evidenceData: { failed_deliveries_count: failedDeliveries.length },
      });
    }

    // 5. Product Value / Retention Bottleneck Check
    const processedRefunds = refunds.filter((r: any) => r.status === "PROCESSED" || r.status === "APPROVED");
    if (paidOrders.length >= 5 && (processedRefunds.length / paidOrders.length) > 0.2) {
      const refundRate = Math.round((processedRefunds.length / paidOrders.length) * 100);
      candidates.push({
        type: "product_value",
        severity: "CRITICAL",
        magnitude: 95,
        impact: 95,
        sampleSize: paidOrders.length,
        evidenceStrength: "OBSERVED",
        reversibility: "MEDIUM",
        resourceRequirement: "PRODUCT_CORE_UPGRADE",
        description: `High refund rate (${refundRate}%) detected. Customers are purchasing but returning product due to value gap.`,
        recommendedFocus: "Conduct urgent root cause analysis on customer complaints and upgrade core deliverable",
        evidenceData: { paid_orders: paidOrders.length, refunds: processedRefunds.length, refund_rate: refundRate },
      });
    }

    // Default fallback bottleneck if all systems healthy or very early
    if (candidates.length === 0) {
      candidates.push({
        type: "distribution",
        severity: "LOW",
        magnitude: 40,
        impact: 50,
        sampleSize: totalVisits,
        evidenceStrength: "BASELINE",
        reversibility: "HIGH",
        resourceRequirement: "ZERO_COST_EXECUTION",
        description: "Standard top-of-funnel distribution expansion needed to build statistical sample volume.",
        recommendedFocus: "Continue scheduled organic publishing and distribution channels",
        evidenceData: { note: "Telemetry healthy; continuing standard operating rhythm" },
      });
    }

    // Rank candidates by composite score: magnitude * 0.5 + impact * 0.5
    candidates.sort((a, b) => (b.magnitude * 0.5 + b.impact * 0.5) - (a.magnitude * 0.5 + a.impact * 0.5));

    // Save bottlenecks to database, designating top one as PRIMARY
    const savedBottlenecks: StrategyBottleneck[] = [];

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (!c) continue;
      const isPrimary = i === 0;

      const saved = await strategyRepo.createBottleneck({
        bottleneck_type: c.type,
        product_id: productId || null,
        severity: c.severity,
        magnitude_score: c.magnitude,
        business_impact_score: c.impact,
        evidence_strength: c.evidenceStrength,
        sample_size: c.sampleSize,
        reversibility: c.reversibility,
        resource_requirement: c.resourceRequirement,
        is_primary: isPrimary,
        evidence_data: c.evidenceData,
        description: c.description,
        recommended_focus: c.recommendedFocus,
        is_resolved: false,
        is_demo: isDemo,
      });

      if (isPrimary) {
        await createAuditLog({
          event_type: "BOTTLENECK_DETECTED",
          entity_type: "STRATEGY_BOTTLENECK",
          entity_id: saved.id,
          actor: "bottleneck_detector",
          details: {
            bottleneck_type: saved.bottleneck_type,
            severity: saved.severity,
            magnitude_score: saved.magnitude_score,
            description: saved.description,
          },
        });
      }

      savedBottlenecks.push(saved);
    }

    return savedBottlenecks;
  }

  /**
   * Get current primary active bottleneck
   */
  async getPrimaryBottleneck(isDemo: boolean = false): Promise<StrategyBottleneck | null> {
    return strategyRepo.getPrimaryBottleneck(isDemo);
  }
}

export const bottleneckDetector = new BottleneckDetector();
