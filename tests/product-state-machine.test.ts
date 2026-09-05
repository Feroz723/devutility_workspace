import { describe, it, expect } from "vitest";
import {
  validateProductStatusTransition,
  validateBuildStatusTransition,
} from "@/product-builder/state-machine";

describe("Product State Machine Transitions", () => {
  describe("ProductStatus Transitions", () => {
    it("allows legal forward flow DRAFT -> BUILDING -> READY_FOR_REVIEW -> READY -> LIVE", () => {
      expect(validateProductStatusTransition("DRAFT", "BUILDING").valid).toBe(true);
      expect(validateProductStatusTransition("BUILDING", "READY_FOR_REVIEW").valid).toBe(true);
      expect(validateProductStatusTransition("READY_FOR_REVIEW", "READY").valid).toBe(true);
      expect(validateProductStatusTransition("READY", "LIVE").valid).toBe(true);
    });

    it("allows rejection flow READY_FOR_REVIEW -> DRAFT", () => {
      expect(validateProductStatusTransition("READY_FOR_REVIEW", "DRAFT").valid).toBe(true);
    });

    it("allows archiving and pausing", () => {
      expect(validateProductStatusTransition("LIVE", "PAUSED").valid).toBe(true);
      expect(validateProductStatusTransition("PAUSED", "LIVE").valid).toBe(true);
      expect(validateProductStatusTransition("LIVE", "ARCHIVED").valid).toBe(true);
    });

    it("rejects illegal transitions like DRAFT -> LIVE or ARCHIVED -> BUILDING", () => {
      expect(validateProductStatusTransition("DRAFT", "LIVE").valid).toBe(false);
      expect(validateProductStatusTransition("ARCHIVED", "BUILDING").valid).toBe(false);
    });
  });

  describe("BuildStatus Transitions", () => {
    it("allows legal progression NOT_STARTED -> PLANNING -> GENERATING -> TESTING -> PACKAGING -> READY", () => {
      expect(validateBuildStatusTransition("NOT_STARTED", "PLANNING").valid).toBe(true);
      expect(validateBuildStatusTransition("PLANNING", "GENERATING").valid).toBe(true);
      expect(validateBuildStatusTransition("GENERATING", "TESTING").valid).toBe(true);
      expect(validateBuildStatusTransition("TESTING", "PACKAGING").valid).toBe(true);
      expect(validateBuildStatusTransition("PACKAGING", "READY").valid).toBe(true);
    });

    it("allows failure transitions from any active step", () => {
      expect(validateBuildStatusTransition("PLANNING", "FAILED").valid).toBe(true);
      expect(validateBuildStatusTransition("GENERATING", "FAILED").valid).toBe(true);
      expect(validateBuildStatusTransition("TESTING", "FAILED").valid).toBe(true);
    });

    it("rejects illegal transitions like NOT_STARTED -> READY", () => {
      expect(validateBuildStatusTransition("NOT_STARTED", "READY").valid).toBe(false);
    });
  });
});
