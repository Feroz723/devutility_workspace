import { queryMany } from "@/database/client";
import { intelligenceRepo } from "@/database/repositories/intelligence-repo";
import { businessSnapshotAggregator } from "./snapshot";
import { businessMetricsEngine } from "./metrics";
import { unitEconomicsEngine } from "./unit-economics";
import { productPerformanceEvaluator } from "./product-performance";
import { channelPerformanceEvaluator } from "./channel-performance";
import { offerPerformanceEvaluator } from "./offer-performance";
import { customerCohortAnalyzer } from "./cohorts";
import { businessRiskDetector } from "./risk";
import { businessGoalTracker } from "./goals";
import { resourceAllocationEngine } from "./resource-allocation";
import { businessForecastingEngine } from "./forecast";
import { businessLearningEngine } from "./learning";
import { portfolioDecisionEngine } from "./decision-engine";
import type { BusinessJob } from "@/types/intelligence";

export interface BIRunnerResult {
  job_id: string;
  status: "COMPLETED" | "FAILED";
  snapshot_id: string;
  products_evaluated: number;
  channels_evaluated: number;
  offers_evaluated: number;
  risks_detected: number;
  decisions_proposed: number;
  execution_duration_ms: number;
  error?: string;
}

export class AutonomousIntelligenceRunner {
  /**
   * Run the full Phase 10 Autonomous Business Intelligence cycle
   */
  async runIntelligenceCycle(isDemo: boolean = false): Promise<BIRunnerResult> {
    const startTime = Date.now();
    const jobId = crypto.randomUUID();

    // 1. Log job start
    const job: BusinessJob = {
      id: jobId,
      job_type: "COLLECT_SNAPSHOT",
      status: "RUNNING",
      payload: { is_demo: isDemo },
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    await intelligenceRepo.saveJob(job);

    try {
      // 2. Ensure baseline goals exist
      await businessGoalTracker.ensureBaselineGoals(isDemo);

      // 3. Collect Business Snapshot across Phases 1-9
      const snapshotResult = await businessSnapshotAggregator.captureSnapshot(isDemo);

      // 4. Compute Funnel Metrics
      const funnel = await businessMetricsEngine.computeFunnelMetrics(isDemo);

      // 5. Compute Unit Economics
      await unitEconomicsEngine.computeEconomics(undefined, isDemo);

      // 6. Evaluate all products
      const products = await queryMany<any>(`SELECT id, name FROM products WHERE is_demo = $1`, [isDemo]);
      let productsEvaluated = 0;
      let decisionsCount = 0;

      for (const p of products) {
        await productPerformanceEvaluator.evaluateProduct(p.id, isDemo);
        await unitEconomicsEngine.computeEconomics(p.id, isDemo);
        const evalRes = await portfolioDecisionEngine.evaluateSubject("PRODUCT", p.id, p.name, isDemo);
        if (evalRes) decisionsCount++;
        productsEvaluated++;
      }

      // 7. Evaluate channels
      const channels = ["REDDIT", "DEVTO", "HACKERNEWS", "TWITTER", "DIRECT"];
      let channelsEvaluated = 0;
      for (const ch of channels) {
        await channelPerformanceEvaluator.evaluateChannel(ch, undefined, isDemo);
        channelsEvaluated++;
      }

      // 8. Evaluate offers
      const offers = await queryMany<any>(`SELECT id, title FROM offers WHERE is_demo = $1`, [isDemo]);
      let offersEvaluated = 0;
      for (const o of offers) {
        await offerPerformanceEvaluator.evaluateOffer(o.id, isDemo);
        const evalRes = await portfolioDecisionEngine.evaluateSubject("OFFER", o.id, o.title, isDemo);
        if (evalRes) decisionsCount++;
        offersEvaluated++;
      }

      // 9. Analyze Customer Cohorts
      await customerCohortAnalyzer.analyzeCohorts(isDemo);

      // 10. Detect Business Risks
      const risks = await businessRiskDetector.detectRisks(isDemo);

      // 11. Evaluate Goals
      await businessGoalTracker.evaluateGoals(isDemo);

      // 12. Rebalance Non-monetary Resource Allocations
      await resourceAllocationEngine.rebalanceAllocations(
        funnel,
        snapshotResult.snapshot.open_support_tickets_count,
        isDemo
      );

      // 13. Generate Deterministic Forecasts
      await businessForecastingEngine.generateForecasts(isDemo);

      // 14. Harvest Learnings
      await businessLearningEngine.harvestLearnings(isDemo);

      const duration = Date.now() - startTime;

      // 15. Update job status to COMPLETED
      await intelligenceRepo.updateJobStatus(jobId, "COMPLETED", {
        products_evaluated: productsEvaluated,
        channels_evaluated: channelsEvaluated,
        offers_evaluated: offersEvaluated,
        risks_detected: risks.length,
        decisions_proposed: decisionsCount,
        duration_ms: duration,
      });

      // 16. Log audit event
      await intelligenceRepo.logEvent(
        "BUSINESS_JOB_COMPLETED",
        "BUSINESS_JOB",
        jobId,
        {
          snapshot_id: snapshotResult.snapshot.id,
          duration_ms: duration,
          is_demo: isDemo,
        }
      );

      return {
        job_id: jobId,
        status: "COMPLETED",
        snapshot_id: snapshotResult.snapshot.id,
        products_evaluated: productsEvaluated,
        channels_evaluated: channelsEvaluated,
        offers_evaluated: offersEvaluated,
        risks_detected: risks.length,
        decisions_proposed: decisionsCount,
        execution_duration_ms: duration,
      };
    } catch (err: any) {
      const duration = Date.now() - startTime;
      await intelligenceRepo.updateJobStatus(jobId, "FAILED", null, err?.message || String(err));
      return {
        job_id: jobId,
        status: "FAILED",
        snapshot_id: "",
        products_evaluated: 0,
        channels_evaluated: 0,
        offers_evaluated: 0,
        risks_detected: 0,
        decisions_proposed: 0,
        execution_duration_ms: duration,
        error: err?.message || String(err),
      };
    }
  }
}

export const autonomousIntelligenceRunner = new AutonomousIntelligenceRunner();
