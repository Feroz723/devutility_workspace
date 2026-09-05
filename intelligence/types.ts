import type {
  BusinessSnapshot,
  BusinessMetric,
  UnitEconomics,
  ProductPerformance,
  ChannelPerformance,
  OfferPerformance,
  CustomerCohort,
  PortfolioDecision,
  DecisionRecommendation,
  DecisionEvidence,
  BusinessForecast,
  ResourceAllocation,
  BusinessGoal,
  BusinessRisk,
  BusinessLearning,
  ProductPerformanceTier,
  ChannelPerformanceTier,
  OfferPerformanceTier,
  PortfolioDecisionType,
  DecisionStatus,
  IntelligenceConfidence,
  CostStatus,
} from "@/types/intelligence";

export type {
  BusinessSnapshot,
  BusinessMetric,
  UnitEconomics,
  ProductPerformance,
  ChannelPerformance,
  OfferPerformance,
  CustomerCohort,
  PortfolioDecision,
  DecisionRecommendation,
  DecisionEvidence,
  BusinessForecast,
  ResourceAllocation,
  BusinessGoal,
  BusinessRisk,
  BusinessLearning,
  ProductPerformanceTier,
  ChannelPerformanceTier,
  OfferPerformanceTier,
  PortfolioDecisionType,
  DecisionStatus,
  IntelligenceConfidence,
  CostStatus,
};



export interface SnapshotAggregationResult {
  snapshot: BusinessSnapshot;
  metrics_count: number;
  timestamp: string;
}

export interface FunnelMetricsResult {
  visitors: number;
  leads: number;
  signups: number;
  checkouts: number;
  paid_orders: number;
  lead_conversion_percent: number | null;
  checkout_conversion_percent: number | null;
  payment_conversion_percent: number | null;
  refund_rate_percent: number | null;
  gross_revenue_inr: number;
  net_revenue_inr: number;
  average_order_value_inr: number | null;
  revenue_per_visitor_inr: number | null;
  revenue_per_customer_inr: number | null;
  has_sufficient_data: boolean;
}

export interface UnitEconomicsResult {
  revenue_inr: number;
  cost_inr: number;
  cost_status: CostStatus;
  gross_margin_percent: number | null;
  customer_acquisition_cost_inr: number | null;
  customer_lifetime_value_inr: number | null;
  payback_period_days: number | null;
  revenue_per_user_inr: number | null;
  confidence: IntelligenceConfidence;
  has_sufficient_data: boolean;
}

export interface ProductImprovementProposal {
  product_id: string;
  problem_summary: string;
  evidence: string[];
  affected_customers_count: number;
  expected_benefit: string;
  complexity: "LOW" | "MEDIUM" | "HIGH";
  risk: "LOW" | "MEDIUM" | "HIGH";
  cost_inr: number; // 0 for internal code improvement
  requires_approval: boolean;
  status: "REQUIRES_REVIEW";
}

export interface PortfolioRankingItem {
  id: string;
  name: string;
  type: "OPPORTUNITY" | "EXPERIMENT" | "PRODUCT" | "CAMPAIGN" | "OFFER";
  priority_score: number; // 0 to 100
  evidence_strength: IntelligenceConfidence;
  revenue_inr: number;
  users_count: number;
  status: string;
  recommended_action: PortfolioDecisionType;
  rationale: string;
}

export interface ForecastResult {
  forecast_type: string;
  target_metric: string;
  historical_values: number[];
  forecast_value: number | null;
  projected_change_percent: number | null;
  confidence: IntelligenceConfidence;
  data_window_days: number;
  assumptions: string[];
  has_sufficient_data: boolean;
}

export interface DecisionEvaluationResult {
  decision: PortfolioDecision;
  recommendations: DecisionRecommendation[];
  evidence: DecisionEvidence[];
}
