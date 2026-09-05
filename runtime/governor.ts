import { runtimeConfigManager } from "./config";
import { runtimeRepo } from "@/database/repositories/runtime-repo";
import type { GovernorCheckResult } from "@/types/runtime";

export class ResourceGovernor {
  private activeJobsCount: number = 0;
  private activeDomainJobs: Map<string, number> = new Map();

  /**
   * Evaluates whether a new job can execute under current concurrency limits
   */
  async checkExecutionAllowed(module: string, action: string): Promise<GovernorCheckResult> {
    const config = await runtimeConfigManager.getConfig();

    const normalizedModule = module.toUpperCase();
    const activeDomain = this.activeDomainJobs.get(normalizedModule) || 0;

    // 1. Global Concurrency Check
    if (this.activeJobsCount >= config.max_global_concurrency) {
      return {
        allowed: false,
        reason: `Global concurrency limit reached (${this.activeJobsCount}/${config.max_global_concurrency} active jobs). Waiting for available worker slot.`,
        activeGlobalCount: this.activeJobsCount,
        activeDomainCount: activeDomain,
        retryAfterMs: 2000,
      };
    }

    // 2. AI Module Limit (Prevent runaway parallel LLM calls)
    if ((normalizedModule === "PRODUCT_BUILDER" || action.includes("AI")) && activeDomain >= config.max_ai_concurrency) {
      return {
        allowed: false,
        reason: `AI module concurrency limit reached (${activeDomain}/${config.max_ai_concurrency} active LLM jobs). Throttling to zero-cost rate.`,
        activeGlobalCount: this.activeJobsCount,
        activeDomainCount: activeDomain,
        retryAfterMs: 3000,
      };
    }

    // 3. Research Scraper Limit (Prevent remote rate limits)
    if (normalizedModule === "RESEARCH" && activeDomain >= config.max_research_concurrency) {
      return {
        allowed: false,
        reason: `Research scraper concurrency limit reached (${activeDomain}/${config.max_research_concurrency} active scrapers). Waiting for cool-off.`,
        activeGlobalCount: this.activeJobsCount,
        activeDomainCount: activeDomain,
        retryAfterMs: 2500,
      };
    }

    return {
      allowed: true,
      activeGlobalCount: this.activeJobsCount,
      activeDomainCount: activeDomain,
    };
  }

  /**
   * Acquire execution slot
   */
  acquireSlot(module: string): void {
    const normalized = module.toUpperCase();
    this.activeJobsCount++;
    this.activeDomainJobs.set(normalized, (this.activeDomainJobs.get(normalized) || 0) + 1);
  }

  /**
   * Release execution slot
   */
  releaseSlot(module: string): void {
    const normalized = module.toUpperCase();
    this.activeJobsCount = Math.max(0, this.activeJobsCount - 1);
    const count = this.activeDomainJobs.get(normalized) || 0;
    if (count <= 1) {
      this.activeDomainJobs.delete(normalized);
    } else {
      this.activeDomainJobs.set(normalized, count - 1);
    }
  }

  /**
   * Record periodic resource telemetry
   */
  async recordUsageTelemetry(queuedCount: number = 0, deadLetterCount: number = 0): Promise<void> {
    const config = await runtimeConfigManager.getConfig();
    const saturation = config.max_global_concurrency > 0
      ? Math.round((this.activeJobsCount / config.max_global_concurrency) * 10000) / 100
      : 0;

    await runtimeRepo.recordResourceUsage({
      active_workers: 1,
      active_jobs: this.activeJobsCount,
      queued_jobs: queuedCount,
      dead_letter_jobs: deadLetterCount,
      ai_active_requests: this.activeDomainJobs.get("PRODUCT_BUILDER") || 0,
      research_active_requests: this.activeDomainJobs.get("RESEARCH") || 0,
      concurrency_saturation_percent: saturation,
    }).catch(() => null);
  }

  getActiveGlobalCount(): number {
    return this.activeJobsCount;
  }

  getActiveDomainCount(module: string): number {
    return this.activeDomainJobs.get(module.toUpperCase()) || 0;
  }
}

export const resourceGovernor = new ResourceGovernor();
