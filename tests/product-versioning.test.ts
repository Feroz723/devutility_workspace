import { describe, it, expect } from "vitest";
import {
  hashSpecification,
  hashBuildPlan,
  incrementSemver,
} from "@/product-builder/versioning";
import { createBuildPlan } from "@/product-builder/build-plan";
import { generateProductSpecification } from "@/product-builder/spec";
import { deriveProductStrategy } from "@/product-builder/strategy";
import type { Experiment } from "@/types/experiment";

describe("Product Versioning & Hashes", () => {
  const exp: Experiment = {
    id: "exp-v",
    title: "Epoch Timestamp Converter",
    description: "Convert epoch timestamps to readable date time",
  } as any;

  const strategy = deriveProductStrategy(exp, null);
  const spec = generateProductSpecification(strategy, exp, null);
  const plan = createBuildPlan(spec);

  it("generates deterministic SHA-256 hashes", () => {
    const hash1 = hashSpecification(spec);
    const hash2 = hashSpecification(spec);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex string

    const planHash1 = hashBuildPlan(plan);
    const planHash2 = hashBuildPlan(plan);
    expect(planHash1).toBe(planHash2);
    expect(planHash1.length).toBe(64);
  });

  it("increments semantic versions correctly", () => {
    expect(incrementSemver("1.0.0", "patch")).toBe("1.0.1");
    expect(incrementSemver("1.0.1", "patch")).toBe("1.0.2");
    expect(incrementSemver("1.0.2", "minor")).toBe("1.1.0");
    expect(incrementSemver("1.1.0", "major")).toBe("2.0.0");
  });
});
