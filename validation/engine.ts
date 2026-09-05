import type { Opportunity } from "@/types/opportunity";
import { ValidationResult } from "./types";
import { calculateValidationScore } from "./scoring";
import { classifyWillingnessToPay } from "./wtp";
import { extractCompetitors } from "./competitors";
import { buildCustomerProfile } from "./customer";
import { generateProposedSolution } from "./solution";
import { generateExperimentProposal } from "./experiment-proposal";
import { calculatePriorityScore } from "./priority";
import { evaluateCandidate } from "@/decision-engine/evaluation";

export function validateOpportunity(opportunity: Opportunity): ValidationResult {
  // Normalize evidence
  let evidenceList: Array<{ quote?: string; evidence_text?: string; source?: string; source_url?: string }> = [];
  if (Array.isArray(opportunity.evidence)) {
    evidenceList = opportunity.evidence;
  } else if (typeof opportunity.evidence === "string") {
    try {
      evidenceList = JSON.parse(opportunity.evidence);
    } catch {
      evidenceList = [];
    }
  }

  // Normalize competitors
  let competitorsList: unknown[] = [];
  if (Array.isArray(opportunity.competitors)) {
    competitorsList = opportunity.competitors;
  } else if (typeof opportunity.competitors === "string") {
    try {
      competitorsList = JSON.parse(opportunity.competitors);
    } catch {
      competitorsList = [];
    }
  }

  const directEvidenceCount = evidenceList.filter((e) => (e.quote || e.evidence_text || "").length > 10).length;
  const sourceCount = opportunity.source_count ?? (opportunity.source_url ? 1 : 0);

  // 1. Willingness to Pay
  const wtp = classifyWillingnessToPay(evidenceList, opportunity.problem || opportunity.title);

  // 2. Customer Persona
  const customerProfile = buildCustomerProfile({
    target_customer: opportunity.target_customer,
    target_market: opportunity.target_market,
    problem: opportunity.problem,
    problem_statement: opportunity.problem_statement,
    evidence: evidenceList,
  });

  // 3. Competitors & Differentiation
  const competitors = extractCompetitors(competitorsList, evidenceList, opportunity.title);

  // 4. Proposed Solution
  const proposedSolution = generateProposedSolution({
    title: opportunity.title,
    problem: opportunity.problem || opportunity.problem_statement,
    target_customer: opportunity.target_customer,
    automation_score: opportunity.automation_score,
  });

  // 5. Experiment Proposal
  const experimentProposal = generateExperimentProposal({
    title: opportunity.title,
    target_customer: opportunity.target_customer,
    target_market: opportunity.target_market,
    source: opportunity.source,
  });

  // 6. Category Scoring Inputs
  // Problem severity
  let severityScore = opportunity.demand_score ?? 60;
  const problemText = `${opportunity.problem || ""} ${opportunity.problem_statement || ""}`.toLowerCase();
  if (/critical|urgent|downtime|blocking|broken|loss|fail/i.test(problemText)) {
    severityScore = Math.min(100, severityScore + 15);
  }

  // Evidence strength
  const evidenceStrength = Math.min(
    100,
    Math.round(
      sourceCount * 25 +
        directEvidenceCount * 15 +
        (opportunity.research_confidence ?? 50) * 0.35
    )
  );

  // Distribution feasibility
  let distScore = 75;
  const source = (opportunity.source || "").toLowerCase();
  if (source.includes("reddit") || source.includes("hacker") || source.includes("github")) {
    distScore = 85;
  }

  const { total_score: validationScore, categories } = calculateValidationScore({
    problem_severity: severityScore,
    demand_evidence: opportunity.demand_score ?? 60,
    evidence_strength: evidenceStrength,
    willingness_to_pay: wtp.score,
    customer_clarity: customerProfile.clarity_score,
    mvp_feasibility: Math.min(100, Math.round(proposedSolution.automation_feasibility * 0.5 + 45)),
    distribution_feasibility: distScore,
    zero_cost_feasibility: opportunity.zero_cost_score ?? 85,
  });

  // 7. Decision Evaluation via Deterministic Decider
  const evalResult = evaluateCandidate({
    overall_score: opportunity.overall_score ?? 0,
    research_confidence: opportunity.research_confidence ?? 0,
    validation_score: validationScore,
    source_count: sourceCount,
    direct_evidence_count: directEvidenceCount,
    zero_cost_score: opportunity.zero_cost_score ?? 85,
    estimated_cost_inr: experimentProposal.cost_estimate_inr,
    risk_level: opportunity.risk_level,
    description: opportunity.title,
  });

  // 8. Priority Score
  const priorityScore = calculatePriorityScore({
    validation_score: validationScore,
    overall_score: opportunity.overall_score ?? 0,
    research_confidence: opportunity.research_confidence ?? 0,
    monetization_score: opportunity.monetization_score,
    zero_cost_score: opportunity.zero_cost_score,
    evidence_count: directEvidenceCount,
    source_count: sourceCount,
    risk_level: opportunity.risk_level,
  });

  return {
    validation_score: validationScore,
    priority_score: priorityScore,
    decision: evalResult.decision,
    validation_status: evalResult.validation_status,
    confidence: opportunity.research_confidence ?? 50,
    categories,
    customer_profile: customerProfile,
    competitors,
    proposed_solution: proposedSolution,
    experiment_proposal: experimentProposal,
    wtp,
    preconditions: evalResult.preconditions,
    explanation: evalResult.explanation,
  };
}
