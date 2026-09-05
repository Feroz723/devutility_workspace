import { operationsRepo } from "@/database/repositories/operations-repo";
import type { OperationsJob, JobStatus } from "@/types/operations";

export interface DependencyCheckResult {
  satisfied: boolean;
  pendingPrerequisites: string[];
  failedPrerequisites: string[];
  status: "READY" | "WAITING" | "BLOCKED";
}

export class DependencyGraphManager {
  /**
   * Evaluates whether all prerequisites for a given job are satisfied
   */
  async checkDependencies(job: OperationsJob): Promise<DependencyCheckResult> {
    const dependsOn = Array.isArray(job.depends_on) ? job.depends_on : [];
    if (dependsOn.length === 0) {
      return {
        satisfied: true,
        pendingPrerequisites: [],
        failedPrerequisites: [],
        status: "READY",
      };
    }

    const pending: string[] = [];
    const failed: string[] = [];

    for (const depId of dependsOn) {
      const parentJob = await operationsRepo.getJobById(depId).catch(() => null);

      if (!parentJob) {
        // Look up by idempotency key if ID not found
        const byKey = await operationsRepo.getJobByIdempotencyKey(depId).catch(() => null);
        if (!byKey) {
          failed.push(`${depId} (NOT_FOUND)`);
          continue;
        }

        if (byKey.status === "SUCCEEDED") {
          continue;
        } else if (["FAILED", "DEAD_LETTER", "CANCELLED"].includes(byKey.status)) {
          failed.push(`${depId} (${byKey.status})`);
        } else {
          pending.push(`${depId} (${byKey.status})`);
        }
        continue;
      }

      if (parentJob.status === "SUCCEEDED") {
        continue;
      } else if (["FAILED", "DEAD_LETTER", "CANCELLED"].includes(parentJob.status)) {
        failed.push(`${depId} (${parentJob.status})`);
      } else {
        pending.push(`${depId} (${parentJob.status})`);
      }
    }

    if (failed.length > 0) {
      return {
        satisfied: false,
        pendingPrerequisites: pending,
        failedPrerequisites: failed,
        status: "BLOCKED",
      };
    }

    if (pending.length > 0) {
      return {
        satisfied: false,
        pendingPrerequisites: pending,
        failedPrerequisites: [],
        status: "WAITING",
      };
    }

    return {
      satisfied: true,
      pendingPrerequisites: [],
      failedPrerequisites: [],
      status: "READY",
    };
  }

  /**
   * Validates a set of job dependency relationships for circular references (cycle detection)
   */
  detectCycles(nodes: { id: string; depends_on: string[] }[]): { hasCycle: boolean; cyclePath?: string[] } {
    const adjList = new Map<string, string[]>();
    for (const n of nodes) {
      adjList.set(n.id, n.depends_on || []);
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    function dfs(nodeId: string): boolean {
      visited.add(nodeId);
      recStack.add(nodeId);
      path.push(nodeId);

      const neighbors = adjList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          path.push(neighbor);
          return true;
        }
      }

      recStack.delete(nodeId);
      path.pop();
      return false;
    }

    for (const n of nodes) {
      if (!visited.has(n.id)) {
        if (dfs(n.id)) {
          return { hasCycle: true, cyclePath: path };
        }
      }
    }

    return { hasCycle: false };
  }
}

export const dependencyGraphManager = new DependencyGraphManager();
