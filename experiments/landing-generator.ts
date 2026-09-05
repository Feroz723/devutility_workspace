import type { Experiment } from "@/types/experiment";
import type { LandingPageData } from "./types";

export function generateLandingPageData(experiment: Experiment): LandingPageData {
  const type = experiment.experiment_type || "LANDING_PAGE";
  const title = experiment.title.replace(/^\[₹0 Experiment\]\s*/i, "");

  let cta = "Join Early Access Waitlist";
  let waitlistCta = "Get Free Access on Launch";
  let deliveryNote = "100% Free Public Beta. No credit card required.";

  if (type === "FREE_TOOL" || type === "MICRO_SAAS_MVP") {
    cta = "Try Free Web Tool";
    waitlistCta = "Run Instant Test";
    deliveryNote = "Self-service web tool running on free serverless tier.";
  } else if (type === "CONCIERGE_MVP" || type === "MANUAL_SERVICE") {
    cta = "Request Free Concierge Setup";
    waitlistCta = "Submit Request";
    deliveryNote = "Hands-on guided fulfillment by the product maintainers.";
  } else if (type === "DOWNLOADABLE_PRODUCT") {
    cta = "Download Free Resource Pack";
    waitlistCta = "Get Instant Download Link";
    deliveryNote = "Instant digital download bundle.";
  }

  const solutionHighlights = [
    `Solves ${experiment.problem || "the core workflow bottleneck"} automatically`,
    "Zero installation or complex configuration required",
    "Lightweight, fast, and purpose-built for high-focus operators",
    "Built strictly using public, transparent tooling",
  ];

  return {
    headline: title,
    subheadline:
      experiment.solution ||
      `The frictionless zero-cost digital utility designed specifically for ${
        experiment.target_customer || "operators"
      }.`,
    problem_callout:
      experiment.problem ||
      "Manual workarounds, fragile scripts, and bloated commercial tools cost hours of frustration.",
    solution_highlights: solutionHighlights,
    target_audience: experiment.target_customer || "Software Developers & Technical Operators",
    cta_text: cta,
    waitlist_cta: waitlistCta,
    tool_type: type,
    delivery_note: deliveryNote,
  };
}
