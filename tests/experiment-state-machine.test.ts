import { describe, it, expect } from "vitest";
import { canTransition, assertTransition } from "@/experiments/state-machine";

describe("Experiment Engine — State Machine Transitions", () => {
  it("allows standard linear lifecycle: PROPOSED -> APPROVED -> SETUP -> READY -> RUNNING -> COMPLETED -> ANALYZING -> WINNER", () => {
    expect(canTransition("PROPOSED", "APPROVED").allowed).toBe(true);
    expect(canTransition("APPROVED", "SETUP").allowed).toBe(true);
    expect(canTransition("SETUP", "READY").allowed).toBe(true);
    expect(canTransition("READY", "RUNNING").allowed).toBe(true);
    expect(canTransition("RUNNING", "COMPLETED").allowed).toBe(true);
    expect(canTransition("COMPLETED", "ANALYZING").allowed).toBe(true);
    expect(canTransition("ANALYZING", "WINNER").allowed).toBe(true);
  });

  it("allows pausing and resuming active experiments", () => {
    expect(canTransition("RUNNING", "PAUSED").allowed).toBe(true);
    expect(canTransition("PAUSED", "RUNNING").allowed).toBe(true);
  });

  it("allows stopping an active or proposed experiment", () => {
    expect(canTransition("PROPOSED", "STOPPED").allowed).toBe(true);
    expect(canTransition("RUNNING", "STOPPED").allowed).toBe(true);
    expect(canTransition("PAUSED", "STOPPED").allowed).toBe(true);
  });

  it("strictly blocks invalid backwards transitions: COMPLETED -> RUNNING", () => {
    const result = canTransition("COMPLETED", "RUNNING");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Completed experiments cannot be re-run directly");
    expect(() => assertTransition("COMPLETED", "RUNNING")).toThrow();
  });

  it("strictly blocks invalid transition: STOPPED -> RUNNING", () => {
    const result = canTransition("STOPPED", "RUNNING");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Stopped experiments cannot be resumed directly");
    expect(() => assertTransition("STOPPED", "RUNNING")).toThrow();
  });

  it("strictly blocks invalid transition: REJECTED -> RUNNING", () => {
    const result = canTransition("REJECTED", "RUNNING");
    expect(result.allowed).toBe(false);
  });
});
