import { describe, it, expect, vi } from "vitest";
import { DeliveryEngine } from "@/sales/delivery";
import { EntitlementEngine } from "@/sales/entitlements";
import { SalesEmailService } from "@/sales/email";
import * as salesRepo from "@/database/repositories/sales-repo";
import * as productRepo from "@/database/repositories/product-repo";

describe("DeliveryEngine - Digital Fulfillment & Artifact Packaging", () => {
  it("blocks fulfillment if paid order is not CAPTURED", async () => {
    vi.spyOn(salesRepo, "getOrderById").mockResolvedValueOnce({
      id: "ord-unpaid",
      customer_id: "cust-1",
      offer_id: "off-1",
      product_id: "prod-1",
      is_free: false,
      total_amount_cents: 99900,
      status: "PENDING",
    } as any);

    vi.spyOn(salesRepo, "getCustomerById").mockResolvedValueOnce({ id: "cust-1", email: "user@example.com" } as any);
    vi.spyOn(salesRepo, "getOfferById").mockResolvedValueOnce({ id: "off-1", title: "Pro Tool" } as any);
    vi.spyOn(productRepo, "getProductById").mockResolvedValueOnce({ id: "prod-1", name: "Pro Tool" } as any);
    vi.spyOn(salesRepo, "getPaymentByOrderId").mockResolvedValueOnce({ id: "pay-1", status: "INITIATED" } as any);

    await expect(DeliveryEngine.fulfillOrder("ord-unpaid")).rejects.toThrow("Order fulfillment blocked by SalesGuard");
  });

  it("fulfills free order, links artifacts, and completes delivery", async () => {
    vi.spyOn(salesRepo, "getOrderById").mockResolvedValueOnce({
      id: "ord-free",
      order_number: "ORD-20260904-FREE1",
      customer_id: "cust-1",
      offer_id: "off-free",
      product_id: "prod-1",
      is_free: true,
      total_amount_cents: 0,
      status: "PAID",
    } as any);

    vi.spyOn(salesRepo, "getCustomerById").mockResolvedValueOnce({ id: "cust-1", email: "user@example.com" } as any);
    vi.spyOn(salesRepo, "getOfferById").mockResolvedValueOnce({ id: "off-free", title: "Free Tool" } as any);
    vi.spyOn(productRepo, "getProductById").mockResolvedValueOnce({ id: "prod-1", name: "Free Tool" } as any);
    vi.spyOn(salesRepo, "getPaymentByOrderId").mockResolvedValueOnce(null);

    vi.spyOn(EntitlementEngine, "grantEntitlement").mockResolvedValueOnce({
      id: "ent-1",
      token: "tok_test_123",
      access_url: "/customer/access?token=tok_test_123",
    } as any);

    vi.spyOn(salesRepo, "createDelivery").mockResolvedValueOnce({ id: "del-1" } as any);
    vi.spyOn(productRepo, "listProductArtifacts").mockResolvedValueOnce([
      { id: "art-1", product_id: "prod-1", artifact_type: "SOURCE_CODE", file_path: "src/main.ts", size_bytes: 1024 } as any,
    ]);
    vi.spyOn(salesRepo, "createDeliveryItem").mockResolvedValueOnce({} as any);
    vi.spyOn(SalesEmailService, "sendDeliveryEmail").mockResolvedValueOnce({ sent: true, messageId: "msg-1" });
    vi.spyOn(salesRepo, "updateDelivery").mockResolvedValueOnce({} as any);
    vi.spyOn(salesRepo, "updateOrder").mockResolvedValueOnce({} as any);

    const result = await DeliveryEngine.fulfillOrder("ord-free");
    expect(result.status).toBe("DELIVERED");
    expect(result.itemsCount).toBe(1);
    expect(result.emailSent).toBe(true);
    expect(result.accessLink).toBeDefined();
  });
});
