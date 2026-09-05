import type { ScenarioId, ScenarioDefinition } from "./types";
import {
  runScenarioA,
  runScenarioB,
  runScenarioC,
  runScenarioD,
  runScenarioE,
} from "./scenarios-a-to-e";
import {
  runScenarioF,
  runScenarioG,
  runScenarioH,
  runScenarioI,
  runScenarioJ,
} from "./scenarios-f-to-j";
import {
  runScenarioK,
  runScenarioL,
  runScenarioM,
  runScenarioN,
  runScenarioO,
} from "./scenarios-k-to-o";
import {
  runScenarioP,
  runScenarioQ,
  runScenarioR,
} from "./scenarios-p-to-r";
import { runFullCycleScenario } from "./scenario-full-cycle";

export const SCENARIO_REGISTRY: Record<ScenarioId, ScenarioDefinition> = {
  SCENARIO_A: {
    id: "SCENARIO_A",
    name: "New Opportunity Discovery & Backlog Isolation",
    category: "GOVERNANCE",
    description: "Research discovers an opportunity, validates and scores it, and queues it in the backlog without disrupting the active primary product.",
    run: runScenarioA,
  },
  SCENARIO_B: {
    id: "SCENARIO_B",
    name: "Primary Product Lifecycle Progression",
    category: "LIFECYCLE",
    description: "A validated opportunity becomes the primary product and progresses through all initial lifecycle stages while maintaining single primary focus.",
    run: runScenarioB,
  },
  SCENARIO_C: {
    id: "SCENARIO_C",
    name: "Low Traffic & Insufficient Data Handling",
    category: "BOTTLENECK",
    description: "Product receives insufficient exposure (<100 visits). Recognizes INSUFFICIENT_DATA and distribution bottleneck without falsely classifying product as failed.",
    run: runScenarioC,
  },
  SCENARIO_D: {
    id: "SCENARIO_D",
    name: "High Traffic with Low Signup Conversion",
    category: "BOTTLENECK",
    description: "Traffic is sufficient but signup conversion is poor. Strategy shifts focus from distribution to landing page copy and value proposition.",
    run: runScenarioD,
  },
  SCENARIO_E: {
    id: "SCENARIO_E",
    name: "Good Signup Volume with Poor Activation",
    category: "BOTTLENECK",
    description: "Signup volume is sufficient but activation is poor. Strategy prioritizes onboarding and time-to-value rather than driving blind traffic.",
    run: runScenarioE,
  },
  SCENARIO_F: {
    id: "SCENARIO_F",
    name: "Good Activation with Poor Long-Term Retention",
    category: "BOTTLENECK",
    description: "Activation is healthy but retention drops off. Triggers customer success and product investigation rather than abrupt termination.",
    run: runScenarioF,
  },
  SCENARIO_G: {
    id: "SCENARIO_G",
    name: "Strong Retention with Weak Monetization",
    category: "BOTTLENECK",
    description: "Users activate and retain but payment conversion is low. Strategy focuses on checkout friction and value communication; pricing changes enforce human approval.",
    run: runScenarioG,
  },
  SCENARIO_H: {
    id: "SCENARIO_H",
    name: "Delayed Customer Response & Observation Window",
    category: "GOVERNANCE",
    description: "Distribution is ongoing but evidence is immature. System enters WAIT_FOR_DATA with continued execution and observation rather than inventing arbitrary deadlines.",
    run: runScenarioH,
  },
  SCENARIO_I: {
    id: "SCENARIO_I",
    name: "Distribution Channel Failure & Safe Failover",
    category: "INTEGRATION",
    description: "A distribution channel becomes degraded or rate-limited. System pauses it and fails over to legitimate alternative organic channels without spam.",
    run: runScenarioI,
  },
  SCENARIO_J: {
    id: "SCENARIO_J",
    name: "AI Provider Outage & Deterministic Fallback",
    category: "INTEGRATION",
    description: "AI providers are disabled or offline. System continues operating using deterministic fallback rules without fabricating hallucinated outputs.",
    run: runScenarioJ,
  },
  SCENARIO_K: {
    id: "SCENARIO_K",
    name: "Payment Gateway Offline & Unpaid Entitlement Guard",
    category: "SAFETY",
    description: "Payment provider is not configured. Reports NOT_CONNECTED / REQUIRES_MANUAL_SETUP. Unpaid sessions strictly cannot receive paid entitlements.",
    run: runScenarioK,
  },
  SCENARIO_L: {
    id: "SCENARIO_L",
    name: "Strong Product Performance & Scale Allocation",
    category: "PERFORMANCE",
    description: "Strong metrics across all funnel stages with real payments. Strategy promotes product to GROWING/SCALE while remaining ₹0 spend compliant.",
    run: runScenarioL,
  },
  SCENARIO_M: {
    id: "SCENARIO_M",
    name: "Multi-Signal Product Failure & Stop Rule Verification",
    category: "LIFECYCLE",
    description: "Generates 2+ independent verified negative signals before proposing STOP_CANDIDATE. Proves that one bad metric alone cannot terminate a product.",
    run: runScenarioM,
  },
  SCENARIO_N: {
    id: "SCENARIO_N",
    name: "High-Potential Opportunity Backlog Protection",
    category: "GOVERNANCE",
    description: "A new opportunity with a superior score appears while the current product is active. It is safely queued in the backlog without premature displacement.",
    run: runScenarioN,
  },
  SCENARIO_O: {
    id: "SCENARIO_O",
    name: "Contradictory Evidence & Provenance Preservation",
    category: "GOVERNANCE",
    description: "Conflicting external demand signals are recorded. Evidence is segregated by provenance, confidence is lowered, and uncertainty is flagged without cherry-picking.",
    run: runScenarioO,
  },
  SCENARIO_P: {
    id: "SCENARIO_P",
    name: "Insufficient Sample Size Guardrail",
    category: "SAFETY",
    description: "When sample size is < 10, metrics are classified as INSUFFICIENT_DATA, suppressing false conversion calculations and premature pivots.",
    run: runScenarioP,
  },
  SCENARIO_Q: {
    id: "SCENARIO_Q",
    name: "Emergency Shutdown & Autonomous Kill Switch Override",
    category: "SAFETY",
    description: "Engaging the emergency kill switch overrides all autonomous execution and blocks all actions. Releasing it restores clean operational state.",
    run: runScenarioQ,
  },
  SCENARIO_R: {
    id: "SCENARIO_R",
    name: "Zero-Spend Rule Enforcement & Paid Action Blocking",
    category: "SAFETY",
    description: "Simulates attempts to purchase ads, paid hosting, and paid APIs. Every action is blocked under the strict ₹0 spend invariant.",
    run: runScenarioR,
  },
  FULL_CYCLE: {
    id: "FULL_CYCLE",
    name: "Complete 13-Phase Autonomous Business Simulation Cycle",
    category: "LIFECYCLE",
    description: "Executes an end-to-end simulated business cycle across all 13 phases (Research to Strategy), proving output-to-input handover integrity.",
    run: runFullCycleScenario,
  },
};

export function getScenarioDefinition(id: ScenarioId): ScenarioDefinition | undefined {
  return SCENARIO_REGISTRY[id];
}

export function getAllScenarioDefinitions(): ScenarioDefinition[] {
  return Object.values(SCENARIO_REGISTRY);
}
