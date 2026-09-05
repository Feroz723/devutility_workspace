import { describe, it, expect, vi } from "vitest";
import { RefundManager } from "@/sales/refunds";
import { EntitlementEngine } from "@/sales/entitlements";
import * as salesRepo from "@/database/repositories/sales-repo";

describe("RefundManager - State Machine & Entitlement Revocation", () => {
  it("rejects refund for an unpaid or pending order", async () => {
    vi.spyOn(salesRepo, "getOrderById").mockResolvedValueOnce({
      id: "ord-pending",
      status: "PENDING",
      total_amount_cents: 49900,
    } as any);

    await expect(
      RefundManager.processRefund({ orderId: "ord-pending" })
    ).rejects.toThrow("Cannot refund order with status: PENDING");
  });

  it("rejects refund if amount exceeds total order amount", async () => {
    vi.spyOn(salesRepo, "getOrderById").mockResolvedValueOnce({
      id: "ord-paid",
      status: "PAID",
      total_amount_cents: 49900,
    } as any);

    await expect(
      RefundManager.processRefund({ orderId: "ord-paid", amountCents: 60000 })
    ).rejects.toThrow("Refund amount cannot exceed total order amount");
  });

  it("processes refund, revokes entitlement, and marks order REFUNDED", async () => {
    vi.spyOn(salesRepo, "getOrderById").mockResolvedValueOnce({
      id: "ord-paid",
      order_number: "ORD-20260904-TEST",
      status: "PAID",
      total_amount_cents: 49900,
      currency: "INR",
      customer_id: "cust-1",
      product_id: "prod-1",
      is_demo: false,
    } as any);

    vi.spyOn(salesRepo, "getPaymentByOrderId").mockResolvedValueOnce({ id: "pay-1" } as any);
    vi.spyOn(salesRepo, "createRefund").mockImplementationOnce(async (input) => ({
      id: "ref-1",
      ...input,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any));

    vi.spyOn(salesRepo, "getCustomerEntitlements").mockResolvedValueOnce([
      { id: "ent-1", order_id: "ord-paid", status: "ACTIVE" } as any,
    ]);

    vi.spyOn(EntitlementEngine, "revokeEntitlement").mockResolvedValueOnce({} as any);
    vi.spyOn(salesRepo, "updateOrder").mockResolvedValueOnce({} as any);

    const refund = await RefundManager.processRefund({
      orderId: "ord-paid",
      amountCents: 49900,
      reason: "Requested by customer",
    });

    expect(refund.status).toBe("PROCESSED");
    expect(refund.amount_cents).toBe(49900);
    expect(EntitlementEngine.revokeEntitlement).toHaveBeenCalledWith("ent-1", expect.stringContaining("refunded"));
    expect(salesRepo.updateOrder).toHaveBeenCalledWith("ord-paid", { status: "REFUNDED" });
  });
});
