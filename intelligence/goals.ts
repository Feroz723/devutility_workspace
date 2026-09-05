import { queryMany } from "@/database/client";
import { intelligenceRepo } from "@/database/repositories/intelligence-repo";
import type { BusinessGoal, BusinessGoalStatus } from "@/types/intelligence";

export class BusinessGoalTracker {
  /**
   * Evaluate all business goals against live database reality
   */
  async evaluateGoals(isDemo: boolean = false): Promise<BusinessGoal[]> {
    const goals = await intelligenceRepo.getGoals({ is_demo: isDemo });

    // Fetch live system counts
    const counts = await queryMany<any>(
      `SELECT 
         (SELECT COUNT(id) FROM customers WHERE is_demo = $1) as customers_count,
         (SELECT COALESCE(SUM(amount_paid_inr), 0) FROM orders WHERE payment_status = 'PAID' AND is_demo = $1) as revenue_inr,
         (SELECT COUNT(id) FROM users WHERE is_demo = $1) as users_count`,
      [isDemo]
    );

    const custCount = Number(counts[0]?.customers_count) || 0;
    const revInr = Number(counts[0]?.revenue_inr) || 0;
    const userCount = Number(counts[0]?.users_count) || 0;

    const updatedGoals: BusinessGoal[] = [];

    for (const g of goals) {
      let currentVal = g.current_value;
      const unit = g.unit.toUpperCase();

      if (unit === "CUSTOMERS") {
        currentVal = custCount;
      } else if (unit === "INR" || unit === "REVENUE") {
        currentVal = revInr;
      } else if (unit === "USERS") {
        currentVal = userCount;
      }

      let status: BusinessGoalStatus = g.status;
      if (status === "ACTIVE") {
        if (currentVal >= g.target_value) {
          status = "ACHIEVED";
        } else if (g.deadline && new Date(g.deadline).getTime() < Date.now()) {
          status = "MISSED";
        }
      }

      const updated: BusinessGoal = {
        ...g,
        current_value: currentVal,
        status,
        updated_at: new Date().toISOString(),
      };

      await intelligenceRepo.saveGoal(updated);
      updatedGoals.push(updated);
    }

    return updatedGoals;
  }

  /**
   * Seed default realistic baseline goals if table is empty
   */
  async ensureBaselineGoals(isDemo: boolean = false): Promise<void> {
    const existing = await intelligenceRepo.getGoals({ is_demo: isDemo });
    if (existing.length > 0) return;

    const baseline: Array<Omit<BusinessGoal, "id" | "created_at" | "updated_at">> = [
      {
        name: "Acquire First Paying Customer",
        target_value: 1,
        current_value: 0,
        unit: "CUSTOMERS",
        status: "ACTIVE",
        metadata: { priority: "CRITICAL" },
        is_demo: isDemo,
      },
      {
        name: "Reach ₹10,000 Net Revenue",
        target_value: 10000,
        current_value: 0,
        unit: "INR",
        status: "ACTIVE",
        metadata: { priority: "HIGH" },
        is_demo: isDemo,
      },
      {
        name: "Acquire 50 Registered Users",
        target_value: 50,
        current_value: 0,
        unit: "USERS",
        status: "ACTIVE",
        metadata: { priority: "MEDIUM" },
        is_demo: isDemo,
      },
    ];

    for (const b of baseline) {
      await intelligenceRepo.saveGoal({
        ...b,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }
}

export const businessGoalTracker = new BusinessGoalTracker();
