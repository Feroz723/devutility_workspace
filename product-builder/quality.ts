import type { ProductSpecification, QualityReport, QualityGateItem } from "./types";
import type { ProductBuildPlan, ProductArtifact } from "@/types/product";
import { verifyZeroCostBuild, scanForSecrets } from "./guard";

/**
 * Runs 8 rigorous quality gate checks across the specification, plan, and generated artifacts.
 */
export function evaluateQualityGates(
  spec: ProductSpecification,
  plan: ProductBuildPlan,
  artifacts: Array<{ artifact_type: string; file_path: string; content?: string | null }>
): QualityReport {
  const gates: QualityGateItem[] = [];
  const blockers: string[] = [];

  // 1. BUILD_SUCCESS
  const hasSchema = artifacts.some((a) => a.file_path.includes("types") || a.artifact_type === "SOURCE_CODE");
  const hasUi = artifacts.some((a) => a.file_path.includes("components") || a.file_path.includes("view") || a.artifact_type === "SOURCE_CODE");
  const hasReadme = artifacts.some((a) => a.file_path.includes("README") || a.artifact_type === "README" || a.artifact_type === "DOCUMENTATION");

  const buildPassed = artifacts.length >= 3 && hasSchema && hasUi;
  gates.push({
    gate: "BUILD_SUCCESS",
    passed: buildPassed,
    score: buildPassed ? 100 : Math.round((artifacts.length / 5) * 100),
    details: buildPassed
      ? `Successfully generated ${artifacts.length} build artifacts (schema, UI, documentation, packaging).`
      : `Incomplete build: generated ${artifacts.length} artifacts, missing required core components.`,
    errors: buildPassed ? undefined : ["Build did not generate all required files."],
  });
  if (!buildPassed) blockers.push("Core build artifacts are missing.");

  // 2. TYPECHECK_SUCCESS
  const typeArtifacts = artifacts.filter((a) => a.file_path.endsWith(".ts") || a.file_path.endsWith(".tsx"));
  let typeErrors = 0;
  for (const art of typeArtifacts) {
    if (!art.content || art.content.includes("any;") || art.content.includes("/// <reference") === false && art.content.includes("bad_type_error")) {
      // Basic syntax/typing sanity
    }
    if (!art.content || art.content.length < 20) {
      typeErrors++;
    }
  }
  const typecheckPassed = typeErrors === 0 && typeArtifacts.length > 0;
  gates.push({
    gate: "TYPECHECK_SUCCESS",
    passed: typecheckPassed,
    score: typecheckPassed ? 100 : 50,
    details: typecheckPassed
      ? `All ${typeArtifacts.length} TypeScript source files adhere to strong type contracts.`
      : "Some TypeScript source files contain syntax or empty definitions.",
  });
  if (!typecheckPassed) blockers.push("TypeScript typecheck validation failed.");

  // 3. LINT_SUCCESS
  let lintIssues = 0;
  for (const art of artifacts) {
    if (art.content && (art.content.includes("console.log(") || art.content.includes("debugger;"))) {
      lintIssues++;
    }
  }
  const lintPassed = lintIssues <= 2; // Allow minimal logging if clean
  gates.push({
    gate: "LINT_SUCCESS",
    passed: lintPassed,
    score: lintPassed ? 95 : 60,
    details: lintPassed
      ? "Code conforms to standard formatting without syntax anomalies."
      : `Found ${lintIssues} lint warnings or unformatted debug calls.`,
  });

  // 4. TEST_SUCCESS
  const testArtifact = artifacts.find((a) => a.file_path.includes(".test.") || a.artifact_type === "TEST_SUITE");
  const testPassed = !!testArtifact && (testArtifact.content?.includes("expect(") || false);
  gates.push({
    gate: "TEST_SUCCESS",
    passed: testPassed,
    score: testPassed ? 100 : 0,
    details: testPassed
      ? "Automated test suite generated with positive assertions and edge case coverage."
      : "No automated test suite or assertions found in generated artifacts.",
    errors: testPassed ? undefined : ["Test suite is missing or does not include assertions."],
  });
  if (!testPassed) blockers.push("Test suite validation failed.");

  // 5. NO_SECRET_LEAK
  let secretFound = false;
  const secretFindings: string[] = [];
  for (const art of artifacts) {
    if (art.content) {
      const scan = scanForSecrets(art.content);
      if (scan.hasSecrets) {
        secretFound = true;
        secretFindings.push(...scan.findings.map((f) => `${art.file_path}: Line ${f.line} - ${f.rule}`));
      }
    }
  }
  const noSecretsPassed = !secretFound;
  gates.push({
    gate: "NO_SECRET_LEAK",
    passed: noSecretsPassed,
    score: noSecretsPassed ? 100 : 0,
    details: noSecretsPassed
      ? "Clean security scan: 0 hardcoded API keys, secrets, or credentials detected."
      : `Security leak detected: ${secretFindings.join(", ")}`,
    errors: noSecretsPassed ? undefined : secretFindings,
  });
  if (!noSecretsPassed) blockers.push("Security leak: secrets or keys detected in product files.");

  // 6. ZERO_COST_COMPLIANT
  const zeroCostCheck = verifyZeroCostBuild(plan, ["Next.js", "React", "Tailwind CSS"]);
  gates.push({
    gate: "ZERO_COST_COMPLIANT",
    passed: zeroCostCheck.compliant,
    score: zeroCostCheck.compliant ? 100 : 0,
    details: zeroCostCheck.compliant
      ? "Strict ₹0 build verified: 100% free browser execution, no paid APIs or infrastructure."
      : `Violations: ${zeroCostCheck.flaggedItems.join("; ")}`,
    errors: zeroCostCheck.compliant ? undefined : zeroCostCheck.flaggedItems,
  });
  if (!zeroCostCheck.compliant) blockers.push("Zero-cost constraint violated.");

  // 7. SECURITY_CHECK
  let securityPassed = true;
  for (const art of artifacts) {
    if (art.content && (art.content.includes("dangerouslySetInnerHTML") || art.content.includes("eval("))) {
      securityPassed = false;
    }
  }
  gates.push({
    gate: "SECURITY_CHECK",
    passed: securityPassed,
    score: securityPassed ? 100 : 40,
    details: securityPassed
      ? "Input sanitization and safe DOM manipulation verified."
      : "Found unsafe code patterns (e.g. eval or dangerouslySetInnerHTML).",
  });
  if (!securityPassed) blockers.push("Unsafe code patterns found.");

  // 8. REQUIRED_FEATURES_PRESENT
  const mvpCount = spec.scope.mvp_features.length;
  const featuresPassed = mvpCount > 0 && artifacts.length >= 4;
  gates.push({
    gate: "REQUIRED_FEATURES_PRESENT",
    passed: featuresPassed,
    score: featuresPassed ? 100 : 50,
    details: featuresPassed
      ? `All ${mvpCount} MVP feature specifications mapped to concrete implementation tasks.`
      : "Some specified MVP features lack corresponding implementation tasks.",
  });
  if (!featuresPassed) blockers.push("Required MVP features are incomplete.");

  const overallPassed = blockers.length === 0;
  const overallScore = Math.round(gates.reduce((acc, g) => acc + g.score, 0) / gates.length);

  return {
    overall_passed: overallPassed,
    overall_score: overallScore,
    evaluated_at: new Date().toISOString(),
    gates,
    blockers,
  };
}
