import { describe, it, expect, vi } from "vitest";
import { SalesAttributionEngine } from "@/sales/attribution";
import * as salesRepo from "@/database/repositories/sales-repo";

describe("SalesAttributionEngine - Phase 7 Marketing Attribution", () => {
  it("attributes a completed sale with UTM parameters", async () => {
    vi.spyOn(salesRepo, "createSalesAttribution").mockImplementationOnce(async (input) => ({
      id: "attr-1",
      ...input,
      created_at: new Date().toISOString(),
    } as any));

    const attr = await SalesAttributionEngine.attributeSale({
      orderId: "ord-1",
      customerId: "cust-1",
      utmSource: "twitter",
      utmMedium: "social",
      utmCampaign: "launch_promo",
      revenueAttributedCents: 49900,
    });

    expect(attr.utm_source).toBe("twitter");
    expect(attr.utm_medium).toBe("social");
    expect(attr.revenue_attributed_cents).toBe(49900);
  });

  it("aggregates source breakdown correctly across multiple channels", async () => {
    vi.spyOn(salesRepo, "listSalesAttributions").mockResolvedValueOnce([
      { id: "1", utm_source: "google", revenue_attributed_cents: 1000 } as any,
      { id: "2", utm_source: "google", revenue_attributed_cents: 2000 } as any,
      { id: "3", utm_source: "twitter", revenue_attributed_cents: 5000 } as any,
    ]);

    const breakdown = await SalesAttributionEngine.getSourceBreakdown();
    expect(breakdown.length).toBe(2);

    const google = breakdown.find((b) => b.source === "google");
    expect(google?.ordersCount).toBe(2);
    expect(google?.revenueCents).toBe(3000);

    const twitter = breakdown.find((b) => b.source === "twitter");
    expect(twitter?.ordersCount).toBe(1);
    expect(twitter?.revenueCents).toBe(5000);
  });
});
