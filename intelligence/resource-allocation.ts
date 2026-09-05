import { intelligenceRepo } from "@/database/repositories/intelligence-repo";
import type { ResourceAllocation, ResourceCategory } from "@/types/intelligence";
import type { FunnelMetricsResult } from "./types";

export class ResourceAllocationEngine {
  /**
   * Calculate non-monetary resource allocations dynamically based on funnel bottlenecks
   */
  async rebalanceAllocations(
    funnel: FunnelMetricsResult,
    openTicketsCount: number,
    isDemo: boolean = false
  ): Promise<ResourceAllocation[]> {
    let productPct = 25;
    let expPct = 20;
    let distPct = 35;
    let supportPct = 10;
    let researchPct = 10;

    let distJustification = "Standard organic content distribution.";
    let supportJustification = "Routine ticket handling and documentation.";
    let productJustification = "Standard feature iteration.";

    // Scenario 1: Zero or low customers -> Distribution & Acquisition priority
    if (funnel.paid_orders === 0) {
      distPct = 45;
      productPct = 20;
      expPct = 20;
      researchPct = 10;
      supportPct = 5;
      distJustification = "Top priority: Zero paying customers. Maximize distribution and outreach.";
    }

    // Scenario 2: Active support backlog
    if (openTicketsCount > 5) {
      supportPct = 25;
      distPct = Math.max(20, distPct - 10);
      productPct = Math.max(20, productPct - 5);
      supportJustification = `Critical support load (${openTicketsCount} tickets open). Prioritizing customer success and issue resolution.`;
    }

    // Scenario 3: Validated funnel -> Scale product and experiments
    if (funnel.paid_orders >= 5) {
      productPct = 35;
      distPct = 30;
      expPct = 15;
      supportPct = 10;
      researchPct = 10;
      productJustification = "Product validated with paying users. Prioritizing retention and core feature depth.";
    }

    // Ensure total is 100%
    const total = productPct + expPct + distPct + supportPct + researchPct;
    if (total !== 100) {
      productPct += 100 - total;
    }

    const categories: Array<{
      cat: ResourceCategory;
      pct: number;
      hours: number;
      priority: number;
      justification: string;
    }> = [
      {
        cat: "DISTRIBUTION",
        pct: distPct,
        hours: (distPct / 100) * 40,
        priority: 1,
        justification: distJustification,
      },
      {
        cat: "PRODUCT_WORK",
        pct: productPct,
        hours: (productPct / 100) * 40,
        priority: 2,
        justification: productJustification,
      },
      {
        cat: "EXPERIMENTS",
        pct: expPct,
        hours: (expPct / 100) * 40,
        priority: 3,
        justification: "Hypothesis testing and conversion rate optimization tests.",
      },
      {
        cat: "CUSTOMER_SUPPORT",
        pct: supportPct,
        hours: (supportPct / 100) * 40,
        priority: 4,
        justification: supportJustification,
      },
      {
        cat: "RESEARCH",
        pct: researchPct,
        hours: (researchPct / 100) * 40,
        priority: 5,
        justification: "Market discovery and competitor teardowns.",
      },
    ];

    const allocations: ResourceAllocation[] = [];

    for (const item of categories) {
      const record: ResourceAllocation = {
        id: crypto.randomUUID(),
        category: item.cat,
        allocation_percentage: item.pct,
        time_hours_per_week: Math.round(item.hours * 10) / 10,
        compute_capacity_level: item.pct >= 35 ? "BURST" : "STANDARD",
        attention_priority: item.priority,
        justification: item.justification,
        cost_inr: 0, // STRICT ₹0 non-monetary resource allocation
        status: "ACTIVE",
        is_demo: isDemo,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await intelligenceRepo.saveResourceAllocation(record);
      allocations.push(record);
    }

    return allocations;
  }
}

export const resourceAllocationEngine = new ResourceAllocationEngine();
