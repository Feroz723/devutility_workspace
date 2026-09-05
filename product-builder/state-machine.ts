import type { ProductStatus, BuildStatus } from "@/types/product";

export interface StateTransitionResult<T> {
  valid: boolean;
  from: T;
  to: T;
  error?: string;
}

const PRODUCT_STATUS_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  DRAFT: ["BUILDING", "ARCHIVED"],
  BUILDING: ["READY_FOR_REVIEW", "FAILED"],
  READY_FOR_REVIEW: ["READY", "DRAFT", "ARCHIVED"],
  READY: ["LIVE", "PAUSED", "ARCHIVED", "DRAFT"],
  LIVE: ["PAUSED", "ARCHIVED"],
  PAUSED: ["LIVE", "ARCHIVED"],
  ARCHIVED: ["DRAFT"],
  FAILED: ["DRAFT", "BUILDING"],
};

const BUILD_STATUS_TRANSITIONS: Record<BuildStatus, BuildStatus[]> = {
  NOT_STARTED: ["PLANNING"],
  PLANNING: ["GENERATING", "FAILED"],
  GENERATING: ["TESTING", "FAILED"],
  TESTING: ["PACKAGING", "FAILED"],
  PACKAGING: ["READY", "FAILED"],
  READY: ["PLANNING", "NOT_STARTED"],
  FAILED: ["PLANNING", "NOT_STARTED"],
};

/**
 * Validates whether a product status transition is allowed.
 */
export function validateProductStatusTransition(
  from: ProductStatus,
  to: ProductStatus
): StateTransitionResult<ProductStatus> {
  if (from === to) {
    return { valid: true, from, to };
  }

  const allowed = PRODUCT_STATUS_TRANSITIONS[from] || [];
  if (allowed.includes(to)) {
    return { valid: true, from, to };
  }

  return {
    valid: false,
    from,
    to,
    error: `Invalid product status transition from '${from}' to '${to}'. Allowed transitions: ${allowed.join(", ") || "none"}.`,
  };
}

/**
 * Validates whether a build status transition is allowed.
 */
export function validateBuildStatusTransition(
  from: BuildStatus,
  to: BuildStatus
): StateTransitionResult<BuildStatus> {
  if (from === to) {
    return { valid: true, from, to };
  }

  const allowed = BUILD_STATUS_TRANSITIONS[from] || [];
  if (allowed.includes(to)) {
    return { valid: true, from, to };
  }

  return {
    valid: false,
    from,
    to,
    error: `Invalid build status transition from '${from}' to '${to}'. Allowed transitions: ${allowed.join(", ") || "none"}.`,
  };
}
