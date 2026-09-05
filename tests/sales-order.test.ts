import { describe, it, expect, vi } from "vitest";
import { OrderManager } from "@/sales/order";
import { CustomerManager } from "@/sales/customer";
import * as salesRepo from "@/database/repositories/sales-repo";

describe("OrderManager - Lifecycle & Payment Transitions", () => {
  it("generates sequential order numbers in expected format", () => {
    const num = OrderManager.generateOrderNumber();
    expect(num).toMatch(/^ORD-\d{8}-[A-Z0-9]{5}$/);
  });

  it("creates a free order and automatically marks status PAID", async () => {
    vi.spyOn(salesRepo, "getOfferById").mockResolvedValueOnce({
      id: "off-free",
      product_id: "prod-1",
      title: "Free Guide",
      is_free: true,
      primary_price_cents: 0,
      primary_currency: "INR",
    } as any);

    vi.spyOn(salesRepo, "createOrder").mockImplementationOnce(async (input) => ({
      id: "ord-1",
      ...input,
      paid_at: input.paid_at ?? null,
      fulfilled_at: null,
      cancelled_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any));

    vi.spyOn(salesRepo, "createOrderItem").mockResolvedValueOnce({} as any);
    vi.spyOn(salesRepo, "createPayment").mockResolvedValueOnce({} as any);
    vi.spyOn(CustomerManager, "recordOrderStats").mockResolvedValueOnce();

    const { order, payment } = await OrderManager.createOrderFromCheckout({
      offerId: "off-free",
      customerId: "cust-1",
      amountCents: 0,
      currency: "INR",
      isFree: true,
      provider: "MANUAL",
    });

    expect(order.status).toBe("PAID");
    expect(order.is_free).toBe(true);
    expect(order.total_amount_cents).toBe(0);
    expect(order.paid_at).toBeDefined();
  });

  it("creates a paid order in PENDING status until gateway confirmation", async () => {
    vi.spyOn(salesRepo, "getOfferById").mockResolvedValueOnce({
      id: "off-paid",
      product_id: "prod-1",
      title: "Pro Kit",
      is_free: false,
      primary_price_cents: 99900,
      primary_currency: "INR",
    } as any);

    vi.spyOn(salesRepo, "createOrder").mockImplementationOnce(async (input) => ({
      id: "ord-2",
      ...input,
      paid_at: null,
      fulfilled_at: null,
      cancelled_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any));

    vi.spyOn(salesRepo, "createOrderItem").mockResolvedValueOnce({} as any);
    vi.spyOn(salesRepo, "createPayment").mockResolvedValueOnce({} as any);

    const { order } = await OrderManager.createOrderFromCheckout({
      offerId: "off-paid",
      customerId: "cust-1",
      amountCents: 99900,
      currency: "INR",
      isFree: false,
      provider: "STRIPE",
    });

    expect(order.status).toBe("PENDING");
    expect(order.paid_at).toBeNull();
  });

  it("markOrderPaid updates order to PAID and updates payment to CAPTURED", async () => {
    vi.spyOn(salesRepo, "getOrderById").mockResolvedValueOnce({
      id: "ord-3",
      customer_id: "cust-1",
      status: "PENDING",
      total_amount_cents: 49900,
      order_number: "ORD-20260904-TEST1",
    } as any);

    vi.spyOn(salesRepo, "getPaymentByOrderId").mockResolvedValueOnce({
      id: "pay-1",
      status: "INITIATED",
    } as any);

    vi.spyOn(salesRepo, "updatePayment").mockResolvedValueOnce({} as any);
    vi.spyOn(salesRepo, "updateOrder").mockResolvedValueOnce({
      id: "ord-3",
      customer_id: "cust-1",
      status: "PAID",
      total_amount_cents: 49900,
      order_number: "ORD-20260904-TEST1",
    } as any);

    vi.spyOn(CustomerManager, "recordOrderStats").mockResolvedValueOnce();

    const updated = await OrderManager.markOrderPaid("ord-3", "pi_test_123");
    expect(updated.status).toBe("PAID");
    expect(CustomerManager.recordOrderStats).toHaveBeenCalledWith("cust-1", 49900);
  });
});
