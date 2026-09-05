import type { ExperimentStatus } from "@/types/experiment";
import type { StateTransitionResult } from "./types";

export const ALLOWED_TRANSITIONS: Record<ExperimentStatus, ExperimentStatus[]> = {
  PROPOSED: ["APPROVED", "REJECTED", "STOPPED"],
  APPROVED: ["SETUP", "REJECTED", "STOPPED"],
  REJECTED: [],
  SETUP: ["READY", "STOPPED", "FAILED"],
  READY: ["RUNNING", "STOPPED"],
  RUNNING: ["PAUSED", "COMPLETED", "STOPPED", "FAILED"],
  PAUSED: ["RUNNING", "STOPPED", "FAILED"],
  COMPLETED: ["ANALYZING"],
  ANALYZING: ["WINNER", "PROMISING", "ITERATE", "STOPPED", "FAILED"],
  WINNER: [],
  PROMISING: ["SETUP", "ITERATE"],
  ITERATE: ["SETUP", "STOPPED"],
  STOPPED: [],
  FAILED: [],

  // Legacy status support
  active: ["paused", "completed", "stopped", "failed", "PAUSED", "COMPLETED", "STOPPED", "FAILED"],
  paused: ["active", "stopped", "RUNNING", "STOPPED"],
  completed: ["ANALYZING"],
  failed: [],
  stopped: [],
};

export function canTransition(
  from: ExperimentStatus,
  to: ExperimentStatus
): StateTransitionResult {
  const allowedNext = ALLOWED_TRANSITIONS[from] || [];
  const allowed = allowedNext.includes(to);

  if (!allowed) {
    let reason = `Invalid state transition from "${from}" to "${to}".`;
    if (from === "COMPLETED" && (to === "RUNNING" || to === "active")) {
      reason = "Completed experiments cannot be re-run directly. A new iteration must be proposed.";
    } else if ((from === "STOPPED" || from === "stopped") && (to === "RUNNING" || to === "active")) {
      reason = "Stopped experiments cannot be resumed directly. They require explicit reactivation or re-proposal.";
    }
    return {
      allowed: false,
      from,
      to,
      reason,
    };
  }

  return {
    allowed: true,
    from,
    to,
  };
}

export function assertTransition(
  from: ExperimentStatus,
  to: ExperimentStatus
): void {
  const check = canTransition(from, to);
  if (!check.allowed) {
    throw new Error(check.reason);
  }
}
