import { describe, it, expect, vi } from "vitest";
import { CheckoutEngine } from "@/sales/checkout";
import * as salesRepo from "@/database/repositories/sales-repo";
import { CustomerManager } from "@/sales/customer";

describe("CheckoutEngine", () => {
  it("throws error if offer does not exist", async () => {
    vi.spyOn(salesRepo, "getOfferById").mockResolvedValueOnce(null);

    await expect(
      CheckoutEngine.initiateCheckout({ offerId: "non-existent" })
    ).rejects.toThrow("Offer not found");
  });

  it("throws error if offer is not ACTIVE", async () => {
    vi.spyOn(salesRepo, "getOfferById").mockResolvedValueOnce({
      id: "off-1",
      title: "Draft Offer",
      status: "DRAFT",
      product_id: "prod-1",
      primary_price_cents: 1000,
      primary_currency: "INR",
      is_free: false,
    } as any);

    await expect(
      CheckoutEngine.initiateCheckout({ offerId: "off-1" })
    ).rejects.toThrow("Offer is not active");
  });

  it("successfully initiates checkout for free offer using MANUAL provider", async () => {
    vi.spyOn(salesRepo, "getOfferById").mockResolvedValueOnce({
      id: "off-free",
      title: "Free Developer Tool",
      status: "ACTIVE",
      product_id: "prod-free",
      primary_price_cents: 0,
      primary_currency: "INR",
      is_free: true,
    } as any);

    vi.spyOn(CustomerManager, "getOrCreateCustomer").mockResolvedValueOnce({
      id: "cust-1",
      email: "test@example.com",
    } as any);

    vi.spyOn(salesRepo, "createCheckoutSession").mockResolvedValueOnce({
      id: "sess-1",
      offer_id: "off-free",
      customer_id: "cust-1",
      customer_email: "test@example.com",
      provider: "MANUAL",
      status: "PENDING",
      amount_cents: 0,
      currency: "INR",
      is_free: true,
    } as any);

    vi.spyOn(salesRepo, "updateCheckoutSession").mockResolvedValueOnce({} as any);

    const result = await CheckoutEngine.initiateCheckout({
      offerId: "off-free",
      customerEmail: "test@example.com",
    });

    expect(result.sessionId).toBe("sess-1");
    expect(result.isFree).toBe(true);
    expect(result.provider).toBe("MANUAL");
    expect(result.checkoutUrl).toContain("free-confirm");
  });
});
