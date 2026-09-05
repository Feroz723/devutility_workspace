import { generateResearchQueries } from "./queries";
import { getRotatedProviders, getProvider } from "./providers";
import { getCachedContent, setCachedContent } from "./cache";
import { extractOpportunityFromContent } from "./extractor";
import { calculateResearchConfidence, evaluateAutonomousReadiness } from "./confidence";
import { findExistingDuplicate, mergeEvidence } from "./deduplication";
import { scoreOpportunity } from "@/decision-engine/scoring";
import {
  createResearchRun,
  updateResearchRun,
  createOpportunityEvidence,
  getEvidenceByOpportunityId,
} from "@/database/repositories/research-repo";
import {
  createOpportunity,
  updateOpportunity,
  listOpportunities,
} from "@/database/repositories/opportunity-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import type {
  ResearchCycleOptions,
  ResearchCycleResult,
  RawResearchItem,
} from "./types";

/**
 * Execute a complete bounded research cycle.
 * Every cycle produces an auditable research_run ID and records exact real statistics.
 */
export async function executeResearchCycle(
  options: ResearchCycleOptions = {}
): Promise<ResearchCycleResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  // 1. Create a research run record
  const runRecord = await createResearchRun({
    run_type: "comprehensive",
    cost_classification: "FREE",
  });
  const runId = runRecord.id;

  try {
    // 2. Determine queries to execute
    const queries = options.queries && options.queries.length > 0
      ? options.queries
      : await generateResearchQueries(2);

    // 3. Determine providers
    const activeProviders = options.providers && options.providers.length > 0
      ? options.providers.map((id) => getProvider(id)).filter(Boolean)
      : getRotatedProviders(2);

    if (activeProviders.length === 0) {
      throw new Error("No active research providers available.");
    }

    const collectedItems: RawResearchItem[] = [];

    // 4. Execute searches across providers
    for (const provider of activeProviders) {
      if (!provider) continue;
      for (const query of queries) {
        try {
          const items = await provider.search(query, { limit: options.maxItemsPerQuery ?? 5 });
          // Fetch fuller content for top items if not cached
          for (const item of items) {
            if (item.sourceUrl && !item.content.includes("Target URL")) {
              const cached = await getCachedContent(item.sourceUrl);
              if (cached) {
                item.content += `\n\n${cached.slice(0, 2000)}`;
              } else {
                try {
                  const fetched = await provider.fetch(item.sourceUrl);
                  if (fetched) {
                    await setCachedContent(item.sourceUrl, fetched);
                    item.content += `\n\n${fetched.slice(0, 2000)}`;
                  }
                } catch {
                  // If fetching details fails, retain search snippet
                }
              }
            }
          }
          collectedItems.push(...items);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Provider [${provider.id}] search error for "${query}": ${msg}`);
        }
      }
    }

    // 5. Fetch existing opportunities for deduplication
    const { opportunities: existingList } = await listOpportunities({ limit: 100 });

    let opportunitiesCreated = 0;
    let opportunitiesUpdated = 0;
    let evidenceCollected = 0;

    // 6. Extract candidates and store
    for (const item of collectedItems) {
      try {
        const extraction = await extractOpportunityFromContent(item);
        if (extraction.error) {
          errors.push(`Extraction notice: ${extraction.error}`);
        }

        const candidate = extraction.candidate;
        if (!candidate) continue;

        // Check for deduplication
        const match = findExistingDuplicate(candidate, existingList);

        if (match.isDuplicate && match.matchedOpportunity) {
          // --- Existing opportunity: Update & merge evidence ---
          const oppId = match.matchedOpportunity.id;
          const existingEvidence = await getEvidenceByOpportunityId(oppId);
          const { merged, addedCount } = mergeEvidence(existingEvidence, candidate.evidence);

          if (addedCount > 0) {
            for (const newEv of candidate.evidence) {
              await createOpportunityEvidence(oppId, newEv);
            }
            evidenceCollected += addedCount;
          }

          const conf = calculateResearchConfidence(merged);
          const currentCount = match.matchedOpportunity.research_run_count ?? 0;

          await updateOpportunity(oppId, {
            research_confidence: conf.confidenceScore,
            evidence_count: merged.length,
            source_count: conf.sourceCount,
            last_researched_at: new Date().toISOString(),
            research_run_count: currentCount + 1,
          });

          opportunitiesUpdated++;
        } else {
          // --- New Opportunity: Calculate confidence & initial score ---
          const conf = calculateResearchConfidence(candidate.evidence);

          // Deterministic scoring engine from Phase 2
          const scoreResult = scoreOpportunity({
            demand_score: candidate.demand_factor,
            competition_score: candidate.competition_factor,
            monetization_score: candidate.monetization_factor,
            automation_score: candidate.automation_factor,
            zero_cost_score: candidate.zero_cost_factor,
          });

          // Autonomous decision check
          const readiness = evaluateAutonomousReadiness({
            overallScore: scoreResult.overall_score,
            researchConfidence: conf.confidenceScore,
            zeroCostScore: candidate.zero_cost_factor,
          });

          const newOpp = await createOpportunity({
            title: candidate.title,
            problem: candidate.problem,
            problem_statement: candidate.problem,
            target_customer: candidate.target_customer,
            target_market: candidate.target_market,
            source: candidate.evidence[0]?.source_name || "Research Engine",
            source_url: candidate.primary_source_url || candidate.evidence[0]?.source_url,
            demand_score: candidate.demand_factor,
            competition_score: candidate.competition_factor,
            monetization_score: candidate.monetization_factor,
            automation_score: candidate.automation_factor,
            zero_cost_score: candidate.zero_cost_factor,
            overall_score: scoreResult.overall_score,
            decision: readiness.decision,
            status: readiness.decision === "TEST" ? "testing" : "researching",
            research_confidence: conf.confidenceScore,
            evidence_count: candidate.evidence.length,
            source_count: conf.sourceCount,
            last_researched_at: new Date().toISOString(),
            research_run_count: 1,
            competitors: candidate.existing_solutions ?? [],
            monetization_type: candidate.monetization_model,
            monetization_confidence: candidate.monetization_confidence,
            is_demo: false, // REAL public data, never flagged demo
          });

          // Save evidence
          for (const ev of candidate.evidence) {
            await createOpportunityEvidence(newOpp.id, ev);
            evidenceCollected++;
          }

          // Add to existing list for subsequent deduplication within the same cycle
          existingList.push(newOpp);
          opportunitiesCreated++;
        }
      } catch (itemErr) {
        const msg = itemErr instanceof Error ? itemErr.message : String(itemErr);
        errors.push(`Item processing error: ${msg}`);
      }
    }

    const durationMs = Date.now() - startTime;

    // 7. Update research run record
    const summary = {
      queries_executed: queries,
      providers_used: activeProviders.filter((p): p is NonNullable<typeof p> => Boolean(p)).map((p) => p.id),
      raw_items_found: collectedItems.length,
      opportunities_created: opportunitiesCreated,
      opportunities_updated: opportunitiesUpdated,
      evidence_collected: evidenceCollected,
    };

    await updateResearchRun(runId, {
      status: "completed",
      result_summary: summary,
      opportunities_created: opportunitiesCreated,
      opportunities_updated: opportunitiesUpdated,
      evidence_collected: evidenceCollected,
      duration_ms: durationMs,
      error: errors.length > 0 ? errors.join("; ") : undefined,
    });

    // 8. Audit log
    await createAuditLog({
      event_type: "AUTOMATION_COMPLETED",
      entity_type: "research_run",
      entity_id: runId,
      actor: "research-engine",
      details: summary,
    });

    return {
      runId,
      status: "completed",
      queriesExecuted: queries,
      providersUsed: activeProviders.filter((p): p is NonNullable<typeof p> => Boolean(p)).map((p) => p.name),
      rawItemsFound: collectedItems.length,
      opportunitiesCreated,
      opportunitiesUpdated,
      evidenceCollected,
      durationMs,
      errors,
      costClassification: "FREE",
    };
  } catch (fatalErr) {
    const durationMs = Date.now() - startTime;
    const msg = fatalErr instanceof Error ? fatalErr.message : String(fatalErr);
    errors.push(msg);

    await updateResearchRun(runId, {
      status: "failed",
      duration_ms: durationMs,
      error: msg,
    });

    return {
      runId,
      status: "failed",
      queriesExecuted: [],
      providersUsed: [],
      rawItemsFound: 0,
      opportunitiesCreated: 0,
      opportunitiesUpdated: 0,
      evidenceCollected: 0,
      durationMs,
      errors,
      costClassification: "FREE",
    };
  }
}
