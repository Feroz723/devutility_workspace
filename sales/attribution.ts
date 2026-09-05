import {
  createSalesAttribution,
  listSalesAttributions,
} from "@/database/repositories/sales-repo";
import { SalesAttribution } from "@/types/sales";

export interface RecordAttributionInput {
  orderId: string;
  customerId: string;
  channelId?: string | null;
  campaignId?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  referrerUrl?: string | null;
  landingPageUrl?: string | null;
  revenueAttributedCents: number;
}

export class SalesAttributionEngine {
  /**
   * Records marketing and acquisition attribution for a completed sale.
   */
  static async attributeSale(input: RecordAttributionInput): Promise<SalesAttribution> {
    return createSalesAttribution({
      order_id: input.orderId,
      customer_id: input.customerId,
      channel_id: input.channelId ?? null,
      campaign_id: input.campaignId ?? null,
      utm_source: input.utmSource ?? "direct",
      utm_medium: input.utmMedium ?? "organic",
      utm_campaign: input.utmCampaign ?? null,
      utm_term: input.utmTerm ?? null,
      utm_content: input.utmContent ?? null,
      referrer_url: input.referrerUrl ?? null,
      landing_page_url: input.landingPageUrl ?? null,
      touchpoint_type: "LAST_TOUCH",
      revenue_attributed_cents: input.revenueAttributedCents,
    });
  }

  /**
   * Aggregates revenue and sales counts by acquisition source.
   */
  static async getSourceBreakdown(): Promise<Array<{ source: string; ordersCount: number; revenueCents: number }>> {
    const attributions = await listSalesAttributions({ limit: 500 });
    const map = new Map<string, { ordersCount: number; revenueCents: number }>();

    for (const a of attributions) {
      const src = a.utm_source || "direct";
      const current = map.get(src) || { ordersCount: 0, revenueCents: 0 };
      current.ordersCount += 1;
      current.revenueCents += a.revenue_attributed_cents || 0;
      map.set(src, current);
    }

    return Array.from(map.entries()).map(([source, data]) => ({
      source,
      ordersCount: data.ordersCount,
      revenueCents: data.revenueCents,
    }));
  }
}
