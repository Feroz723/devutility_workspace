import type { Experiment } from "@/types/experiment";
import type { Opportunity } from "@/types/opportunity";
import type { ProductType } from "@/types/product";
import type { ProductStrategy } from "./types";

/**
 * Maps experiment/opportunity metadata to the most focused, zero-cost ProductType.
 */
export function determineProductType(experiment: Experiment, opportunity?: Opportunity | null): ProductType {
  const expDesc = (experiment as any).description || experiment.hypothesis || experiment.problem || "";
  const oppDesc = opportunity ? ((opportunity as any).description || opportunity.problem_statement || opportunity.problem || "") : "";
  const oppAudience = opportunity ? (opportunity.target_customer || (opportunity as any).target_audience || "") : "";

  const combinedText = `${experiment.title} ${expDesc} ${opportunity?.title || ""} ${oppDesc} ${oppAudience}`.toLowerCase();

  if (combinedText.includes("calculator") || combinedText.includes("generator") || combinedText.includes("converter") || combinedText.includes("checker") || combinedText.includes("estimator")) {
    return "FREE_TOOL";
  }
  if (combinedText.includes("cli") || combinedText.includes("sdk") || combinedText.includes("developer") || combinedText.includes("code") || combinedText.includes("git") || combinedText.includes("api")) {
    return "DEVELOPER_TOOL";
  }
  if (combinedText.includes("template") || combinedText.includes("boilerplate") || combinedText.includes("starter") || combinedText.includes("notion") || combinedText.includes("sheet")) {
    return "TEMPLATE";
  }
  if (combinedText.includes("automate") || combinedText.includes("cron") || combinedText.includes("webhook") || combinedText.includes("sync") || combinedText.includes("bot")) {
    return "AUTOMATION";
  }
  if (combinedText.includes("guide") || combinedText.includes("cheatsheet") || combinedText.includes("checklist") || combinedText.includes("ebook") || combinedText.includes("pdf")) {
    return "DOWNLOADABLE_PRODUCT";
  }
  if (combinedText.includes("concierge") || combinedText.includes("service") || combinedText.includes("audit") || combinedText.includes("review")) {
    return "CONCIERGE_SERVICE";
  }
  if (combinedText.includes("dashboard") || combinedText.includes("portal") || combinedText.includes("track") || combinedText.includes("monitor")) {
    return "MICRO_SAAS";
  }

  // Default to FREE_TOOL for maximum utility, zero friction, and ₹0 barrier
  return "FREE_TOOL";
}

/**
 * Derives a lean, anti-bloat Product Strategy adhering to the zero-cost rule.
 */
export function deriveProductStrategy(
  experiment: Experiment,
  opportunity?: Opportunity | null
): ProductStrategy {
  const productType = determineProductType(experiment, opportunity);
  const targetUser = opportunity?.target_customer || (opportunity as any)?.target_audience || "Digital creators, professionals, and developers seeking fast workflows";
  const coreProblem = opportunity?.problem_statement || opportunity?.problem || (experiment as any).description || experiment.problem || experiment.hypothesis || "Lack of a lightweight, zero-cost, automated solution for daily repetitive tasks.";
  const proposedSolution = (opportunity as any)?.value_proposition || (opportunity as any)?.proposed_solution || experiment.solution || `A focused ${productType.toLowerCase().replace(/_/g, " ")} solving the problem directly in the browser with zero friction.`;
  const valueProp = `Immediate results in seconds without signups, subscriptions, or complexity.`;


  // Anti-bloat scope minimization rules
  const coreFeatures: string[] = [
    "Instant input form with client-side validation",
    "Core calculation/transformation engine running locally",
    "Clear result presentation with one-click copy and download",
    "State persistence via local storage for user convenience",
  ];

  const explicitNonGoals: string[] = [
    "No user authentication or password management (v1 is frictionless)",
    "No payment processing or subscriptions (strictly ₹0 in Phase 6)",
    "No multi-tenant team workspaces (anti-bloat)",
    "No paid external cloud services or proprietary LLM API costs",
  ];

  let deliveryMethod: ProductStrategy["delivery_method"] = "WEB_APP";
  if (productType === "DOWNLOADABLE_PRODUCT" || productType === "TEMPLATE") {
    deliveryMethod = "DOWNLOAD";
  } else if (productType === "DEVELOPER_TOOL") {
    deliveryMethod = "CLI";
  }

  const techStack = [
    "Next.js 14 (App Router)",
    "React 18",
    "TypeScript",
    "Tailwind CSS",
    "Web Standard Storage API (LocalStorage)",
    "Lucide React Icons",
  ];

  return {
    product_type: productType,
    target_user: targetUser,
    core_problem: coreProblem,
    proposed_solution: proposedSolution,
    value_proposition: valueProp,
    scope_minimization: {
      core_features: coreFeatures,
      explicit_non_goals: explicitNonGoals,
    },
    delivery_method: deliveryMethod,
    tech_stack: techStack,
    estimated_cost_inr: 0,
    cost_justification: "100% browser-based or local execution. Free hosting tier, zero paid APIs, zero external databases.",
  };
}
