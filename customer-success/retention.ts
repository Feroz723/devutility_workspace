import {
  listCustomerProfiles,
  listCustomerEvents,
  upsertCustomerRetention,
  listCustomerRetention,
} from "@/database/repositories/customer-success-repo";
import type { CustomerRetention } from "@/types/customer-success";

export interface CohortCalculationResult {
  cohort_date: string;
  product_id?: string | null;
  cohort_size: number;
  day_1_retained: number;
  day_7_retained: number;
  day_14_retained: number;
  day_30_retained: number;
  weekly_active_customers: number;
  monthly_active_customers: number;
  repeat_usage_rate_percent: number;
  has_sufficient_data: boolean;
}

export async function calculateCohortRetention(
  cohortDateStr: string,
  productId?: string,
  isDemo?: boolean
): Promise<CohortCalculationResult> {
  const cohortDate = new Date(cohortDateStr);
  const startOfDay = new Date(cohortDate.getFullYear(), cohortDate.getMonth(), cohortDate.getDate()).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

  // Find all customers who were created on this cohort date
  const allProfiles = await listCustomerProfiles({ is_demo: isDemo, limit: 1000 });
  const cohortCustomers = allProfiles.filter((p) => {
    const createdTime = new Date(p.created_at).getTime();
    return createdTime >= startOfDay && createdTime < endOfDay;
  });

  const cohortSize = cohortCustomers.length;
  if (cohortSize === 0) {
    const emptyResult: CohortCalculationResult = {
      cohort_date: cohortDateStr,
      product_id: productId,
      cohort_size: 0,
      day_1_retained: 0,
      day_7_retained: 0,
      day_14_retained: 0,
      day_30_retained: 0,
      weekly_active_customers: 0,
      monthly_active_customers: 0,
      repeat_usage_rate_percent: 0,
      has_sufficient_data: false,
    };
    await upsertCustomerRetention(emptyResult);
    return emptyResult;
  }

  const now = Date.now();
  const daysSinceCohort = Math.floor((now - startOfDay) / (24 * 60 * 60 * 1000));

  let day1Count = 0;
  let day7Count = 0;
  let day14Count = 0;
  let day30Count = 0;
  let repeatUsers = 0;

  for (const customer of cohortCustomers) {
    const events = await listCustomerEvents({ customer_id: customer.customer_id, limit: 100 });
    if (events.length > 1) {
      repeatUsers++;
    }

    // Check specific intervals
    let activeD1 = false;
    let activeD7 = false;
    let activeD14 = false;
    let activeD30 = false;

    for (const ev of events) {
      const eventTime = new Date(ev.created_at).getTime();
      const diffDays = Math.floor((eventTime - startOfDay) / (24 * 60 * 60 * 1000));

      if (diffDays === 1) activeD1 = true;
      if (diffDays >= 6 && diffDays <= 8) activeD7 = true;
      if (diffDays >= 13 && diffDays <= 15) activeD14 = true;
      if (diffDays >= 28 && diffDays <= 32) activeD30 = true;
    }

    if (activeD1) day1Count++;
    if (activeD7) day7Count++;
    if (activeD14) day14Count++;
    if (activeD30) day30Count++;
  }

  // WAC: active in past 7 days
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  let wac = 0;
  let mac = 0;

  for (const customer of cohortCustomers) {
    const events = await listCustomerEvents({ customer_id: customer.customer_id, limit: 100 });
    const has7d = events.some((e) => new Date(e.created_at).getTime() >= sevenDaysAgo);
    const has30d = events.some((e) => new Date(e.created_at).getTime() >= thirtyDaysAgo);
    if (has7d) wac++;
    if (has30d) mac++;
  }

  const repeatUsageRate = cohortSize > 0 ? Math.round((repeatUsers / cohortSize) * 100) : 0;
  const hasSufficientData = cohortSize >= 5 && daysSinceCohort >= 7;

  const result: CohortCalculationResult = {
    cohort_date: cohortDateStr,
    product_id: productId,
    cohort_size: cohortSize,
    day_1_retained: day1Count,
    day_7_retained: day7Count,
    day_14_retained: day14Count,
    day_30_retained: day30Count,
    weekly_active_customers: wac,
    monthly_active_customers: mac,
    repeat_usage_rate_percent: repeatUsageRate,
    has_sufficient_data: hasSufficientData,
  };

  await upsertCustomerRetention({
    ...result,
    is_demo: isDemo,
  });

  return result;
}
