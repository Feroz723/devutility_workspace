import { queryMany } from "@/database/client";

export interface CustomerSignalsSummary {
  total_customers: number;
  healthy_customers_count: number;
  warning_customers_count: number;
  at_risk_customers_count: number;
  average_health_score: number;
  onboarding_completion_rate: number;
  top_friction_steps: Array<{ step_key: string; dropoff_count: number }>;
  top_support_categories: Array<{ category: string; ticket_count: number }>;
  active_churn_rate_percent: number;
  has_sufficient_data: boolean;
}

export class CustomerSignalsAggregator {
  /**
   * Aggregate customer health, retention, and support friction signals
   */
  async aggregateSignals(isDemo: boolean = false): Promise<CustomerSignalsSummary> {
    // 1. Customer Health Breakdown
    const healthRows = await queryMany<any>(
      `SELECT 
         COUNT(id) as total_count,
         COUNT(CASE WHEN health_score >= 70 THEN 1 END) as healthy_count,
         COUNT(CASE WHEN health_score >= 40 AND health_score < 70 THEN 1 END) as warning_count,
         COUNT(CASE WHEN health_score < 40 THEN 1 END) as at_risk_count,
         AVG(health_score) as avg_health,
         COUNT(CASE WHEN retention_status = 'CHURNED' THEN 1 END) as churn_count
       FROM customers
       WHERE is_demo = $1`,
      [isDemo]
    );

    const total = Number(healthRows[0]?.total_count) || 0;
    const healthy = Number(healthRows[0]?.healthy_count) || 0;
    const warning = Number(healthRows[0]?.warning_count) || 0;
    const atRisk = Number(healthRows[0]?.at_risk_count) || 0;
    const avgHealth = Math.round(Number(healthRows[0]?.avg_health) || 0);
    const churn = Number(healthRows[0]?.churn_count) || 0;
    const churnRate = total > 0 ? (churn / total) * 100 : 0;

    // 2. Onboarding completion
    const onboardingRows = await queryMany<any>(
      `SELECT 
         COUNT(id) as total_onboardings,
         COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed_count
       FROM customer_onboarding
       WHERE is_demo = $1`,
      [isDemo]
    );
    const totalOnboard = Number(onboardingRows[0]?.total_onboardings) || 0;
    const completedOnboard = Number(onboardingRows[0]?.completed_count) || 0;
    const onboardRate = totalOnboard > 0 ? (completedOnboard / totalOnboard) * 100 : 0;

    // 3. Top Support Categories
    const supportRows = await queryMany<any>(
      `SELECT category, COUNT(id) as ticket_count
       FROM support_tickets
       WHERE is_demo = $1
       GROUP BY category
       ORDER BY ticket_count DESC
       LIMIT 5`,
      [isDemo]
    );

    const topCategories = supportRows.map((r) => ({
      category: r.category || "GENERAL",
      ticket_count: Number(r.ticket_count) || 0,
    }));

    return {
      total_customers: total,
      healthy_customers_count: healthy,
      warning_customers_count: warning,
      at_risk_customers_count: atRisk,
      average_health_score: avgHealth,
      onboarding_completion_rate: onboardRate,
      top_friction_steps: [],
      top_support_categories: topCategories,
      active_churn_rate_percent: churnRate,
      has_sufficient_data: total >= 5,
    };
  }
}

export const customerSignalsAggregator = new CustomerSignalsAggregator();
