import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateUnitEconomics } from "@/intelligence/unit-economics";
import { businessForecastingEngine } from "@/intelligence/forecast";
import * as salesRepo from "@/database/repositories/sales-repo";
import * as distributionRepo from "@/database/repositories/distribution-repo";
import * as intelligenceRepo from "@/database/repositories/intelligence-repo";

describe("Phase 10 — Unit Economics & Forecasting Engine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Unit Economics: RECORDED_ZERO_COST vs UNKNOWN_COST", () => {
    it("assigns UNKNOWN_COST when no cost tracking or campaigns exist", async () => {
      vi.spyOn(salesRepo, "listOrders").mockResolvedValue([
        { id: "o-1", customer_id: "c-1", status: "PAID", total_amount_cents: 50000 } as any,
        { id: "o-2", customer_id: "c-2", status: "PAID", total_amount_cents: 50000 } as any,
        { id: "o-3", customer_id: "c-3", status: "PAID", total_amount_cents: 50000 } as any,
      ]);
      vi.spyOn(salesRepo, "listCustomers").mockResolvedValue([
        { id: "c-1" }, { id: "c-2" }, { id: "c-3" }
      ] as any);
      vi.spyOn(distributionRepo, "listCampaigns").mockResolvedValue({ campaigns: [], total: 0 });
      vi.spyOn(intelligenceRepo, "upsertUnitEconomics").mockResolvedValue({} as any);

      const result = await calculateUnitEconomics({ is_demo: false });

      expect(result.cost_status).toBe("UNKNOWN_COST");
      expect(result.customer_acquisition_cost_inr).toBeNull();
      expect(result.gross_margin_percent).toBeNull();
    });

    it("assigns RECORDED_ZERO_COST when verified ₹0 spend campaigns exist", async () => {
      vi.spyOn(salesRepo, "listOrders").mockResolvedValue([
        { id: "o-1", customer_id: "c-1", status: "PAID", total_amount_cents: 100000 } as any,
        { id: "o-2", customer_id: "c-2", status: "PAID", total_amount_cents: 100000 } as any,
        { id: "o-3", customer_id: "c-3", status: "PAID", total_amount_cents: 100000 } as any,
      ]);
      vi.spyOn(salesRepo, "listCustomers").mockResolvedValue([
        { id: "c-1" }, { id: "c-2" }, { id: "c-3" }
      ] as any);
      vi.spyOn(distributionRepo, "listCampaigns").mockResolvedValue({
        campaigns: [{ id: "cmp-zero", budget_inr: 0, actual_metrics: { spent_inr: 0 } } as any],
        total: 1,
      });
      vi.spyOn(intelligenceRepo, "upsertUnitEconomics").mockResolvedValue({} as any);

      const result = await calculateUnitEconomics({ is_demo: false });

      expect(result.cost_status).toBe("RECORDED_ZERO_COST");
      expect(result.customer_acquisition_cost_inr).toBe(0);
      expect(result.gross_margin_percent).toBe(100);
      expect(result.payback_period_days).toBe(0);
    });

    it("correctly calculates CAC and margin when non-zero costs are recorded", async () => {
      vi.spyOn(salesRepo, "listOrders").mockResolvedValue([
        { id: "o-1", customer_id: "c-1", status: "PAID", total_amount_cents: 100000 } as any, // ₹1000
        { id: "o-2", customer_id: "c-2", status: "PAID", total_amount_cents: 100000 } as any, // ₹1000
      ]);
      vi.spyOn(salesRepo, "listCustomers").mockResolvedValue([{ id: "c-1" }, { id: "c-2" }] as any);
      vi.spyOn(distributionRepo, "listCampaigns").mockResolvedValue({
        campaigns: [{ id: "cmp-paid", budget_inr: 500, actual_metrics: { spent_inr: 500 } } as any],
        total: 1,
      });
      vi.spyOn(intelligenceRepo, "upsertUnitEconomics").mockResolvedValue({} as any);

      const result = await calculateUnitEconomics({ is_demo: false });

      expect(result.cost_status).toBe("RECORDED_COST");
      // Total revenue = ₹2000, spend = ₹500, 2 paying customers -> CAC = ₹250
      expect(result.customer_acquisition_cost_inr).toBe(250);
      // Margin = (2000 - 500) / 2000 * 100 = 75%
      expect(result.gross_margin_percent).toBe(75);
    });
  });

  describe("Deterministic Linear Forecasting", () => {
    it("refuses to fabricate forecast when historical data is insufficient", () => {
      const result = businessForecastingEngine.computeDeterministicForecast(
        "REVENUE_TREND",
        "monthly_revenue",
        [0, 0], // Only 2 points, all zeros
        30
      );

      expect(result.has_sufficient_data).toBe(false);
      expect(result.forecast_value).toBeNull();
      expect(result.confidence).toBe("INSUFFICIENT_DATA");
    });

    it("projects deterministic linear slope when sufficient non-zero history exists", () => {
      const history = [1000, 1200, 1400, 1600]; // slope = (1600 - 1000)/3 = 200
      const result = businessForecastingEngine.computeDeterministicForecast(
        "REVENUE_TREND",
        "monthly_revenue",
        history,
        30
      );

      expect(result.has_sufficient_data).toBe(true);
      expect(result.forecast_value).toBe(1800); // 1600 + 200
      expect(result.projected_change_percent).toBeCloseTo(12.5, 1);
      expect(["HIGH", "MEDIUM"]).toContain(result.confidence);
      expect(result.assumptions.length).toBeGreaterThan(0);
    });
  });
});
