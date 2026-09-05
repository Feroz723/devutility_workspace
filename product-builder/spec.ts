import type { Experiment } from "@/types/experiment";
import type { Opportunity } from "@/types/opportunity";
import type { ProductStrategy, ProductSpecification } from "./types";

/**
 * Generates a comprehensive, 7-part Product Specification for autonomous implementation.
 */
export function generateProductSpecification(
  strategy: ProductStrategy,
  experiment: Experiment,
  opportunity?: Opportunity | null
): ProductSpecification {
  const baseTitle = opportunity?.title || experiment.title;
  const cleanName = baseTitle.replace(/Experiment:?\s*/i, "").trim();
  const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return {
    identity: {
      name: cleanName,
      slug,
      version: "1.0.0",
      product_type: strategy.product_type,
      tagline: strategy.value_proposition,
    },
    problem_solution: {
      validated_problem: strategy.core_problem,
      evidence_summary: `Validated in experiment '${experiment.title}' with positive user engagement signals.`,
      target_audience: strategy.target_user,
      solution_statement: strategy.proposed_solution,
      value_proposition: strategy.value_proposition,
    },
    scope: {
      mvp_features: strategy.scope_minimization.core_features.map((feat, idx) => ({
        name: feat,
        description: `Implement ${feat.toLowerCase()} to fulfill primary user task.`,
        acceptance_criteria: [
          `User can successfully interact with ${feat}`,
          "State updates reactively without page reloads",
          "Errors are displayed gracefully with clear guidance",
        ],
      })),
      explicit_non_goals: strategy.scope_minimization.explicit_non_goals,
      future_considerations: [
        "Cloud sync across multiple devices (Phase 7+)",
        "Premium tier with advanced analytics (Phase 7+)",
        "Direct export to external platforms",
      ],
    },
    requirements: {
      user_inputs: [
        {
          field: "primary_input",
          type: "string",
          required: true,
          validation_rule: "Non-empty string, min length 1 char, max length 5000 chars",
        },
        {
          field: "options_mode",
          type: "string",
          required: false,
          validation_rule: "One of standard presets: ['fast', 'detailed', 'compact']",
        },
      ],
      core_processing: [
        "Sanitize and validate incoming user input",
        "Execute core transformation or calculation locally",
        "Generate structured output payload with metrics and summary",
        "Save recent query to local storage history",
      ],
      user_outputs: [
        {
          field: "result_content",
          type: "formatted_text_or_json",
          display_format: "Interactive preview with syntax highlight and formatted cards",
        },
        {
          field: "execution_time_ms",
          type: "number",
          display_format: "Execution badge (e.g. 'Completed in 12ms')",
        },
      ],
      error_handling: [
        "Display friendly inline banner on empty or invalid inputs",
        "Never crash the UI thread; catch unexpected errors and reset cleanly",
      ],
    },
    architecture: {
      frontend_framework: "Next.js 14 App Router + React 18 + Tailwind CSS",
      backend_type: "NONE_CLIENT_ONLY",
      data_persistence: "LOCAL_STORAGE",
      external_apis: [],
      zero_cost_verification: "100% verified ₹0 cost. No external paid APIs or hosted server instances required.",
    },
    ui_design: {
      layout_type: "SINGLE_PAGE_TOOL",
      theme: "DARK_PREMIUM",
      primary_actions: ["Generate / Run", "Copy Output", "Reset", "Download Result"],
      responsive_breakpoints: ["sm (640px)", "md (768px)", "lg (1024px)"],
    },
    delivery: {
      delivery_type: strategy.delivery_method,
      entry_file: `app/products/[id]/preview/page.tsx`,
      run_instructions: "Run locally with `npm run dev` or serve statically. No environment keys required.",
      prerequisites: ["Modern web browser with JavaScript enabled"],
    },
  };
}
