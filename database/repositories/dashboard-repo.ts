import { queryOne } from "../client";

export interface DashboardStats {
  opportunities: {
    total: number;
    validated: number;
    testing: number;
    winners: number;
  };
  experiments: {
    active: number;
    completed: number;
    failed: number;
  };
  products: {
    launched: number;
  };
  business: {
    traffic: number;
    conversions: number;
    revenue: number;
  };
  approvals: {
    pending: number;
  };
  automation: {
    connected: number;
    running: number;
    failed: number;
  };
}

/**
 * Get dashboard statistics.
 * IMPORTANT: All metrics EXCLUDE demo records (is_demo = true).
 * If no real data exists, returns 0.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  // Opportunities (exclude demo)
  const oppStats = await queryOne<{
    total: string;
    validated: string;
    testing: string;
    winners: string;
  }>(`
    SELECT
      COUNT(*) FILTER (WHERE is_demo = false) as total,
      COUNT(*) FILTER (WHERE is_demo = false AND status = 'validated') as validated,
      COUNT(*) FILTER (WHERE is_demo = false AND status = 'testing') as testing,
      COUNT(*) FILTER (WHERE is_demo = false AND status = 'validated' AND decision = 'TEST') as winners
    FROM opportunities
  `);

  // Experiments (exclude demo)
  const expStats = await queryOne<{
    active: string;
    completed: string;
    failed: string;
  }>(`
    SELECT
      COUNT(*) FILTER (WHERE is_demo = false AND status = 'active') as active,
      COUNT(*) FILTER (WHERE is_demo = false AND status = 'completed') as completed,
      COUNT(*) FILTER (WHERE is_demo = false AND status = 'failed') as failed
    FROM experiments
  `);

  // Products (exclude demo)
  const prodStats = await queryOne<{ launched: string }>(`
    SELECT COUNT(*) FILTER (WHERE is_demo = false AND publishing_status = 'published') as launched
    FROM products
  `);

  // Business - real revenue only (exclude demo sales)
  const bizStats = await queryOne<{
    revenue: string;
    conversions: string;
  }>(`
    SELECT
      COALESCE(SUM(amount_inr) FILTER (WHERE is_demo = false), 0) as revenue,
      COUNT(*) FILTER (WHERE is_demo = false) as conversions
    FROM sales
  `);

  // Approvals
  const approvalStats = await queryOne<{ pending: string }>(`
    SELECT COUNT(*) FILTER (WHERE status = 'PENDING') as pending
    FROM approvals
  `);

  // Automation
  const autoStats = await queryOne<{
    connected: string;
    running: string;
    failed: string;
  }>(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'enabled' OR status = 'running') as connected,
      COUNT(*) FILTER (WHERE status = 'running') as running,
      COUNT(*) FILTER (WHERE status = 'failed') as failed
    FROM automation_workflows
  `);

  return {
    opportunities: {
      total: parseInt(oppStats?.total ?? "0", 10),
      validated: parseInt(oppStats?.validated ?? "0", 10),
      testing: parseInt(oppStats?.testing ?? "0", 10),
      winners: parseInt(oppStats?.winners ?? "0", 10),
    },
    experiments: {
      active: parseInt(expStats?.active ?? "0", 10),
      completed: parseInt(expStats?.completed ?? "0", 10),
      failed: parseInt(expStats?.failed ?? "0", 10),
    },
    products: {
      launched: parseInt(prodStats?.launched ?? "0", 10),
    },
    business: {
      traffic: 0, // No traffic tracking integration yet
      conversions: parseInt(bizStats?.conversions ?? "0", 10),
      revenue: parseFloat(bizStats?.revenue ?? "0"),
    },
    approvals: {
      pending: parseInt(approvalStats?.pending ?? "0", 10),
    },
    automation: {
      connected: parseInt(autoStats?.connected ?? "0", 10),
      running: parseInt(autoStats?.running ?? "0", 10),
      failed: parseInt(autoStats?.failed ?? "0", 10),
    },
  };
}
