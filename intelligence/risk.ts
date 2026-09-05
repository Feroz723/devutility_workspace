import { queryMany } from "@/database/client";
import { intelligenceRepo } from "@/database/repositories/intelligence-repo";
import type { BusinessRisk } from "@/types/intelligence";

export class BusinessRiskDetector {
  /**
   * Scan operational and commercial indicators to detect business risks
   */
  async detectRisks(isDemo: boolean = false): Promise<BusinessRisk[]> {
    const detectedRisks: BusinessRisk[] = [];

    // 1. Check Unconnected Critical Integrations
    const adapters = await queryMany<any>(
      `SELECT provider_name, status, category
       FROM integration_adapters
       WHERE status = 'NOT_CONNECTED' AND is_demo = $1`,
      [isDemo]
    );

    for (const ad of adapters) {
      detectedRisks.push({
        id: crypto.randomUUID(),
        category: "DEPENDENCY_RISK",
        title: `Integration Not Connected: ${ad.provider_name}`,
        description: `Service adapter for ${ad.provider_name} (${ad.category}) is marked NOT_CONNECTED. Live external transactions and alerts cannot execute until credentials are provided.`,
        severity: ad.category === "PAYMENT" ? "CRITICAL" : "MEDIUM",
        probability: "HIGH",
        evidence: `integration_adapters status = NOT_CONNECTED for ${ad.provider_name}`,
        mitigation: `Visit the Manual Setup Center to configure credentials and test connection.`,
        owner: "operator",
        status: "OPEN",
        is_demo: isDemo,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // 2. High Support Ticket Volume
    const openTickets = await queryMany<any>(
      `SELECT COUNT(id) as count
       FROM support_tickets
       WHERE status IN ('OPEN', 'IN_PROGRESS') AND is_demo = $1`,
      [isDemo]
    );
    const ticketCount = Number(openTickets[0]?.count) || 0;
    if (ticketCount >= 5) {
      detectedRisks.push({
        id: crypto.randomUUID(),
        category: "CUSTOMER_RISK",
        title: "Support Ticket Backlog",
        description: `There are ${ticketCount} open support tickets pending resolution, which could degrade customer satisfaction and increase churn.`,
        severity: ticketCount > 10 ? "HIGH" : "MEDIUM",
        probability: "HIGH",
        evidence: `${ticketCount} tickets in OPEN / IN_PROGRESS status`,
        mitigation: "Prioritize support queue or trigger automated resolution workflows.",
        owner: "customer-success",
        status: "OPEN",
        is_demo: isDemo,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // 3. High Churn Alert
    const churnStats = await queryMany<any>(
      `SELECT 
         COUNT(id) as total_customers,
         COUNT(CASE WHEN retention_status = 'CHURNED' THEN 1 END) as churned_customers
       FROM customers
       WHERE is_demo = $1`,
      [isDemo]
    );
    const totalCust = Number(churnStats[0]?.total_customers) || 0;
    const churnCust = Number(churnStats[0]?.churned_customers) || 0;
    if (totalCust >= 5 && (churnCust / totalCust) >= 0.4) {
      const churnPct = Math.round((churnCust / totalCust) * 100);
      detectedRisks.push({
        id: crypto.randomUUID(),
        category: "RETENTION_RISK",
        title: "High Customer Churn Rate",
        description: `Observed churn rate is ${churnPct}% (${churnCust}/${totalCust} customers lost).`,
        severity: "HIGH",
        probability: "HIGH",
        evidence: `Customer table retention_status query indicates ${churnCust} churned users.`,
        mitigation: "Inspect product onboarding friction and deploy re-engagement retention campaign.",
        owner: "product",
        status: "OPEN",
        is_demo: isDemo,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // 4. Zero Distribution Traffic Risk
    const trafficRows = await queryMany<any>(
      `SELECT COUNT(id) as traffic_count
       FROM telemetry_events
       WHERE event_type IN ('PAGE_VIEW', 'VISITOR_LANDED') AND is_demo = $1`,
      [isDemo]
    );
    const trafficCount = Number(trafficRows[0]?.traffic_count) || 0;
    if (trafficCount === 0) {
      detectedRisks.push({
        id: crypto.randomUUID(),
        category: "DISTRIBUTION_RISK",
        title: "Zero Inbound Traffic Detected",
        description: "No visitor traffic has been recorded across any landing page or active campaign.",
        severity: "HIGH",
        probability: "HIGH",
        evidence: "telemetry_events table has 0 visitor records.",
        mitigation: "Execute scheduled organic distribution posts and verify content links.",
        owner: "distribution",
        status: "OPEN",
        is_demo: isDemo,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Persist newly detected risks
    for (const risk of detectedRisks) {
      await intelligenceRepo.saveRisk(risk);
    }

    return detectedRisks;
  }
}

export const businessRiskDetector = new BusinessRiskDetector();
