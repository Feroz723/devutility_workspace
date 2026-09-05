import type {
  Product,
  ProductType,
  ProductStatus,
  BuildStatus,
  CostClassification,
  ProductBuildPlan,
  ProductBuildTask,
  ProductArtifact,
} from "@/types/product";
import type { Experiment } from "@/types/experiment";
import type { Opportunity } from "@/types/opportunity";

// Eligibility check result
export interface ProductBuildEligibilityResult {
  eligible: boolean;
  reasons: string[];
  blockers: string[];
  metrics: {
    experiment_status: string;
    experiment_result: string | null;
    research_confidence: number;
    validation_score: number;
    zero_cost_feasibility: number;
    estimated_cost_inr: number;
    metrics_count: number;
    has_real_users: boolean;
  };
}

// Product strategy definition
export interface ProductStrategy {
  product_type: ProductType;
  target_user: string;
  core_problem: string;
  proposed_solution: string;
  value_proposition: string;
  scope_minimization: {
    core_features: string[];
    explicit_non_goals: string[];
  };
  delivery_method: "WEB_APP" | "DOWNLOAD" | "CLI" | "API" | "EMBED";
  tech_stack: string[];
  estimated_cost_inr: number;
  cost_justification: string;
}

// 7-part Product Specification
export interface ProductSpecification {
  // 1. Product Identity
  identity: {
    name: string;
    slug: string;
    version: string;
    product_type: ProductType;
    tagline: string;
  };
  // 2. Problem & Solution
  problem_solution: {
    validated_problem: string;
    evidence_summary: string;
    target_audience: string;
    solution_statement: string;
    value_proposition: string;
  };
  // 3. Scope & Non-Goals (Anti-bloat)
  scope: {
    mvp_features: Array<{
      name: string;
      description: string;
      acceptance_criteria: string[];
    }>;
    explicit_non_goals: string[];
    future_considerations: string[];
  };
  // 4. Functional Requirements
  requirements: {
    user_inputs: Array<{
      field: string;
      type: string;
      required: boolean;
      validation_rule: string;
    }>;
    core_processing: string[];
    user_outputs: Array<{
      field: string;
      type: string;
      display_format: string;
    }>;
    error_handling: string[];
  };
  // 5. Architecture & Tech Stack
  architecture: {
    frontend_framework: string;
    backend_type: "NONE_CLIENT_ONLY" | "NEXT_API_ROUTE" | "STANDALONE_SCRIPT";
    data_persistence: "NONE" | "LOCAL_STORAGE" | "POSTGRES";
    external_apis: string[]; // Must be empty or 100% free
    zero_cost_verification: string;
  };
  // 6. User Experience & UI Design
  ui_design: {
    layout_type: "SINGLE_PAGE_TOOL" | "WIZARD" | "DASHBOARD" | "DOCUMENT_VIEWER";
    theme: "DARK_PREMIUM" | "CLEAN_MINIMAL" | "TERMINAL";
    primary_actions: string[];
    responsive_breakpoints: string[];
  };
  // 7. Packaging & Delivery
  delivery: {
    delivery_type: "WEB_APP" | "DOWNLOAD" | "CLI" | "API" | "EMBED";
    entry_file: string;
    run_instructions: string;
    prerequisites: string[];
  };
}

// 8 Quality Gate Check Results
export type QualityGateName =
  | "BUILD_SUCCESS"
  | "TYPECHECK_SUCCESS"
  | "LINT_SUCCESS"
  | "TEST_SUCCESS"
  | "NO_SECRET_LEAK"
  | "ZERO_COST_COMPLIANT"
  | "SECURITY_CHECK"
  | "REQUIRED_FEATURES_PRESENT";

export interface QualityGateItem {
  gate: QualityGateName;
  passed: boolean;
  score: number; // 0 to 100
  details: string;
  errors?: string[];
}

export interface QualityReport {
  overall_passed: boolean;
  overall_score: number; // 0 to 100
  evaluated_at: string;
  gates: QualityGateItem[];
  blockers: string[];
}

// Builder options
export interface BuildExecutionOptions {
  product: Product;
  specification: ProductSpecification;
  buildPlan: ProductBuildPlan;
  jobId?: string;
}

export interface BuildExecutionResult {
  success: boolean;
  job_id: string;
  status: BuildStatus;
  artifacts_created: number;
  quality_report: QualityReport;
  error?: string;
}
