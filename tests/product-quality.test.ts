import { describe, it, expect } from "vitest";
import { evaluateQualityGates } from "@/product-builder/quality";
import { createBuildPlan } from "@/product-builder/build-plan";
import { generateProductSpecification } from "@/product-builder/spec";
import { deriveProductStrategy } from "@/product-builder/strategy";
import type { Experiment } from "@/types/experiment";

describe("8-Point Quality Gates Evaluator", () => {
  const exp: Experiment = {
    id: "exp-q",
    title: "Markdown Preview Tool",
    description: "Instant markdown preview in browser",
  } as any;

  const strategy = deriveProductStrategy(exp, null);
  const spec = generateProductSpecification(strategy, exp, null);
  const plan = createBuildPlan(spec);

  it("passes when all core artifacts are present, valid, and clean", () => {
    const validArtifacts = [
      {
        artifact_type: "SOURCE_CODE",
        file_path: "types/generated/markdown-preview.ts",
        content: "export interface MarkdownInput { text: string; }\nexport interface MarkdownResult { html: string; }",
      },
      {
        artifact_type: "SOURCE_CODE",
        file_path: "components/products/markdown-preview-view.tsx",
        content: "import React from 'react';\nexport default function MarkdownView() { return <div>Preview</div>; }",
      },
      {
        artifact_type: "README",
        file_path: "docs/products/markdown-preview-README.md",
        content: "# Markdown Preview Tool\nInstant browser-based markdown renderer.",
      },
      {
        artifact_type: "TEST_SUITE",
        file_path: "tests/products/markdown-preview.test.ts",
        content: "import { describe, it, expect } from 'vitest';\ndescribe('test', () => { it('works', () => { expect(1).toBe(1); }); });",
      },
      {
        artifact_type: "CONFIGURATION",
        file_path: "packages/markdown-preview/package.json",
        content: '{"name": "markdown-preview", "version": "1.0.0"}',
      },
    ];

    const report = evaluateQualityGates(spec, plan, validArtifacts);

    expect(report.overall_passed).toBe(true);
    expect(report.overall_score).toBeGreaterThanOrEqual(90);
    expect(report.gates.length).toBe(8);
    expect(report.blockers.length).toBe(0);
  });

  it("fails quality gate when test suite is missing", () => {
    const missingTestsArtifacts = [
      {
        artifact_type: "SOURCE_CODE",
        file_path: "types/generated/markdown-preview.ts",
        content: "export interface MarkdownInput { text: string; }",
      },
      {
        artifact_type: "SOURCE_CODE",
        file_path: "components/products/markdown-preview-view.tsx",
        content: "export default function MarkdownView() { return <div>Preview</div>; }",
      },
      {
        artifact_type: "README",
        file_path: "docs/products/markdown-preview-README.md",
        content: "# Markdown Preview Tool",
      },
    ];

    const report = evaluateQualityGates(spec, plan, missingTestsArtifacts);

    expect(report.overall_passed).toBe(false);
    expect(report.gates.find((g) => g.gate === "TEST_SUCCESS")?.passed).toBe(false);
    expect(report.blockers.some((b) => b.includes("Test suite"))).toBe(true);
  });

  it("fails quality gate when a secret is leaked in artifacts", () => {
    const leakedArtifacts = [
      {
        artifact_type: "SOURCE_CODE",
        file_path: "types/generated/markdown-preview.ts",
        content: "export interface MarkdownInput { text: string; }\nconst KEY = 'AKIA1234567890ABCDEF';",
      },
      {
        artifact_type: "SOURCE_CODE",
        file_path: "components/products/markdown-preview-view.tsx",
        content: "export default function MarkdownView() { return <div>Preview</div>; }",
      },
      {
        artifact_type: "README",
        file_path: "docs/products/markdown-preview-README.md",
        content: "# Markdown Preview Tool",
      },
      {
        artifact_type: "TEST_SUITE",
        file_path: "tests/products/markdown-preview.test.ts",
        content: "expect(true).toBe(true);",
      },
    ];

    const report = evaluateQualityGates(spec, plan, leakedArtifacts);

    expect(report.overall_passed).toBe(false);
    expect(report.gates.find((g) => g.gate === "NO_SECRET_LEAK")?.passed).toBe(false);
    expect(report.blockers.some((b) => b.includes("Security leak"))).toBe(true);
  });
});
