import { queryMany } from "@/database/client";
import { intelligenceRepo } from "@/database/repositories/intelligence-repo";
import type { BusinessForecast, ForecastType, IntelligenceConfidence } from "@/types/intelligence";
import type { ForecastResult } from "./types";

export class BusinessForecastingEngine {
  /**
   * Deterministic linear extrapolation or moving average forecast
   */
  computeDeterministicForecast(
    forecastType: ForecastType,
    targetMetric: string,
    history: number[],
    dataWindowDays: number = 30
  ): ForecastResult {
    const nonZeroCount = history.filter((v) => v > 0).length;

    // Truthful rule: If insufficient history or purely zero data points, do not fake a projection
    if (history.length < 3 || nonZeroCount === 0) {
      return {
        forecast_type: forecastType,
        target_metric: targetMetric,
        historical_values: history,
        forecast_value: null,
        projected_change_percent: null,
        confidence: "INSUFFICIENT_DATA",
        data_window_days: dataWindowDays,
        assumptions: [
          "Insufficient historical variation to establish a statistically reliable trend.",
          "Projection requires at least 3 distinct active observational intervals.",
        ],
        has_sufficient_data: false,
      };
    }

    // Simple deterministic linear slope: (y_n - y_0) / (n - 1)
    const n = history.length;
    const y0 = history[0] ?? 0;
    const yn = history[n - 1] ?? 0;
    const slope = (yn - y0) / (n - 1);

    // Projected next period value
    const projectedVal = Math.max(0, Math.round((yn + slope) * 100) / 100);
    const changePct = yn !== 0 ? Math.round(((projectedVal - yn) / yn) * 1000) / 10 : 0;

    const confidence: IntelligenceConfidence = n >= 10 && nonZeroCount >= 7 ? "HIGH" : "MEDIUM";

    return {
      forecast_type: forecastType,
      target_metric: targetMetric,
      historical_values: history,
      forecast_value: projectedVal,
      projected_change_percent: changePct,
      confidence,
      data_window_days: dataWindowDays,
      assumptions: [
        `Deterministic linear continuation based on ${n} observation periods over ${dataWindowDays} days.`,
        "Assumes ₹0 paid acquisition spend remains constant.",
        "Assumes organic conversion rates remain within standard deviation.",
      ],
      has_sufficient_data: true,
    };

  }

  /**
   * Generate standard suite of business forecasts across Revenue, Customers, and Traffic
   */
  async generateForecasts(isDemo: boolean = false): Promise<BusinessForecast[]> {
    const results: BusinessForecast[] = [];

    // 1. Revenue Forecast (Past 4 weekly buckets)
    const revRows = await queryMany<any>(
      `SELECT 
         DATE_TRUNC('week', created_at) as week_date,
         COALESCE(SUM(amount_paid_inr), 0) as weekly_revenue
       FROM orders
       WHERE payment_status = 'PAID' AND is_demo = $1
       GROUP BY DATE_TRUNC('week', created_at)
       ORDER BY week_date ASC`,
      [isDemo]
    );
    const revHistory = revRows.map((r) => Number(r.weekly_revenue) || 0);
    const revForecast = this.computeDeterministicForecast("REVENUE_TREND", "NET_REVENUE_INR", revHistory, 30);

    const revRecord: BusinessForecast = {
      id: crypto.randomUUID(),
      forecast_type: "REVENUE_TREND",
      target_metric: "NET_REVENUE_INR",
      forecast_value: revForecast.forecast_value,
      projected_change_percent: revForecast.projected_change_percent,
      confidence: revForecast.confidence,
      data_window_days: revForecast.data_window_days,
      assumptions: revForecast.assumptions,
      has_sufficient_data: revForecast.has_sufficient_data,
      is_demo: isDemo,
      created_at: new Date().toISOString(),
    };
    await intelligenceRepo.saveForecast(revRecord);
    results.push(revRecord);

    // 2. Customer Growth Forecast
    const custRows = await queryMany<any>(
      `SELECT 
         DATE_TRUNC('week', created_at) as week_date,
         COUNT(id) as weekly_customers
       FROM customers
       WHERE is_demo = $1
       GROUP BY DATE_TRUNC('week', created_at)
       ORDER BY week_date ASC`,
      [isDemo]
    );
    const custHistory = custRows.map((r) => Number(r.weekly_customers) || 0);
    const custForecast = this.computeDeterministicForecast("CUSTOMER_TREND", "TOTAL_CUSTOMERS", custHistory, 30);

    const custRecord: BusinessForecast = {
      id: crypto.randomUUID(),
      forecast_type: "CUSTOMER_TREND",
      target_metric: "TOTAL_CUSTOMERS",
      forecast_value: custForecast.forecast_value,
      projected_change_percent: custForecast.projected_change_percent,
      confidence: custForecast.confidence,
      data_window_days: custForecast.data_window_days,
      assumptions: custForecast.assumptions,
      has_sufficient_data: custForecast.has_sufficient_data,
      is_demo: isDemo,
      created_at: new Date().toISOString(),
    };
    await intelligenceRepo.saveForecast(custRecord);
    results.push(custRecord);

    // 3. Traffic Trend
    const trafficRows = await queryMany<any>(
      `SELECT 
         DATE_TRUNC('week', timestamp) as week_date,
         COUNT(id) as weekly_traffic
       FROM telemetry_events
       WHERE event_type IN ('PAGE_VIEW', 'VISITOR_LANDED') AND is_demo = $1
       GROUP BY DATE_TRUNC('week', timestamp)
       ORDER BY week_date ASC`,
      [isDemo]
    );
    const trafficHistory = trafficRows.map((r) => Number(r.weekly_traffic) || 0);
    const trafficForecast = this.computeDeterministicForecast("TRAFFIC_TREND", "TOTAL_VISITORS", trafficHistory, 30);

    const trafficRecord: BusinessForecast = {
      id: crypto.randomUUID(),
      forecast_type: "TRAFFIC_TREND",
      target_metric: "TOTAL_VISITORS",
      forecast_value: trafficForecast.forecast_value,
      projected_change_percent: trafficForecast.projected_change_percent,
      confidence: trafficForecast.confidence,
      data_window_days: trafficForecast.data_window_days,
      assumptions: trafficForecast.assumptions,
      has_sufficient_data: trafficForecast.has_sufficient_data,
      is_demo: isDemo,
      created_at: new Date().toISOString(),
    };
    await intelligenceRepo.saveForecast(trafficRecord);
    results.push(trafficRecord);

    return results;
  }
}

export const businessForecastingEngine = new BusinessForecastingEngine();
