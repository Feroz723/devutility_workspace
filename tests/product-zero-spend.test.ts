import { describe, it, expect } from "vitest";
import { verifyZeroCostBuild, scanForSecrets } from "@/product-builder/guard";
import type { ProductBuildPlan } from "@/types/product";

describe("Zero-Spend Guard & Secret Scanning", () => {
  it("approves clean zero-cost tech stacks", () => {
    const check = verifyZeroCostBuild(null, [
      "Next.js 14",
      "React 18",
      "TypeScript",
      "Tailwind CSS",
      "LocalStorage",
    ]);
    expect(check.compliant).toBe(true);
    expect(check.estimatedCostInr).toBe(0);
    expect(check.flaggedItems.length).toBe(0);
  });

  it("flags forbidden paid infrastructure", () => {
    const check = verifyZeroCostBuild(null, [
      "Next.js",
      "aws-rds",
      "Stripe payment gateway",
    ]);
    expect(check.compliant).toBe(false);
    expect(check.estimatedCostInr).toBeGreaterThan(0);
    expect(check.flaggedItems.some((i) => i.includes("AWS Relational Database"))).toBe(true);
    expect(check.flaggedItems.some((i) => i.includes("Payment Gateway"))).toBe(true);
  });

  it("detects and flags leaked credentials or secrets", () => {
    const cleanCode = `const secret = "hello_world";\nexport function run() { return true; }`;
    const cleanScan = scanForSecrets(cleanCode);
    expect(cleanScan.hasSecrets).toBe(false);

    const leakyCode = `
      // Leaked config
      const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";
      const OPENAI_KEY = "sk-1234567890abcdef1234567890abcdef";
    `;
    const leakScan = scanForSecrets(leakyCode);
    expect(leakScan.hasSecrets).toBe(true);
    expect(leakScan.findings.length).toBe(2);
    expect(leakScan.findings[0]!.rule).toBe("AWS Access Key");
    expect(leakScan.findings[1]!.rule).toBe("OpenAI Secret Key");
  });

});
