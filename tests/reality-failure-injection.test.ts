import { describe, it, expect, beforeEach } from "vitest";
import { failureInjector } from "@/simulation/failure-injector";

describe("Phase 14 Failure Injection: Controlled Fault Simulation & Safe Recovery", () => {
  beforeEach(() => {
    failureInjector.reset();
  });

  it("Recovers gracefully from AI provider outage via fallback", async () => {
    failureInjector.setRule({
      target: "AI_PROVIDER",
      enabled: true,
      failureType: "ERROR_500",
      errorMessage: "AI service down",
    });

    const result = await failureInjector.intercept(
      "AI_PROVIDER",
      async () => "AI_GENERATED_CONTENT",
      async () => "DETERMINISTIC_FALLBACK_CONTENT"
    );

    expect(result).toBe("DETERMINISTIC_FALLBACK_CONTENT");
    expect(failureInjector.getHistory().length).toBe(1);
    expect(failureInjector.getHistory()[0]?.fallbackUsed).toBe(true);
  });

  it("Throws intercepted error when no fallback is supplied", async () => {
    failureInjector.setRule({
      target: "DATABASE",
      enabled: true,
      failureType: "TIMEOUT",
      errorMessage: "Database connection timeout",
    });

    await expect(
      failureInjector.intercept("DATABASE", async () => "DB_RESULT")
    ).rejects.toThrow("Database connection timeout");
  });

  it("Passes through transparently when fault rule is disabled", async () => {
    failureInjector.setRule({
      target: "EMAIL_SERVICE",
      enabled: false,
      failureType: "AUTH_FAILURE",
    });

    const result = await failureInjector.intercept(
      "EMAIL_SERVICE",
      async () => "EMAIL_SENT"
    );

    expect(result).toBe("EMAIL_SENT");
    expect(failureInjector.getHistory().length).toBe(0);
  });

  it("Safely intercepts synchronous operations with fallback", () => {
    failureInjector.setRule({
      target: "RESEARCH_PROVIDER",
      enabled: true,
      failureType: "MALFORMED",
    });

    const result = failureInjector.interceptSync(
      "RESEARCH_PROVIDER",
      () => ({ data: "live" }),
      () => ({ data: "cached_fallback" })
    );

    expect(result.data).toBe("cached_fallback");
  });
});
