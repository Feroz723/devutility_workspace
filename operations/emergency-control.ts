import { operationsRepo } from "@/database/repositories/operations-repo";
import { operationsEventBus } from "./event-bus";
import type { SystemState, AgentRegistryItem } from "@/types/operations";

export class EmergencyControlManager {
  /**
   * Pause all autonomous execution globally
   */
  async pauseGlobally(reason: string = "Operator paused"): Promise<SystemState> {
    const updated = await operationsRepo.updateSystemState({
      is_paused: true,
      pause_reason: reason,
    });

    await operationsEventBus.publish({
      event_type: "EMERGENCY_PAUSE_TRIGGERED",
      source_module: "OPERATIONS",
      entity_type: "SYSTEM",
      entity_id: "GLOBAL_SYSTEM_STATE",
      payload: { reason },
    });

    return updated;
  }

  /**
   * Resume autonomous execution globally (if kill switch is not active)
   */
  async resumeGlobally(): Promise<SystemState> {
    const current = await operationsRepo.getSystemState();
    if (current.is_kill_switch_active) {
      throw new Error("Cannot resume while Emergency Kill Switch is engaged. Must disengage kill switch first.");
    }

    const updated = await operationsRepo.updateSystemState({
      is_paused: false,
      pause_reason: null,
    });

    await operationsEventBus.publish({
      event_type: "EMERGENCY_RESUME_TRIGGERED",
      source_module: "OPERATIONS",
      entity_type: "SYSTEM",
      entity_id: "GLOBAL_SYSTEM_STATE",
      payload: { resumed_at: new Date().toISOString() },
    });

    return updated;
  }

  /**
   * Engage Emergency Kill Switch (Immediately halts all autonomous execution)
   */
  async engageKillSwitch(reason: string): Promise<SystemState> {
    const now = new Date().toISOString();
    const updated = await operationsRepo.updateSystemState({
      is_kill_switch_active: true,
      kill_switch_triggered_at: now,
      kill_switch_reason: reason,
      is_paused: true,
      pause_reason: `Kill switch active: ${reason}`,
    });

    await operationsEventBus.publish({
      event_type: "KILL_SWITCH_ENGAGED",
      source_module: "OPERATIONS",
      entity_type: "SYSTEM",
      entity_id: "GLOBAL_SYSTEM_STATE",
      payload: { reason, triggered_at: now },
    });

    return updated;
  }

  /**
   * Disengage Emergency Kill Switch and restore system to paused/ready state
   */
  async disengageKillSwitch(operatorName: string, confirmationReason: string): Promise<SystemState> {
    const now = new Date().toISOString();
    const updated = await operationsRepo.updateSystemState({
      is_kill_switch_active: false,
      kill_switch_reason: null,
      kill_switch_triggered_at: null,
      is_paused: false,
      pause_reason: null,
      metadata: {
        last_kill_switch_restored_by: operatorName,
        restored_at: now,
        reason: confirmationReason,
      },
    });

    await operationsEventBus.publish({
      event_type: "EMERGENCY_RESUME_TRIGGERED",
      source_module: "OPERATIONS",
      entity_type: "SYSTEM",
      entity_id: "GLOBAL_SYSTEM_STATE",
      payload: { operator: operatorName, reason: confirmationReason },
    });

    return updated;
  }

  /**
   * Pause an individual domain agent
   */
  async pauseAgent(agentId: string, reason?: string): Promise<AgentRegistryItem | null> {
    const updated = await operationsRepo.updateAgentStatus(agentId, "PAUSED", reason);
    if (updated) {
      await operationsEventBus.publish({
        event_type: "AGENT_PAUSED",
        source_module: "OPERATIONS",
        entity_type: "AGENT",
        entity_id: agentId,
        payload: { reason },
      });
    }
    return updated;
  }

  /**
   * Resume an individual domain agent
   */
  async resumeAgent(agentId: string): Promise<AgentRegistryItem | null> {
    const updated = await operationsRepo.updateAgentStatus(agentId, "ACTIVE");
    if (updated) {
      await operationsEventBus.publish({
        event_type: "AGENT_RESUMED",
        source_module: "OPERATIONS",
        entity_type: "AGENT",
        entity_id: agentId,
        payload: { resumed_at: new Date().toISOString() },
      });
    }
    return updated;
  }

  /**
   * Complete safe recovery helper: disengages kill switch if active and resumes globally
   */
  async resumeSystem(reason: string = "Operator resumed system"): Promise<SystemState> {
    const current = await operationsRepo.getSystemState();
    if (current.is_kill_switch_active) {
      await this.disengageKillSwitch("OPERATOR", reason);
    }
    return await this.resumeGlobally();
  }
}

export const emergencyControlManager = new EmergencyControlManager();
export const emergencyControl = emergencyControlManager;
