import { queryMany } from "@/database/client";
import { intelligenceRepo } from "@/database/repositories/intelligence-repo";
import type { CustomerCohort } from "@/types/intelligence";

export interface CohortAnalysisResult {
  cohorts: CustomerCohort[];
  total_customers_analyzed: number;
  has_sufficient_data: boolean;
}

export class CustomerCohortAnalyzer {
  /**
   * Analyze customer cohorts across dimensions: signup_period, channel, product, offer
   */
  async analyzeCohorts(isDemo: boolean = false): Promise<CohortAnalysisResult> {
    const cohorts: CustomerCohort[] = [];

    // 1. Analyze by Acquisition Channel
    const channelRows = await queryMany<any>(
      `SELECT 
         COALESCE(c.acquisition_channel, 'DIRECT') as channel,
         COUNT(c.id) as cohort_size,
         COUNT(CASE WHEN c.health_score > 50 OR cs.activation_status = 'ACTIVATED' THEN 1 END) as activated_count,
         COUNT(CASE WHEN c.retention_status = 'ACTIVE' THEN 1 END) as retained_count,
         COUNT(CASE WHEN c.retention_status = 'CHURNED' THEN 1 END) as churned_count,
         COALESCE(SUM(c.lifetime_value_inr), 0) as total_revenue,
         COALESCE(SUM(c.support_tickets_count), 0) as support_tickets
       FROM customers c
       LEFT JOIN customer_success cs ON cs.customer_id = c.id
       WHERE c.is_demo = $1
       GROUP BY c.acquisition_channel`,
      [isDemo]
    );

    for (const row of channelRows) {
      const size = Number(row.cohort_size) || 0;
      const cohort: CustomerCohort = {
        id: crypto.randomUUID(),
        cohort_name: `Channel: ${row.channel}`,
        cohort_type: "CHANNEL",
        dimension_value: row.channel,
        cohort_size: size,
        activated_count: Number(row.activated_count) || 0,
        retained_30d_count: Number(row.retained_count) || 0,
        churned_count: Number(row.churned_count) || 0,
        total_revenue_inr: Number(row.total_revenue) || 0,
        support_tickets_count: Number(row.support_tickets) || 0,
        has_sufficient_data: size >= 5,
        metadata: {
          activation_rate_percent: size > 0 ? ((Number(row.activated_count) || 0) / size) * 100 : 0,
          retention_rate_percent: size > 0 ? ((Number(row.retained_count) || 0) / size) * 100 : 0,
        },
        is_demo: isDemo,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      cohorts.push(cohort);
      await intelligenceRepo.saveCohort(cohort);
    }

    // 2. Analyze by Product
    const productRows = await queryMany<any>(
      `SELECT 
         o.product_id,
         COUNT(DISTINCT c.id) as cohort_size,
         COUNT(DISTINCT CASE WHEN c.retention_status = 'ACTIVE' THEN c.id END) as retained_count,
         COUNT(DISTINCT CASE WHEN c.retention_status = 'CHURNED' THEN c.id END) as churned_count,
         COALESCE(SUM(o.amount_paid_inr), 0) as total_revenue
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.payment_status = 'PAID' AND o.is_demo = $1
       GROUP BY o.product_id`,
      [isDemo]
    );

    for (const row of productRows) {
      const size = Number(row.cohort_size) || 0;
      const cohort: CustomerCohort = {
        id: crypto.randomUUID(),
        cohort_name: `Product: ${row.product_id}`,
        cohort_type: "PRODUCT",
        dimension_value: row.product_id,
        cohort_size: size,
        activated_count: size, // All who purchased a product
        retained_30d_count: Number(row.retained_count) || 0,
        churned_count: Number(row.churned_count) || 0,
        total_revenue_inr: Number(row.total_revenue) || 0,
        support_tickets_count: 0,
        has_sufficient_data: size >= 5,
        metadata: {
          product_id: row.product_id,
        },
        is_demo: isDemo,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      cohorts.push(cohort);
      await intelligenceRepo.saveCohort(cohort);
    }

    // 3. Analyze by Signup Month
    const timeRows = await queryMany<any>(
      `SELECT 
         TO_CHAR(c.created_at, 'YYYY-MM') as signup_month,
         COUNT(c.id) as cohort_size,
         COUNT(CASE WHEN c.retention_status = 'ACTIVE' THEN 1 END) as retained_count,
         COUNT(CASE WHEN c.retention_status = 'CHURNED' THEN 1 END) as churned_count,
         COALESCE(SUM(c.lifetime_value_inr), 0) as total_revenue,
         COALESCE(SUM(c.support_tickets_count), 0) as support_tickets
       FROM customers c
       WHERE c.is_demo = $1
       GROUP BY TO_CHAR(c.created_at, 'YYYY-MM')
       ORDER BY signup_month DESC`,
      [isDemo]
    );

    for (const row of timeRows) {
      const size = Number(row.cohort_size) || 0;
      const cohort: CustomerCohort = {
        id: crypto.randomUUID(),
        cohort_name: `Month: ${row.signup_month}`,
        cohort_type: "SIGNUP_MONTH",
        dimension_value: row.signup_month,
        cohort_size: size,
        activated_count: size,
        retained_30d_count: Number(row.retained_count) || 0,
        churned_count: Number(row.churned_count) || 0,
        total_revenue_inr: Number(row.total_revenue) || 0,
        support_tickets_count: Number(row.support_tickets) || 0,
        has_sufficient_data: size >= 5,
        metadata: {
          signup_month: row.signup_month,
        },
        is_demo: isDemo,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      cohorts.push(cohort);
      await intelligenceRepo.saveCohort(cohort);
    }

    const totalCustomers = cohorts.reduce((acc, c) => acc + (c.cohort_type === "CHANNEL" ? c.cohort_size : 0), 0);

    return {
      cohorts,
      total_customers_analyzed: totalCustomers,
      has_sufficient_data: totalCustomers >= 10,
    };
  }
}

export const customerCohortAnalyzer = new CustomerCohortAnalyzer();
