import { runtimeRepo } from "@/database/repositories/runtime-repo";
import { RuntimeConfigSchema, type RuntimeConfig } from "@/types/runtime";

export class RuntimeConfigManager {
  private cachedConfig: RuntimeConfig | null = null;
  private lastFetchedAt: number = 0;
  private readonly CACHE_TTL_MS = 5000; // 5-second in-memory cache

  /**
   * Get active runtime configuration with safe validation
   */
  async getConfig(): Promise<RuntimeConfig> {
    const now = Date.now();
    if (this.cachedConfig && now - this.lastFetchedAt < this.CACHE_TTL_MS) {
      return this.cachedConfig;
    }

    try {
      const raw = await runtimeRepo.getRuntimeConfig();
      const parsed = RuntimeConfigSchema.safeParse(raw);
      if (parsed.success) {
        this.cachedConfig = parsed.data;
        this.lastFetchedAt = now;
        return this.cachedConfig;
      }
    } catch {
      // Return safe defaults on error
    }

    return {
      id: "global",
      worker_enabled: true,
      scheduler_enabled: true,
      safe_mode: false,
      dry_run: false,
      polling_interval_ms: 2000,
      max_global_concurrency: 5,
      max_ai_concurrency: 1,
      max_research_concurrency: 2,
      daily_cycle_interval_hours: 24,
      weekly_cycle_interval_days: 7,
      stale_job_threshold_minutes: 15,
      default_retry_limit: 3,
      metadata: {},
    };
  }

  /**
   * Update runtime configuration dynamically
   */
  async updateConfig(patch: Partial<RuntimeConfig>): Promise<RuntimeConfig> {
    // Validate inputs
    if (patch.polling_interval_ms !== undefined && patch.polling_interval_ms < 500) {
      patch.polling_interval_ms = 500;
    }
    if (patch.max_global_concurrency !== undefined && patch.max_global_concurrency < 1) {
      patch.max_global_concurrency = 1;
    }

    const updated = await runtimeRepo.updateRuntimeConfig(patch);
    this.cachedConfig = updated;
    this.lastFetchedAt = Date.now();
    return updated;
  }

  /**
   * Invalidate cache
   */
  invalidateCache(): void {
    this.cachedConfig = null;
    this.lastFetchedAt = 0;
  }
}

export const runtimeConfigManager = new RuntimeConfigManager();
