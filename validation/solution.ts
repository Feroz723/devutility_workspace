import { ProposedSolution } from "./types";

interface SolutionInput {
  title: string;
  problem?: string | null;
  target_customer?: string | null;
  automation_score?: number | null;
}

export function generateProposedSolution(input: SolutionInput): ProposedSolution {
  const text = (input.title + " " + (input.problem || "")).toLowerCase();

  let productType: ProposedSolution["product_type"] = "MICRO_SAAS";
  let deliveryFormat = "Web Application (Next.js / Cloudflare / Vercel)";
  let buildDays = 3;

  if (text.includes("api") || text.includes("webhook") || text.includes("developer") || text.includes("sdk")) {
    productType = "API_TOOL";
    deliveryFormat = "REST API Endpoint + Documentation";
    buildDays = 2;
  } else if (text.includes("template") || text.includes("boilerplate") || text.includes("checklist")) {
    productType = "DIGITAL_TEMPLATE";
    deliveryFormat = "Downloadable Template Bundle / GitHub Repository";
    buildDays = 1;
  } else if (text.includes("data") || text.includes("scraping") || text.includes("directory") || text.includes("leads")) {
    productType = "DATA_FEED";
    deliveryFormat = "Automated CSV/JSON Feed + Periodic Webhook Sync";
    buildDays = 2;
  } else if (text.includes("script") || text.includes("bot") || text.includes("automation")) {
    productType = "AUTOMATION_SCRIPT";
    deliveryFormat = "Serverless Scheduled Cron Worker";
    buildDays = 2;
  }

  const automationFeasibility = input.automation_score ?? 85;

  return {
    product_type: productType,
    core_value_prop: `Automate and simplify "${input.title}" with a zero-friction, self-serve digital tool built specifically for ${input.target_customer || "operators"}.`,
    min_features: [
      "Instant self-service setup with zero onboarding friction",
      "Automated execution and validation pipeline",
      "Clean dashboard view with audit history and exportable outputs",
      "Direct alert integration (Email/Webhook)",
    ],
    time_to_build_days: buildDays,
    delivery_format: deliveryFormat,
    automation_feasibility: automationFeasibility,
  };
}
