import { listOpportunities, updateOpportunity } from "@/database/repositories/opportunity-repo";
import { validateOpportunity } from "@/validation/engine";
import { createAuditLog } from "@/database/repositories/audit-repo";
import type { CrossPhaseAdapterResult } from "@/types/runtime";

export class ValidationCycleAdapter {
  /**
   * Scans for unvalidated discovered opportunities and executes deterministic validation scoring
   */
  async execute(options?: { limit?: number; isDemo?: boolean }): Promise<CrossPhaseAdapterResult> {
    try {
      const limit = options?.limit || 3;
      const isDemo = options?.isDemo ?? false;

      // Find new/unvalidated candidates
      const { opportunities: allOpps } = await listOpportunities({ status: "new", limit: 50 });
      const candidates = allOpps.filter((o) => o.is_demo === isDemo).slice(0, limit);

      if (candidates.length === 0) {
        return {
          success: true,
          phase: 4,
          adapter_name: "ValidationCycleAdapter",
          items_processed: 0,
          status: "NOTHING_ELIGIBLE",
          details: { message: "No unvalidated opportunities discovered." },
        };
      }

      let validatedCount = 0;
      const results: Record<string, any>[] = [];

      for (const opp of candidates) {
        const validation = validateOpportunity(opp);

        await updateOpportunity(opp.id, {
          status: validation.validation_score >= 70 ? "validated" : "rejected",
          validation_score: validation.validation_score,
        });

        await createAuditLog({
          event_type: "OPPORTUNITY_UPDATED",
          entity_type: "opportunity",
          entity_id: opp.id,
          actor: "validation_cycle_adapter",
          details: {
            title: opp.title,
            validation_score: validation.validation_score,
            decision: validation.decision,
          },
        });

        results.push({ id: opp.id, score: validation.validation_score, decision: validation.decision });
        validatedCount++;
      }

      return {
        success: true,
        phase: 4,
        adapter_name: "ValidationCycleAdapter",
        items_processed: validatedCount,
        status: "SUCCESS",
        details: { validated_opportunities: results },
      };
    } catch (err: any) {
      return {
        success: false,
        phase: 4,
        adapter_name: "ValidationCycleAdapter",
        items_processed: 0,
        status: "FAILED",
        details: {},
        error: err.message || String(err),
      };
    }
  }
}

export const validationCycleAdapter = new ValidationCycleAdapter();
