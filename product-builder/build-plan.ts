import type { ProductBuildPlan, ProductBuildTask } from "@/types/product";
import type { ProductSpecification } from "./types";
import { verifyZeroCostBuild } from "./guard";

/**
 * Creates an ordered, dependency-aware build plan from a product specification.
 */
export function createBuildPlan(
  spec: ProductSpecification,
  productId?: string
): ProductBuildPlan {
  const slug = spec.identity.slug;

  const tasks: ProductBuildTask[] = [
    {
      id: "task_1_schema",
      name: "Data Model & Types Definition",
      type: "SCHEMA",
      target_file: `types/generated/${slug}.ts`,
      dependencies: [],
      status: "PENDING",
      description: "Define TypeScript interfaces, input schemas, and result contracts for the product.",
    },
    {
      id: "task_2_repository",
      name: "Client State & Storage Persistence",
      type: "REPOSITORY",
      target_file: `lib/storage/${slug}-store.ts`,
      dependencies: ["task_1_schema"],
      status: "PENDING",
      description: "Implement local storage adapter for saving history and preferences without external database costs.",
    },
    {
      id: "task_3_api",
      name: "Core Business Engine & Logic",
      type: "API",
      target_file: `lib/engines/${slug}-engine.ts`,
      dependencies: ["task_1_schema"],
      status: "PENDING",
      description: "Pure deterministic business logic solving the validated problem locally.",
    },
    {
      id: "task_4_ui",
      name: "Interactive User Interface & Preview",
      type: "UI",
      target_file: `components/products/${slug}-view.tsx`,
      dependencies: ["task_2_repository", "task_3_api"],
      status: "PENDING",
      description: "Render interactive UI with input forms, live results, copy-to-clipboard, and history.",
    },
    {
      id: "task_5_documentation",
      name: "User Documentation & README",
      type: "DOCUMENTATION",
      target_file: `docs/products/${slug}-README.md`,
      dependencies: ["task_4_ui"],
      status: "PENDING",
      description: "Provide quickstart, feature list, and zero-cost guarantee.",
    },
    {
      id: "task_6_test",
      name: "Unit & Logic Test Suite",
      type: "TEST",
      target_file: `tests/products/${slug}.test.ts`,
      dependencies: ["task_3_api"],
      status: "PENDING",
      description: "Automated test suite verifying core calculations, error handling, and data sanitization.",
    },
    {
      id: "task_7_packaging",
      name: "Packaging & Deployment Manifest",
      type: "PACKAGING",
      target_file: `packages/${slug}/package.json`,
      dependencies: ["task_5_documentation", "task_6_test"],
      status: "PENDING",
      description: "Generate deployment instructions and standalone packaging metadata.",
    },
  ];

  const plan: ProductBuildPlan = {
    product_id: productId,
    product_slug: slug,
    estimated_tasks_count: tasks.length,
    tasks,
    zero_cost_verified: true,
    created_at: new Date().toISOString(),
  };

  // Guard check
  const costCheck = verifyZeroCostBuild(plan, ["Next.js", "React", "TypeScript", "Tailwind CSS"]);
  plan.zero_cost_verified = costCheck.compliant;

  return plan;
}
