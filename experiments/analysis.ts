import type { Experiment, ExperimentMetric } from "@/types/experiment";
import type {
  ExperimentAnalysisResult,
  CriteriaComparison,
  LearningData,
} from "./types";

export function analyzeExperiment(
  experiment: Experiment,
  metrics: ExperimentMetric[]
): ExperimentAnalysisResult {
  // 1. Group metrics by name (summing or taking maximum latest)
  const metricTotals: Record<string, number> = {};
  for (const m of metrics) {
    const name = m.metric_name.toLowerCase();
    const val = Number(m.metric_value) || 0;
    metricTotals[name] = (metricTotals[name] || 0) + val;
  }

  // 2. Extract target metrics from hypothesis_details or parse success_criteria
  const comparisons: CriteriaComparison[] = [];
  let targetsFound = false;

  const hypothesisDetails = experiment.hypothesis_details as {
    target_metrics?: Array<{ name: string; target_value: number; unit?: string }>;
  } | null;

  if (hypothesisDetails?.target_metrics && Array.isArray(hypothesisDetails.target_metrics)) {
    for (const tm of hypothesisDetails.target_metrics) {
      targetsFound = true;
      const actual = metricTotals[tm.name.toLowerCase()] || 0;
      comparisons.push({
        metric_name: tm.name,
        target_value: tm.target_value,
        actual_value: actual,
        met: actual >= tm.target_value,
        unit: tm.unit,
      });
    }
  }

  // If no structured target_metrics, parse success_criteria string (e.g. "15 signups", "50 views")
  if (!targetsFound && experiment.success_criteria) {
    const match = experiment.success_criteria.match(/(\d+)\s*([a-zA-Z_]+)/);
    if (match && match[1] && match[2]) {
      const targetVal = parseInt(match[1], 10);
      const metricKey = match[2].toLowerCase();
      const actual = metricTotals[metricKey] || metricTotals["signups"] || metricTotals["views"] || 0;
      comparisons.push({
        metric_name: metricKey,
        target_value: targetVal,
        actual_value: actual,
        met: actual >= targetVal,
      });
    }
  }

  // Default baseline metric if none defined
  if (comparisons.length === 0) {
    const signups = metricTotals["signups"] || 0;
    comparisons.push({
      metric_name: "signups",
      target_value: 10,
      actual_value: signups,
      met: signups >= 10,
    });
  }

  // 3. Evaluate criteria
  const totalCriteria = comparisons.length;
  const metCriteria = comparisons.filter((c) => c.met).length;
  const hasAnyActivity = metrics.length > 0 && Object.values(metricTotals).some((v) => v > 0);

  let result: ExperimentAnalysisResult["result"] = "INSUFFICIENT_DATA";
  let summary = "";

  if (!hasAnyActivity) {
    result = "INSUFFICIENT_DATA";
    summary = "No user metrics recorded yet. Experiment needs live user traffic before evaluation.";
  } else if (metCriteria === totalCriteria) {
    result = "WINNER";
    summary = `All ${totalCriteria} success criteria targets were fully met or exceeded with ₹0 budget.`;
  } else if (metCriteria > 0 || (metricTotals["signups"] || 0) >= 3) {
    result = "PROMISING";
    summary = `Positive market interest demonstrated (${metCriteria}/${totalCriteria} targets achieved). Ready for second iteration or scale.`;
  } else if (hasAnyActivity) {
    result = "ITERATE";
    summary = "Activity detected, but primary conversion thresholds were not achieved. Value proposition or channel angle should be refined.";
  }

  // Check failure criteria
  const failureConditions = Array.isArray(experiment.failure_criteria)
    ? (experiment.failure_criteria as Array<{ condition?: string; triggered?: boolean }>)
    : [];

  const stopConditionTriggered = failureConditions.some((fc) => fc.triggered);
  if (stopConditionTriggered) {
    result = "STOPPED";
    summary = "A mandatory stop condition was triggered during execution.";
  }

  // 4. Build Learning Data
  const whatWorked: string[] = [];
  const whatFailed: string[] = [];

  for (const c of comparisons) {
    if (c.met) {
      whatWorked.push(`Achieved target for ${c.metric_name}: ${c.actual_value} (target was ${c.target_value})`);
    } else {
      whatFailed.push(`Missed target for ${c.metric_name}: ${c.actual_value} recorded vs ${c.target_value} target`);
    }
  }

  const learnings: LearningData = {
    what_happened: `Experiment tested hypothesis across ${experiment.channel || "organic channels"}. Total metrics captured: ${metrics.length}.`,
    what_worked: whatWorked.length > 0 ? whatWorked : ["Initial setup deployed cleanly at ₹0 cost."],
    what_failed: whatFailed.length > 0 ? whatFailed : ["No major structural failures observed."],
    customer_response:
      metricTotals["signups"] && metricTotals["signups"] > 0
        ? `Direct demand validated with ${metricTotals["signups"]} signups.`
        : "Low organic feedback received.",
    channel_response: `Channel "${experiment.channel || "Organic"}" yielded ${metricTotals["traffic"] || metricTotals["views"] || 0} impressions.`,
    conversion_summary: `Signups: ${metricTotals["signups"] || 0}, Views: ${metricTotals["views"] || 0}, Clicks: ${metricTotals["clicks"] || 0}`,
    problems_discovered:
      metCriteria === 0 && hasAnyActivity
        ? ["Low conversion from traffic to action. Hook or copy may need adjustment."]
        : [],
    recommended_next_action:
      result === "WINNER"
        ? "Advance to Phase 6 Product Builder to package the validated MVP into an automated digital product."
        : result === "PROMISING"
        ? "Run a second iteration with narrowed customer targeting."
        : result === "ITERATE"
        ? "Rework the copy, test an alternative channel, or adjust the core problem angle."
        : "Archive experiment and return to Opportunity Hunter.",
    analyzed_at: new Date().toISOString(),
  };

  return {
    result,
    decision_summary: summary,
    success_criteria_met: metCriteria === totalCriteria,
    stop_condition_triggered: stopConditionTriggered,
    criteria_comparisons: comparisons,
    learnings,
  };
}
