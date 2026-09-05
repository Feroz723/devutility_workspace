import type {
  OperationsJob,
  FailureClassification,
  JobStatus,
} from "@/types/operations";

export class RetryEngine {
  /**
   * Classifies an error into a standardized operational category
   */
  classifyError(error: Error | string | any): FailureClassification {
    const message = (typeof error === "string" ? error : error?.message || "").toLowerCase();
    const stack = (error?.stack || "").toLowerCase();
    const combined = `${message} ${stack}`;

    // Security & Prohibited actions
    if (
      combined.includes("security") ||
      combined.includes("ssrf") ||
      combined.includes("injection") ||
      combined.includes("prohibited") ||
      combined.includes("unauthorized") ||
      combined.includes("forbidden") ||
      combined.includes("spending limit")
    ) {
      return "SECURITY";
    }

    // Manual setup or missing credentials
    if (
      combined.includes("not_connected") ||
      combined.includes("requires_manual_setup") ||
      combined.includes("missing api key") ||
      combined.includes("credentials missing")
    ) {
      return "MANUAL_SETUP";
    }

    // Authentication failure
    if (
      combined.includes("invalid key") ||
      combined.includes("bad credentials") ||
      combined.includes("auth error") ||
      combined.includes("unauthenticated")
    ) {
      return "AUTHENTICATION";
    }

    // Rate limits
    if (
      combined.includes("rate limit") ||
      combined.includes("too many requests") ||
      combined.includes("429")
    ) {
      return "RATE_LIMIT";
    }

    // Transient network/connection failures
    if (
      combined.includes("econnrefused") ||
      combined.includes("econnreset") ||
      combined.includes("etimedout") ||
      combined.includes("timeout") ||
      combined.includes("network") ||
      combined.includes("socket hang up") ||
      combined.includes("503") ||
      combined.includes("502") ||
      combined.includes("504") ||
      combined.includes("temporary")
    ) {
      return "TRANSIENT";
    }

    // Schema & payload validation
    if (
      combined.includes("validation") ||
      combined.includes("zod") ||
      combined.includes("invalid argument") ||
      combined.includes("syntax error")
    ) {
      return "VALIDATION";
    }

    // Business rules & eligibility
    if (
      combined.includes("ineligible") ||
      combined.includes("precondition") ||
      combined.includes("zero sales") ||
      combined.includes("stop candidate")
    ) {
      return "BUSINESS_RULE";
    }

    return "PERMANENT";
  }

  /**
   * Determine whether a failure classification is safe to retry automatically
   */
  isRetryable(classification: FailureClassification): boolean {
    return classification === "TRANSIENT" || classification === "RATE_LIMIT";
  }

  /**
   * Compute next backoff delay in milliseconds using exponential backoff with jitter
   */
  computeBackoffMs(
    attempt: number,
    policy?: {
      backoff_base_ms?: number;
      backoff_factor?: number;
      max_backoff_ms?: number;
    }
  ): number {
    const base = policy?.backoff_base_ms ?? 1000;
    const factor = policy?.backoff_factor ?? 2;
    const max = policy?.max_backoff_ms ?? 30000;

    // Exponential calculation: base * factor^(attempt - 1)
    const rawBackoff = base * Math.pow(factor, Math.max(0, attempt - 1));
    // Add jitter +/- 20%
    const jitter = 0.8 + Math.random() * 0.4;
    const backoff = Math.min(max, Math.round(rawBackoff * jitter));

    return backoff;
  }

  /**
   * Evaluates the next lifecycle state and scheduling time for a failed job
   */
  evaluateFailureOutcome(
    job: OperationsJob,
    error: Error | string
  ): {
    nextStatus: JobStatus;
    classification: FailureClassification;
    nextRunAt?: string;
    shouldRetry: boolean;
  } {
    const classification = this.classifyError(error);
    const nextAttempt = (job.attempts || 0) + 1;
    const maxAttempts = job.max_attempts || job.retry_policy?.max_attempts || 3;

    // If human approval is required
    if (job.required_approval) {
      return {
        nextStatus: "REQUIRES_APPROVAL",
        classification: "BUSINESS_RULE",
        shouldRetry: false,
      };
    }

    // If manual setup is needed
    if (classification === "MANUAL_SETUP") {
      return {
        nextStatus: "REQUIRES_MANUAL_SETUP",
        classification: "MANUAL_SETUP",
        shouldRetry: false,
      };
    }

    // If non-retryable or max attempts exceeded
    if (!this.isRetryable(classification) || nextAttempt >= maxAttempts) {
      return {
        nextStatus: "DEAD_LETTER",
        classification,
        shouldRetry: false,
      };
    }

    // Safe transient retry
    const backoffMs = this.computeBackoffMs(nextAttempt, job.retry_policy);
    const nextRunAt = new Date(Date.now() + backoffMs).toISOString();

    return {
      nextStatus: "RETRYING",
      classification,
      nextRunAt,
      shouldRetry: true,
    };
  }
}

export const retryEngine = new RetryEngine();
