import {
  upsertUnitEconomics,
  listUnitEconomics,
} from "@/database/repositories/intelligence-repo";
import { listOrders, listCustomers } from "@/database/repositories/sales-repo";
import { listCampaigns } from "@/database/repositories/distribution-repo";
import type { UnitEconomicsResult } from "./types";
import type { CostStatus, IntelligenceConfidence } from "@/types/intelligence";

export interface CalculateUnitEconomicsOptions {
  product_id?: string;
  is_demo?: boolean;
}

export async function calculateUnitEconomics(
  options?: CalculateUnitEconomicsOptions
): Promise<UnitEconomicsResult> {
  const isDemo = options?.is_demo ?? false;
  const productId = options?.product_id;

  const [orders, customers, campaignsRes] = await Promise.all([
    listOrders({ productId, includeDemo: isDemo, limit: 1000 }).catch(() => []),
    listCustomers({ includeDemo: isDemo, limit: 1000 }).catch(() => []),
    listCampaigns({ is_demo: isDemo }).catch(() => ({ campaigns: [], total: 0 })),
  ]);

  const campaigns = campaignsRes.campaigns || [];
  const paidOrders = orders.filter((o: any) => o.status === "PAID" || o.payment_status === "PAID");
  const totalRevenue = paidOrders.reduce((sum: number, o: any) => sum + (Number(o.total_amount_cents) ? Number(o.total_amount_cents) / 100 : Number(o.amount) || 0), 0);
  const payingCustomersCount = new Set(paidOrders.map((o: any) => o.customer_id)).size;

  // Evaluate expenditure truthfully
  // Phase 7 distribution campaigns and system compute operate on ₹0 free tiers
  let costStatus: CostStatus = "RECORDED_ZERO_COST";
  let externalExpenditure = 0;

  let hasExplicitCampaignSpend = false;
  for (const c of campaigns) {
    const spent = Number((c as any).budget_inr) || ((c as any).actual_metrics && Number((c as any).actual_metrics.spent_inr)) || 0;
    if (spent > 0) {
      externalExpenditure += spent;
      hasExplicitCampaignSpend = true;
    }
  }


  if (hasExplicitCampaignSpend) {
    costStatus = "RECORDED_COST";
  } else {
    // If campaigns exist with ₹0 spend, it is verified ₹0 spend
    if (campaigns.length > 0) {
      costStatus = "RECORDED_ZERO_COST";
    } else {
      // If no cost telemetry has been tracked or connected at all, don't blindly assume ₹0
      costStatus = "UNKNOWN_COST";
    }
  }

  const hasSufficientData = payingCustomersCount >= 3;
  const confidence: IntelligenceConfidence = hasSufficientData ? "MEDIUM" : "INSUFFICIENT_DATA";

  // Gross margin percent
  let grossMarginPercent: number | null = null;
  if (costStatus === "RECORDED_ZERO_COST" && totalRevenue > 0) {
    grossMarginPercent = 100;
  } else if (costStatus === "RECORDED_COST" && totalRevenue > 0) {
    grossMarginPercent = Math.max(0, Math.round(((totalRevenue - externalExpenditure) / totalRevenue) * 10000) / 100);
  } else if (costStatus === "UNKNOWN_COST") {
    grossMarginPercent = null;
  }

  // CAC (Customer Acquisition Cost)
  let cac: number | null = null;
  if (payingCustomersCount > 0) {
    if (costStatus === "RECORDED_ZERO_COST") {
      cac = 0; // ₹0 organic customer acquisition
    } else if (costStatus === "RECORDED_COST") {
      cac = Math.round((externalExpenditure / payingCustomersCount) * 100) / 100;
    } else {
      cac = null;
    }
  }

  // LTV (Customer Lifetime Value) & RPU (Revenue Per User)
  const ltv = payingCustomersCount > 0 ? Math.round((totalRevenue / payingCustomersCount) * 100) / 100 : null;
  const totalUsersCount = customers.length;
  const rpu = totalUsersCount > 0 ? Math.round((totalRevenue / totalUsersCount) * 100) / 100 : null;

  // Payback period
  let paybackPeriodDays: number | null = null;
  if (cac !== null && cac === 0) {
    paybackPeriodDays = 0;
  } else if (cac !== null && rpu !== null && rpu > 0) {
    paybackPeriodDays = Math.round((cac / rpu) * 30 * 10) / 10;
  }

  const result: UnitEconomicsResult = {
    revenue_inr: totalRevenue,
    cost_inr: externalExpenditure,
    cost_status: costStatus,
    gross_margin_percent: grossMarginPercent,
    customer_acquisition_cost_inr: cac,
    customer_lifetime_value_inr: ltv,
    payback_period_days: paybackPeriodDays,
    revenue_per_user_inr: rpu,
    confidence,
    has_sufficient_data: hasSufficientData,
  };

  await upsertUnitEconomics({
    product_id: productId ?? null,
    revenue_inr: totalRevenue,
    cost_inr: externalExpenditure,
    cost_status: costStatus,
    gross_margin_percent: grossMarginPercent,
    customer_acquisition_cost_inr: cac,
    customer_lifetime_value_inr: ltv,
    payback_period_days: paybackPeriodDays,
    revenue_per_user_inr: rpu,
    confidence,
    has_sufficient_data: hasSufficientData,
    is_demo: isDemo,
  });

  return result;
}

export const unitEconomicsEngine = {
  computeEconomics: async (productId?: string, isDemo: boolean = false) =>
    calculateUnitEconomics({ product_id: productId, is_demo: isDemo }),
};

