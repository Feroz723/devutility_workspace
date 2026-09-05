import { queryMany } from "@/database/client";
import type { PortfolioRankingItem, PortfolioDecisionType, IntelligenceConfidence } from "./types";

export class PortfolioRankingEngine {
  /**
   * Rank all portfolio assets across opportunities, experiments, products, campaigns, offers
   */
  async rankPortfolio(isDemo: boolean = false): Promise<PortfolioRankingItem[]> {
    const items: PortfolioRankingItem[] = [];

    // 1. Rank Products
    const products = await queryMany<any>(
      `SELECT 
         p.id, p.name, p.status,
         COALESCE(pp.performance_tier, 'INSUFFICIENT_DATA') as performance_tier,
         COALESCE(pp.revenue_inr, 0) as revenue_inr,
         COALESCE(pp.customers_count, 0) as customers_count,
         COALESCE(pp.activation_rate_percent, 0) as activation_rate,
         COALESCE(pp.churn_rate_percent, 0) as churn_rate,
         COALESCE(pp.support_burden_score, 0) as support_burden
       FROM products p
       LEFT JOIN product_performance pp ON pp.product_id = p.id AND pp.is_demo = $1
       WHERE p.is_demo = $1`,
      [isDemo]
    );

    for (const p of products) {
      let priorityScore = 50;
      let recommendedAction: PortfolioDecisionType = "MAINTAIN";
      let confidence: IntelligenceConfidence = "LOW";
      let rationale = "";

      const rev = Number(p.revenue_inr) || 0;
      const cust = Number(p.customers_count) || 0;
      const tier = p.performance_tier;

      if (tier === "WINNER") {
        priorityScore = 95;
        recommendedAction = "SCALE";
        confidence = "HIGH";
        rationale = "High revenue and retention with strong customer outcomes. Prioritize for scaling.";
      } else if (tier === "PROMISING") {
        priorityScore = 80;
        recommendedAction = "ITERATE";
        confidence = "MEDIUM";
        rationale = "Healthy conversion and engagement signals; targeted iteration can unlock scale.";
      } else if (tier === "STOP_CANDIDATE") {
        priorityScore = 20;
        recommendedAction = "PAUSE";
        confidence = "HIGH";
        rationale = "Consistently poor retention, excessive support burden or zero conversion over multiple cycles.";
      } else if (tier === "WEAK") {
        priorityScore = 35;
        recommendedAction = "ITERATE";
        confidence = "MEDIUM";
        rationale = "Underperforming baseline targets. Needs one focused iteration before reassessing.";
      } else if (tier === "INSUFFICIENT_DATA") {
        priorityScore = 45;
        recommendedAction = "RESEARCH_MORE";
        confidence = "INSUFFICIENT_DATA";
        rationale = "Insufficient live telemetry to make a definitive scale or stop determination.";
      } else {
        priorityScore = 60;
        recommendedAction = "CONTINUE";
        confidence = "MEDIUM";
        rationale = "Stable operations with steady baseline metrics.";
      }

      items.push({
        id: p.id,
        name: p.name,
        type: "PRODUCT",
        priority_score: priorityScore,
        evidence_strength: confidence,
        revenue_inr: rev,
        users_count: cust,
        status: p.status || "ACTIVE",
        recommended_action: recommendedAction,
        rationale,
      });
    }

    // 2. Rank Campaigns (Phase 7)
    const campaigns = await queryMany<any>(
      `SELECT 
         c.id, c.campaign_name, c.channel, c.status,
         COALESCE(cp.performance_tier, 'INSUFFICIENT_DATA') as performance_tier,
         COALESCE(cp.revenue_inr, 0) as revenue_inr,
         COALESCE(cp.qualified_leads_count, 0) as qualified_leads,
         COALESCE(cp.conversion_rate_percent, 0) as conversion_rate
       FROM campaigns c
       LEFT JOIN channel_performance cp ON cp.campaign_id = c.id AND cp.is_demo = $1
       WHERE c.is_demo = $1`,
      [isDemo]
    );

    for (const c of campaigns) {
      let score = 50;
      let rec: PortfolioDecisionType = "MAINTAIN";
      let conf: IntelligenceConfidence = "LOW";
      let rationale = "";

      const tier = c.performance_tier;
      if (tier === "SCALE") {
        score = 90;
        rec = "SCALE";
        conf = "HIGH";
        rationale = "Strong qualified lead flow and positive customer conversions. Recommend expanding channel content.";
      } else if (tier === "ITERATE") {
        score = 65;
        rec = "ITERATE";
        conf = "MEDIUM";
        rationale = "Generating clicks and initial interest, but qualified lead conversion requires messaging refinement.";
      } else if (tier === "PAUSE" || tier === "STOP") {
        score = 25;
        rec = "PAUSE";
        conf = "HIGH";
        rationale = "High effort with zero verified leads or orders over active period.";
      } else {
        score = 40;
        rec = "RESEARCH_MORE";
        conf = "INSUFFICIENT_DATA";
        rationale = "Channel requires more baseline distribution cycles to verify audience response.";
      }

      items.push({
        id: c.id,
        name: `${c.channel}: ${c.campaign_name}`,
        type: "CAMPAIGN",
        priority_score: score,
        evidence_strength: conf,
        revenue_inr: Number(c.revenue_inr) || 0,
        users_count: Number(c.qualified_leads) || 0,
        status: c.status || "ACTIVE",
        recommended_action: rec,
        rationale,
      });
    }

    // 3. Rank Experiments (Phase 4)
    const experiments = await queryMany<any>(
      `SELECT id, name, status, hypothesis, target_metric
       FROM experiments
       WHERE is_demo = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [isDemo]
    );

    for (const exp of experiments) {
      let score = 50;
      let rec: PortfolioDecisionType = "CONTINUE";
      let conf: IntelligenceConfidence = "MEDIUM";
      let rationale = `Hypothesis: ${exp.hypothesis || "Standard validation"}`;

      if (exp.status === "COMPLETED") {
        score = 70;
        rec = "ITERATE";
        rationale = "Experiment completed. Review outcomes to incorporate into product roadmap.";
      } else if (exp.status === "FAILED") {
        score = 30;
        rec = "ARCHIVE";
        rationale = "Experiment hypothesis rejected. Learnings documented in knowledge base.";
      } else if (exp.status === "RUNNING") {
        score = 75;
        rec = "CONTINUE";
        rationale = "Active test in progress; continue collecting sample observations.";
      }

      items.push({
        id: exp.id,
        name: exp.name,
        type: "EXPERIMENT",
        priority_score: score,
        evidence_strength: conf,
        revenue_inr: 0,
        users_count: 0,
        status: exp.status || "DRAFT",
        recommended_action: rec,
        rationale,
      });
    }

    // 4. Rank Opportunities (Phase 3)
    const opportunities = await queryMany<any>(
      `SELECT id, title, status, score, demand_strength
       FROM opportunities
       WHERE is_demo = $1
       ORDER BY score DESC NULLS LAST
       LIMIT 10`,
      [isDemo]
    );

    for (const opp of opportunities) {
      const oppScore = Number(opp.score) || 50;
      let rec: PortfolioDecisionType = "BUILD";
      if (oppScore >= 75) {
        rec = "BUILD";
      } else if (oppScore >= 50) {
        rec = "RESEARCH_MORE";
      } else {
        rec = "ARCHIVE";
      }

      items.push({
        id: opp.id,
        name: opp.title,
        type: "OPPORTUNITY",
        priority_score: oppScore,
        evidence_strength: oppScore >= 70 ? "HIGH" : "MEDIUM",
        revenue_inr: 0,
        users_count: 0,
        status: opp.status || "IDENTIFIED",
        recommended_action: rec,
        rationale: `Market demand strength: ${opp.demand_strength || "Moderate"}. Validation score: ${oppScore}/100.`,
      });
    }

    // Sort descending by priority score
    items.sort((a, b) => b.priority_score - a.priority_score);

    return items;
  }
}

export const portfolioRankingEngine = new PortfolioRankingEngine();
