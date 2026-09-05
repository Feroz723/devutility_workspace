import { NextRequest, NextResponse } from "next/server";
import { getOpportunityById, updateOpportunity } from "@/database/repositories/opportunity-repo";
import {
  createExperiment,
  getExperimentByOpportunityAndHypothesis,
} from "@/database/repositories/experiment-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import { generateExperimentProposal } from "@/validation/experiment-proposal";
import type { ExperimentProposal } from "@/validation/types";
import type { ExperimentType } from "@/types/experiment";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const opp = await getOpportunityById(params.id);
    if (!opp) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    // 1. Verify Preconditions
    const failedConditions: string[] = [];

    const overallScore = opp.overall_score ?? 0;
    const researchConfidence = opp.research_confidence ?? 0;
    const validationScore = opp.validation_score ?? 0;
    const sourceCount = opp.source_count ?? (opp.source_url ? 1 : 0);
    const zeroCostScore = opp.zero_cost_score ?? 0;

    let directEvidenceCount = 0;
    if (Array.isArray(opp.evidence)) {
      directEvidenceCount = opp.evidence.filter((e) => (e.quote || e.evidence_text || "").length > 10).length;
    } else if (typeof opp.evidence === "string") {
      try {
        const parsed = JSON.parse(opp.evidence);
        if (Array.isArray(parsed)) {
          directEvidenceCount = parsed.filter((e) => (e.quote || e.evidence_text || "").length > 10).length;
        }
      } catch {
        directEvidenceCount = 0;
      }
    }

    if (overallScore < 80) {
      failedConditions.push(`Overall score (${overallScore}) is below required threshold of 80.`);
    }
    if (researchConfidence < 60) {
      failedConditions.push(`Research confidence (${researchConfidence}%) is below required threshold of 60%.`);
    }
    if (validationScore < 70) {
      failedConditions.push(`Validation score (${validationScore}%) is below required threshold of 70%.`);
    }
    if (sourceCount < 2) {
      failedConditions.push(`Requires at least 2 independent research sources (found ${sourceCount}).`);
    }
    if (directEvidenceCount < 1) {
      failedConditions.push(`Requires at least 1 direct evidence item (found ${directEvidenceCount}).`);
    }
    if (zeroCostScore < 50) {
      failedConditions.push(`Zero-cost feasibility score (${zeroCostScore}) is below 50.`);
    }
    if (opp.decision === "BLOCKED" || (opp.risk_level && opp.risk_level.toLowerCase() === "critical")) {
      failedConditions.push("Opportunity is BLOCKED due to policy or critical safety constraints.");
    }

    if (failedConditions.length > 0) {
      return NextResponse.json(
        {
          error: "Opportunity failed one or more experiment eligibility preconditions.",
          failed_conditions: failedConditions,
        },
        { status: 400 }
      );
    }

    // 2. Extract or generate experiment proposal
    let proposal: ExperimentProposal;
    if (opp.experiment_proposal && typeof opp.experiment_proposal === "object") {
      proposal = opp.experiment_proposal as ExperimentProposal;
    } else {
      proposal = generateExperimentProposal({
        title: opp.title,
        target_customer: opp.target_customer,
        target_market: opp.target_market,
        source: opp.source,
      });
    }

    // 3. Idempotency check: if experiment already exists with matching hypothesis
    const existing = await getExperimentByOpportunityAndHypothesis(opp.id, proposal.hypothesis);
    if (existing) {
      return NextResponse.json({
        experiment: existing,
        idempotent: true,
        message: "An experiment already exists for this opportunity and hypothesis. Existing experiment returned.",
      });
    }

    // 4. Map proposal test_type to ExperimentType
    let experimentType: ExperimentType = "LANDING_PAGE";
    if (proposal.test_type === "WAITLIST_LANDING_PAGE") {
      experimentType = "WAITLIST";
    } else if (proposal.test_type === "COMMUNITY_POST") {
      experimentType = "COMMUNITY_TEST";
    } else if (proposal.test_type === "MANUAL_CONCIERGE") {
      experimentType = "CONCIERGE_MVP";
    }

    const durationDays = proposal.duration_days || 7;
    const startDate = new Date().toISOString().split("T")[0];
    const endDate = new Date(Date.now() + durationDays * 86400000).toISOString().split("T")[0];

    // 5. Create Experiment
    const experiment = await createExperiment({
      opportunity_id: opp.id,
      title: `[₹0 Experiment] ${opp.title}`,
      experiment_type: experimentType,
      hypothesis: proposal.hypothesis,
      problem: opp.problem || opp.problem_statement || "Workflow bottleneck",
      solution: `Zero-friction digital utility resolving ${opp.title}`,
      target_customer: opp.target_customer || "Target Audience",
      channel: proposal.channel,
      success_criteria: `${proposal.primary_metric}: ${proposal.target_metric_value}`,
      failure_criteria: [
        { condition: "Zero signups or conversions after full duration window", triggered: false },
        { condition: "Negative customer sentiment or platform restriction", triggered: false },
      ],
      time_window: {
        duration_days: durationDays,
        start_date: startDate,
        planned_end_date: endDate,
      },
      estimated_cost_inr: 0, // Enforce strict ₹0 policy
      actual_cost_inr: 0,
      cost_classification: "FREE",
      human_actions: [
        { step: 1, action: "Review experiment copy and value proposition" },
        { step: 2, action: "Verify zero-cost execution before launch" },
      ],
      automation_actions: proposal.step_by_step_plan.map((s) => ({
        step: s.step,
        description: s.description,
        tool: s.tool,
        cost_inr: s.cost_inr,
      })),
      hypothesis_details: {
        hypothesis: proposal.hypothesis,
        assumption: "Users actively experiencing this problem are searching for a lightweight, focused alternative.",
        expected_behavior: "Users will submit their email to gain early access or try the tool.",
        measurement: proposal.primary_metric,
        success_threshold: proposal.target_metric_value,
        failure_threshold: "0 signups or positive inquiries within 7 days",
        target_metrics: [
          { name: "views", target_value: 50 },
          { name: "clicks", target_value: 20 },
          { name: "signups", target_value: 10 },
        ],
      },
      stage: "VALIDATION",
      status: "PROPOSED",
      start_date: startDate,
      end_date: endDate,
      is_demo: opp.is_demo,
    });

    // Update opportunity status
    await updateOpportunity(opp.id, {
      status: "testing",
      decision: "TEST",
    });

    await createAuditLog({
      event_type: "EXPERIMENT_PROPOSED",
      entity_type: "experiment",
      entity_id: experiment.id,
      actor: "experiment_engine",
      details: {
        opportunity_id: opp.id,
        experiment_type: experimentType,
        cost_inr: 0,
      },
    });

    return NextResponse.json({
      experiment,
      idempotent: false,
      message: "Experiment created successfully under ₹0 zero-spend policy.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
