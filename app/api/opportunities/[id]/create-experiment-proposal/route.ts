import { NextRequest, NextResponse } from "next/server";
import { getOpportunityById, updateOpportunity } from "@/database/repositories/opportunity-repo";
import { createExperiment } from "@/database/repositories/experiment-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";
import { generateExperimentProposal } from "@/validation/experiment-proposal";
import type { ExperimentProposal } from "@/validation/types";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const opportunity = await getOpportunityById(params.id);
    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    let proposal: ExperimentProposal;
    if (opportunity.experiment_proposal && typeof opportunity.experiment_proposal === "object") {
      proposal = opportunity.experiment_proposal as ExperimentProposal;
    } else {
      proposal = generateExperimentProposal({
        title: opportunity.title,
        target_customer: opportunity.target_customer,
        target_market: opportunity.target_market,
        source: opportunity.source,
      });
    }

    // Create the experiment record
    const experiment = await createExperiment({
      opportunity_id: params.id,
      title: `[₹0 Experiment] ${opportunity.title}`,
      hypothesis: proposal.hypothesis,
      target_customer: opportunity.target_customer || "Target Audience",
      success_criteria: `${proposal.primary_metric}: ${proposal.target_metric_value}`,
      stage: "VALIDATION",
      status: "active",
      start_date: new Date().toISOString(),
      is_demo: opportunity.is_demo,
    });

    // Mark opportunity as testing
    await updateOpportunity(params.id, {
      status: "testing",
      decision: "TEST",
    });

    await createAuditLog({
      event_type: "EXPERIMENT_CREATED_FROM_PROPOSAL",
      entity_type: "experiment",
      entity_id: experiment.id,
      actor: "validation_engine",
      details: {
        opportunity_id: params.id,
        test_type: proposal.test_type,
        channel: proposal.channel,
        cost_inr: proposal.cost_estimate_inr,
      },
    });

    return NextResponse.json({
      experiment,
      proposal,
      message: "Experiment candidate initiated successfully with ₹0 spend commitment.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
