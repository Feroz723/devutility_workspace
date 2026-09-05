import crypto from "crypto";
import type { ProductSpecification } from "./types";
import type { ProductBuildPlan } from "@/types/product";

/**
 * Computes SHA-256 hash of a product specification.
 */
export function hashSpecification(spec: ProductSpecification): string {
  const serialized = JSON.stringify(spec, Object.keys(spec).sort());
  return crypto.createHash("sha256").update(serialized).digest("hex");
}

/**
 * Computes SHA-256 hash of a product build plan.
 */
export function hashBuildPlan(plan: ProductBuildPlan): string {
  const serialized = JSON.stringify(plan, Object.keys(plan).sort());
  return crypto.createHash("sha256").update(serialized).digest("hex");
}

/**
 * Increments semver version string (e.g. 1.0.0 -> 1.0.1 or 1.1.0).
 */
export function incrementSemver(
  current: string = "1.0.0",
  type: "patch" | "minor" | "major" = "patch"
): string {
  const parts = current.split(".").map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);

  const major = parts[0] ?? 1;
  const minor = parts[1] ?? 0;
  const patch = parts[2] ?? 0;

  if (type === "major") {
    return `${major + 1}.0.0`;
  } else if (type === "minor") {
    return `${major}.${minor + 1}.0`;
  } else {
    return `${major}.${minor}.${patch + 1}`;
  }
}

